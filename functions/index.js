const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const {
  isAllowedOrderTransition,
  isAllowedReservationTransition,
  reservationsOverlap
} = require('./domain');

initializeApp();
const db = getFirestore();
const auth = getAuth();

function requireUser(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to continue.');
  }
  return request.auth;
}

function requireManager(request, adminOnly = false) {
  const user = requireUser(request);
  const role = user.token.role;
  if (adminOnly ? role !== 'admin' : !['admin', 'manager'].includes(role)) {
    throw new HttpsError('permission-denied', 'You are not authorized to perform this action.');
  }
  return user;
}

exports.submitManagerApplication = onCall(async (request) => {
  const user = requireUser(request);
  if (['admin', 'manager'].includes(user.token.role)) {
    throw new HttpsError('already-exists', 'This account already has manager access.');
  }

  const data = request.data || {};
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  const phoneNumber = typeof data.phoneNumber === 'string' ? data.phoneNumber.trim() : '';
  const restaurantDetails = typeof data.restaurantDetails === 'string'
    ? data.restaurantDetails.trim()
    : '';
  const phoneDigits = phoneNumber.replace(/\D/g, '');
  if (
    !fullName ||
    fullName.length > 100 ||
    !/^\+?[\d\s().-]+$/.test(phoneNumber) ||
    phoneNumber.length > 30 ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  ) {
    throw new HttpsError('invalid-argument', 'Enter a valid name and phone number.');
  }
  if (restaurantDetails.length > 500) {
    throw new HttpsError('invalid-argument', 'Restaurant details must be 500 characters or fewer.');
  }

  const ref = db.collection('managerApplications').doc(user.uid);
  const existing = await ref.get();
  if (existing.exists && existing.get('status') === 'pending') {
    throw new HttpsError('already-exists', 'Your manager application is already awaiting review.');
  }

  await ref.set({
    uid: user.uid,
    fullName,
    email: user.token.email || '',
    phoneNumber,
    restaurantDetails,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  return { status: 'pending' };
});

exports.reviewManagerApplication = onCall(async (request) => {
  const admin = requireManager(request, true);
  const { uid, decision } = request.data || {};
  if (typeof uid !== 'string' || !['approved', 'rejected'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Choose a valid application and decision.');
  }

  const applicationRef = db.collection('managerApplications').doc(uid);
  const alreadyReviewed = await db.runTransaction(async (transaction) => {
    const application = await transaction.get(applicationRef);
    if (application.exists && application.get('status') === decision) {
      return true;
    }
    if (!application.exists || application.get('status') !== 'pending') {
      throw new HttpsError('failed-precondition', 'This application is no longer pending.');
    }
    transaction.update(applicationRef, {
      status: decision,
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin.uid
    });
    return false;
  });

  if (decision === 'approved') {
    const account = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...account.customClaims, role: 'manager' });
  }
  return { status: decision, alreadyReviewed };
});

exports.updateOrderStatus = onCall(async (request) => {
  const manager = requireManager(request);
  const { orderId, status } = request.data || {};
  if (typeof orderId !== 'string' || typeof status !== 'string') {
    throw new HttpsError('invalid-argument', 'An order and status are required.');
  }

  const ref = db.collection('orders').doc(orderId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Order not found.');
    const order = snapshot.data();
    if (!isAllowedOrderTransition(order.orderType, order.status, status)) {
      throw new HttpsError('failed-precondition', 'That order status transition is not allowed.');
    }
    const timestamp = new Date().toISOString();
    transaction.update(ref, {
      status,
      updatedAt: timestamp,
      statusHistory: FieldValue.arrayUnion({
        status,
        changedAt: timestamp,
        changedBy: manager.uid
      })
    });
  });
  return { status };
});

exports.updateReservation = onCall(async (request) => {
  const manager = requireManager(request);
  const { reservationId, status, tableNumber } = request.data || {};
  if (typeof reservationId !== 'string') {
    throw new HttpsError('invalid-argument', 'A reservation is required.');
  }

  const ref = db.collection('reservations').doc(reservationId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Reservation not found.');
    const reservation = snapshot.data();
    const updates = {
      updatedAt: new Date().toISOString(),
      updatedBy: manager.uid
    };

    if (status !== undefined) {
      if (!isAllowedReservationTransition(reservation.status, status)) {
        throw new HttpsError('failed-precondition', 'That reservation status transition is not allowed.');
      }
      updates.status = status;
      updates.statusHistory = FieldValue.arrayUnion({
        status,
        changedAt: updates.updatedAt,
        changedBy: manager.uid
      });
    }

    if (tableNumber !== undefined) {
      if (typeof tableNumber !== 'string' || tableNumber.length > 40) {
        throw new HttpsError('invalid-argument', 'Enter a valid table assignment.');
      }
      if (['cancelled', 'completed'].includes(reservation.status)) {
        throw new HttpsError('failed-precondition', 'Closed reservations cannot be assigned a table.');
      }
      const nextTable = tableNumber.trim();
      if (nextTable) {
        if (typeof reservation.date !== 'string' || typeof reservation.time !== 'string') {
          throw new HttpsError('failed-precondition', 'This legacy reservation has no valid date or time.');
        }
        const overlapping = await transaction.get(
          db.collection('reservations')
            .where('date', '==', reservation.date)
            .where('tableNumber', '==', nextTable)
        );
        const conflict = overlapping.docs.find(item =>
          item.id !== reservationId &&
          !['cancelled', 'completed'].includes(item.get('status')) &&
          reservationsOverlap(reservation.time, item.get('time'), 90)
        );
        if (conflict) {
          throw new HttpsError('already-exists', 'That table is already assigned for this time.');
        }
      }
      updates.tableNumber = nextTable;
    }
    if (status === undefined && tableNumber === undefined) {
      throw new HttpsError('invalid-argument', 'Provide a status change or table assignment.');
    }
    transaction.update(ref, updates);
  });
  return { success: true };
});
