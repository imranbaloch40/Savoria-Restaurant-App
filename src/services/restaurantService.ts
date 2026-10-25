import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  getDoc,
  query, 
  where 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import { FoodItem, Reservation, Order } from '../types/restaurant';
import { INITIAL_FOOD_ITEMS } from '../data/seedData';

// Fetch Food Items: tries Firestore first, falls back to rich initial data
export async function getFoodItems(): Promise<{ items: FoodItem[]; source: 'firestore' | 'local' }> {
  try {
    const querySnapshot = await getDocs(collection(db, 'foodItems'));
    if (!querySnapshot.empty) {
      const items: FoodItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id } as FoodItem);
      });
      return { items, source: 'firestore' };
    }
    const menuState = await getDoc(doc(db, 'menuSettings', 'default'));
    if (menuState.exists() && menuState.data().initialized === true) {
      return { items: [], source: 'firestore' };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'foodItems');
  }
  // Return curated fallback items
  return { items: INITIAL_FOOD_ITEMS, source: 'local' };
}

// Seed all initial food items to user's Firestore database
export async function seedMenuToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    for (const item of INITIAL_FOOD_ITEMS) {
      const itemRef = doc(db, 'foodItems', item.id);
      await setDoc(itemRef, item);
      count++;
    }
    await setDoc(doc(db, 'menuSettings', 'default'), {
      initialized: true,
      updatedAt: new Date().toISOString()
    });
    return { success: true, count };
  } catch (error: unknown) {
    handleFirestoreError(error, OperationType.WRITE, 'foodItems');
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Permission denied. Ensure your firestore.rules allow writes or configure rules.' 
    };
  }
}

// Create a Table Reservation
export async function createReservation(
  data: Omit<Reservation, 'id' | 'createdAt' | 'status' | 'bookingReference'>
): Promise<Reservation> {
  const reference = 'SAV-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();
  const { specialRequests, ...reservationData } = data;
  const normalizedRequests = specialRequests?.trim();
  const reservation: Reservation = {
    ...reservationData,
    ...(normalizedRequests ? { specialRequests: normalizedRequests } : {}),
    id: 'res-' + Date.now().toString(36),
    status: 'pending',
    bookingReference: reference,
    createdAt: now
  };

  try {
    const docRef = await addDoc(collection(db, 'reservations'), {
      ...reservation,
      timestamp: now
    });
    reservation.id = docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reservations');
    throw error;
  }

  return reservation;
}

// Get user's reservations
export async function getUserReservations(userId?: string | null): Promise<Reservation[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'reservations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Reservation))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reservations');
    throw error;
  }
}

// Cancel a reservation
export async function cancelReservation(reservationId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'reservations', reservationId);
    await updateDoc(docRef, { status: 'cancelled', updatedAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reservations/${reservationId}`);
    throw error;
  }
  return true;
}

// Place a food order
export async function createOrder(
  orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'userId'>
): Promise<Order> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to place an order.');
  }

  const customerName = orderData.customerName.trim();
  const customerPhone = orderData.customerPhone.trim();
  const address = {
    country: orderData.deliveryAddress.country.trim(),
    city: orderData.deliveryAddress.city.trim(),
    area: orderData.deliveryAddress.area.trim(),
    houseNumber: orderData.deliveryAddress.houseNumber.trim(),
    streetAddress: orderData.deliveryAddress.streetAddress.trim(),
    ...(orderData.deliveryAddress.additionalDetails?.trim()
      ? { additionalDetails: orderData.deliveryAddress.additionalDetails.trim() }
      : {})
  };
  const phoneDigits = customerPhone.replace(/\D/g, '');
  if (
    !customerName ||
    !/^\+?[\d\s().-]+$/.test(customerPhone) ||
    customerPhone.length > 30 ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15 ||
    !address.country ||
    !address.city ||
    !address.area ||
    !address.houseNumber ||
    !address.streetAddress
  ) {
    throw new Error('A valid phone number and complete delivery address are required.');
  }

  const now = new Date().toISOString();
  const {
    tableNumber,
    specialInstructions,
    ...requiredOrderData
  } = orderData;
  const normalizedTableNumber = tableNumber?.trim();
  const normalizedInstructions = specialInstructions?.trim();
  const order: Order = {
    ...requiredOrderData,
    userId: currentUser.uid,
    customerName,
    customerPhone,
    deliveryAddress: address,
    ...(normalizedTableNumber ? { tableNumber: normalizedTableNumber } : {}),
    ...(normalizedInstructions ? { specialInstructions: normalizedInstructions } : {}),
    id: 'ord-' + Date.now().toString(36),
    status: 'pending',
    createdAt: now
  };

  const { id, ...orderDocument } = order;
  const docRef = await addDoc(collection(db, 'orders'), orderDocument);
  order.id = docRef.id;

  return order;
}
