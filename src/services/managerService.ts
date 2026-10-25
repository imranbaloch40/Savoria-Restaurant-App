import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  FoodItem,
  ManagerApplication,
  Order,
  Reservation,
  ReservationStatus,
  OrderStatus
} from '../types/restaurant';
import { INITIAL_FOOD_ITEMS } from '../data/seedData';

function subscribeToCollection<T>(
  collectionName: string,
  mapItem: (id: string, data: DocumentData) => T,
  onItems: (items: T[]) => void,
  onError: (error: Error) => void,
  ownerUid?: string
) {
  const ref = collection(db, collectionName);
  const target = ownerUid
    ? query(ref, where('userId', '==', ownerUid))
    : ref;

  return onSnapshot(
    target,
    snapshot => onItems(snapshot.docs.map(item => mapItem(item.id, item.data()))),
    error => onError(error)
  );
}

export function subscribeToOrders(
  onItems: (orders: Order[]) => void,
  onError: (error: Error) => void,
  ownerUid?: string
) {
  return subscribeToCollection(
    'orders',
    (id, data) => ({ ...data, id } as Order),
    onItems,
    onError,
    ownerUid
  );
}

export function subscribeToReservations(
  onItems: (reservations: Reservation[]) => void,
  onError: (error: Error) => void,
  ownerUid?: string
) {
  return subscribeToCollection(
    'reservations',
    (id, data) => ({ ...data, id } as Reservation),
    onItems,
    onError,
    ownerUid
  );
}

export function subscribeToMenu(
  onItems: (items: FoodItem[]) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    collection(db, 'foodItems'),
    snapshot => {
      onItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as FoodItem)));
    },
    onError
  );
}

export function subscribeToManagerApplications(
  onItems: (applications: ManagerApplication[]) => void,
  onError: (error: Error) => void
) {
  return subscribeToCollection(
    'managerApplications',
    (id, data) => ({ ...data, uid: id } as ManagerApplication),
    onItems,
    onError
  );
}

export function subscribeToOwnManagerApplication(
  uid: string,
  onApplication: (application: ManagerApplication | null) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    doc(db, 'managerApplications', uid),
    snapshot => onApplication(snapshot.exists()
      ? ({ ...snapshot.data(), uid: snapshot.id } as ManagerApplication)
      : null),
    onError
  );
}

export async function submitManagerApplication(data: {
  fullName: string;
  phoneNumber: string;
  restaurantDetails: string;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before applying for manager access.');
  const fullName = data.fullName.trim();
  const phoneNumber = data.phoneNumber.trim();
  if (!fullName || fullName.length > 100 || !/^\+?[\d\s().-]{7,30}$/.test(phoneNumber)) {
    throw new Error('Enter a valid full name and phone number.');
  }
  const applicationRef = doc(db, 'managerApplications', user.uid);
  const existingApplication = await getDoc(applicationRef);
  if (existingApplication.exists()) {
    const status = existingApplication.data().status;
    if (status === 'pending') {
      throw new Error('Your manager application is already pending administrator review.');
    }
    if (status === 'approved') {
      throw new Error('Your manager application was approved. Sign out and sign back in to refresh access.');
    }
    if (status !== 'rejected') {
      throw new Error('An existing manager application needs administrator review before it can be changed.');
    }
  }

  await setDoc(applicationRef, {
    uid: user.uid,
    fullName,
    email: user.email || '',
    phoneNumber,
    restaurantDetails: data.restaurantDetails.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  });
}

export async function reviewManagerApplication(uid: string, decision: 'approved' | 'rejected') {
  const admin = auth.currentUser;
  if (!admin) throw new Error('Sign in before reviewing manager applications.');
  const applicationRef = doc(db, 'managerApplications', uid);
  const roleRef = doc(db, 'managerRoles', uid);
  const reviewedAt = new Date().toISOString();

  await runTransaction(db, async transaction => {
    const application = await transaction.get(applicationRef);
    if (!application.exists() || application.data().status !== 'pending') {
      throw new Error('This manager application is no longer pending.');
    }

    transaction.update(applicationRef, {
      status: decision,
      reviewedAt,
      reviewedBy: admin.uid
    });
    if (decision === 'approved') {
      transaction.set(roleRef, {
        role: 'manager',
        grantedAt: reviewedAt,
        grantedBy: admin.uid
      });
    }
  });
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const manager = auth.currentUser;
  if (!manager) throw new Error('Sign in before updating order status.');
  const changedAt = new Date().toISOString();
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: changedAt,
    statusHistory: arrayUnion({
      status,
      changedAt,
      changedBy: manager.uid
    })
  });
}

export async function updateReservation(
  reservationId: string,
  data: { status: ReservationStatus }
) {
  const manager = auth.currentUser;
  if (!manager) throw new Error('Sign in before updating reservation status.');
  const changedAt = new Date().toISOString();
  await updateDoc(doc(db, 'reservations', reservationId), {
    status: data.status,
    updatedAt: changedAt,
    updatedBy: manager.uid,
    statusHistory: arrayUnion({
      status: data.status,
      changedAt,
      changedBy: manager.uid
    })
  });
}

export async function saveMenuItem(item: FoodItem) {
  await initializeMenuIfNeeded();
  await setDoc(doc(db, 'foodItems', item.id), item);
}

export async function removeMenuItem(itemId: string) {
  await initializeMenuIfNeeded();
  await deleteDoc(doc(db, 'foodItems', itemId));
}

async function initializeMenuIfNeeded() {
  const [items, marker] = await Promise.all([
    getDocs(collection(db, 'foodItems')),
    getDoc(doc(db, 'menuSettings', 'default'))
  ]);
  if (marker.exists() && marker.data().initialized === true) return;
  if (items.empty) {
    for (const item of INITIAL_FOOD_ITEMS) {
      await setDoc(doc(db, 'foodItems', item.id), item);
    }
  }
  await setDoc(doc(db, 'menuSettings', 'default'), {
    initialized: true,
    updatedAt: new Date().toISOString()
  });
}
