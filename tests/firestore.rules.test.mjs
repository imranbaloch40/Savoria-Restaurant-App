import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

const projectId = 'demo-savoria-rules';
const adminUid = 'op2EtvYEBkb6yatyZFeIZ3IAdFC2';
const designatedManagerUid = 'ym0RGabzVLN1GiS7Iyp9uijFKxz2';
const customerUid = 'customer-test-uid';
const otherCustomerUid = 'other-customer-test-uid';
let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
    }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
});

after(async () => {
  await environment.cleanup();
});

function adminDb() {
  return environment.authenticatedContext(adminUid, {
    email: 'admindashboard@gmail.com',
    email_verified: true
  }).firestore();
}

function managerDb(uid = customerUid) {
  return environment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true
  }).firestore();
}

function customerDb(uid = customerUid) {
  return environment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true
  }).firestore();
}

function orderRecord(uid = customerUid) {
  const subtotal = 12;
  const tax = subtotal * 0.0825;
  return {
    id: `order-${uid}`,
    userId: uid,
    customerName: 'Test Customer',
    customerEmail: `${uid}@example.test`,
    customerPhone: '+1 (555) 123-4567',
    deliveryAddress: {
      country: 'United States',
      city: 'Test City',
      area: 'Central',
      houseNumber: '10',
      streetAddress: 'Main Street'
    },
    items: [{ id: 'food-1', name: 'Test Dish', price: subtotal, quantity: 1 }],
    orderType: 'delivery',
    subtotal,
    tax,
    tip: 0,
    total: subtotal + tax,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

function reservationRecord(uid = customerUid) {
  return {
    id: `reservation-${uid}`,
    userId: uid,
    customerName: 'Test Customer',
    customerEmail: `${uid}@example.test`,
    customerPhone: '+15551234567',
    date: '2030-01-01',
    time: '07:00 PM',
    guests: 2,
    seatingArea: 'Main Dining Hall',
    occasion: 'Casual Dining',
    bookingReference: `SAV-${uid}`,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

test('authenticated users can apply for themselves, cannot self-promote, and only the verified admin can approve', async () => {
  const customer = customerDb();
  const application = {
    uid: customerUid,
    fullName: 'Test Customer',
    email: `${customerUid}@example.test`,
    phoneNumber: '+15551234567',
    restaurantDetails: '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  await assertSucceeds(setDoc(doc(customer, 'managerApplications', customerUid), application));
  assert.equal((await getDoc(doc(customer, 'managerApplications', customerUid))).data().status, 'pending');
  await assertFails(setDoc(doc(customer, 'managerApplications', otherCustomerUid), {
    ...application,
    uid: otherCustomerUid
  }));
  await assertFails(setDoc(doc(customer, 'managerRoles', customerUid), {
    role: 'manager',
    grantedBy: customerUid,
    grantedAt: new Date().toISOString()
  }));
  await assertFails(getDocs(collection(customer, 'managerApplications')));
  await assertFails(updateDoc(doc(customer, 'managerApplications', customerUid), {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: customerUid
  }));

  const admin = adminDb();
  await assertSucceeds(runTransaction(admin, async transaction => {
    transaction.update(doc(admin, 'managerApplications', customerUid), {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUid
    });
    transaction.set(doc(admin, 'managerRoles', customerUid), {
      role: 'manager',
      grantedAt: new Date().toISOString(),
      grantedBy: adminUid
    });
  }));

  const manager = managerDb();
  await assertSucceeds(getDoc(doc(manager, 'managerRoles', customerUid)));
  await assertFails(getDocs(collection(manager, 'managerApplications')));
  await assertFails(setDoc(doc(manager, 'managerRoles', otherCustomerUid), {
    role: 'manager',
    grantedBy: customerUid,
    grantedAt: new Date().toISOString()
  }));
});

test('admin permission requires both the configured UID and the verified admin email', async () => {
  const spoofedEmail = environment.authenticatedContext(otherCustomerUid, {
    email: 'admindashboard@gmail.com',
    email_verified: true
  }).firestore();
  await assertFails(setDoc(doc(spoofedEmail, 'managerRoles', customerUid), {
    role: 'manager',
    grantedBy: otherCustomerUid,
    grantedAt: new Date().toISOString()
  }));

  const unverifiedAdmin = environment.authenticatedContext(adminUid, {
    email: 'admindashboard@gmail.com',
    email_verified: false
  }).firestore();
  await assertFails(setDoc(doc(unverifiedAdmin, 'managerRoles', customerUid), {
    role: 'manager',
    grantedBy: adminUid,
    grantedAt: new Date().toISOString()
  }));
});

test('manager access requires an Admin-granted manager role record with grant metadata', async () => {
  const otherOrder = orderRecord(otherCustomerUid);

  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'orders', otherOrder.id), otherOrder);
    await setDoc(doc(context.firestore(), 'managerRoles', customerUid), {
      role: 'manager',
      grantedBy: otherCustomerUid,
      grantedAt: new Date().toISOString()
    });
  });

  await assertFails(getDoc(doc(managerDb(), 'orders', otherOrder.id)));
});

test('the designated manager can manage orders and reservations without a role document', async () => {
  const order = orderRecord();
  const reservation = reservationRecord();
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'orders', order.id), order);
    await setDoc(doc(context.firestore(), 'reservations', reservation.id), reservation);
  });

  const manager = managerDb(designatedManagerUid);
  await assertSucceeds(getDoc(doc(manager, 'orders', order.id)));
  await assertSucceeds(getDocs(collection(manager, 'orders')));
  await assertSucceeds(getDoc(doc(manager, 'reservations', reservation.id)));
  await assertSucceeds(getDocs(collection(manager, 'reservations')));

  const changedAt = new Date().toISOString();
  await assertSucceeds(updateDoc(doc(manager, 'orders', order.id), {
    status: 'confirmed',
    updatedAt: changedAt,
    statusHistory: arrayUnion({
      status: 'confirmed',
      changedAt,
      changedBy: designatedManagerUid
    })
  }));
  await assertSucceeds(updateDoc(doc(manager, 'reservations', reservation.id), {
    status: 'confirmed',
    updatedAt: changedAt,
    updatedBy: designatedManagerUid,
    statusHistory: arrayUnion({
      status: 'confirmed',
      changedAt,
      changedBy: designatedManagerUid
    })
  }));
  await assertFails(setDoc(doc(manager, 'managerRoles', otherCustomerUid), {
    role: 'manager',
    grantedBy: designatedManagerUid,
    grantedAt: changedAt
  }));
  await assertFails(getDoc(doc(managerDb(otherCustomerUid), 'orders', order.id)));
});

test('customers create and read only their own orders; manager status updates are restricted and live-readable', async () => {
  const customer = customerDb();
  const ownOrder = orderRecord();
  await assertSucceeds(setDoc(doc(customer, 'orders', ownOrder.id), ownOrder));
  await assertFails(getDoc(doc(customerDb(otherCustomerUid), 'orders', ownOrder.id)));
  await assertFails(getDocs(collection(customerDb(otherCustomerUid), 'orders')));
  await assertFails(getDocs(query(collection(customerDb(otherCustomerUid), 'orders'), where('userId', '==', customerUid))));
  await assertFails(updateDoc(doc(customer, 'orders', ownOrder.id), { status: 'confirmed' }));

  const admin = adminDb();
  await assertSucceeds(setDoc(doc(admin, 'managerRoles', customerUid), {
    role: 'manager',
    grantedAt: new Date().toISOString(),
    grantedBy: adminUid
  }));
  const manager = managerDb();
  const changedAt = new Date().toISOString();
  await assertSucceeds(updateDoc(doc(manager, 'orders', ownOrder.id), {
    status: 'confirmed',
    updatedAt: changedAt,
    statusHistory: arrayUnion({
      status: 'confirmed',
      changedAt,
      changedBy: customerUid
    })
  }));
  await assertFails(updateDoc(doc(manager, 'orders', ownOrder.id), {
    status: 'delivered',
    updatedAt: new Date().toISOString(),
    statusHistory: arrayUnion({
      status: 'delivered',
      changedAt: new Date().toISOString(),
      changedBy: customerUid
    })
  }));
  await assertSucceeds(getDoc(doc(customer, 'orders', ownOrder.id)));
  assert.equal((await getDoc(doc(customer, 'orders', ownOrder.id))).data().status, 'confirmed');
});

test('reservation ownership and manager status transitions are enforced', async () => {
  const customer = customerDb();
  const reservation = reservationRecord();
  await assertSucceeds(setDoc(doc(customer, 'reservations', reservation.id), reservation));
  await assertFails(getDoc(doc(customerDb(otherCustomerUid), 'reservations', reservation.id)));
  await assertFails(getDocs(collection(customerDb(otherCustomerUid), 'reservations')));

  const admin = adminDb();
  await assertSucceeds(setDoc(doc(admin, 'managerRoles', customerUid), {
    role: 'manager',
    grantedAt: new Date().toISOString(),
    grantedBy: adminUid
  }));
  const manager = managerDb();
  const changedAt = new Date().toISOString();
  await assertSucceeds(updateDoc(doc(manager, 'reservations', reservation.id), {
    status: 'confirmed',
    updatedAt: changedAt,
    updatedBy: customerUid,
    statusHistory: arrayUnion({
      status: 'confirmed',
      changedAt,
      changedBy: customerUid
    })
  }));
  await assertFails(updateDoc(doc(manager, 'reservations', reservation.id), {
    status: 'completed',
    updatedAt: new Date().toISOString(),
    updatedBy: customerUid,
    statusHistory: arrayUnion({
      status: 'completed',
      changedAt: new Date().toISOString(),
      changedBy: customerUid
    })
  }));
});

test('menu writes require manager access and application review requires the fixed admin identity', async () => {
  const customer = customerDb();
  const menuItem = {
    id: 'food-1',
    name: 'Test Dish',
    description: 'A test menu item',
    price: 12,
    category: 'mains',
    image: 'https://example.test/dish.jpg'
  };
  await assertSucceeds(getDocs(collection(customer, 'foodItems')));
  await assertFails(setDoc(doc(customer, 'foodItems', menuItem.id), menuItem));

  const application = {
    uid: customerUid,
    fullName: 'Test Customer',
    email: `${customerUid}@example.test`,
    phoneNumber: '+15551234567',
    restaurantDetails: '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  await assertSucceeds(setDoc(doc(customer, 'managerApplications', customerUid), application));
  await assertFails(updateDoc(doc(customer, 'managerApplications', customerUid), {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: customerUid
  }));

  const admin = adminDb();
  await assertSucceeds(updateDoc(doc(admin, 'managerApplications', customerUid), {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUid
  }));
  await assertSucceeds(setDoc(doc(admin, 'foodItems', menuItem.id), menuItem));
});
