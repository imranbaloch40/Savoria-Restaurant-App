const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isAllowedOrderTransition,
  isAllowedReservationTransition,
  reservationsOverlap
} = require('../domain');

test('order transitions stay within each order type workflow', () => {
  assert.equal(isAllowedOrderTransition('delivery', 'on-the-way', 'delivered'), true);
  assert.equal(isAllowedOrderTransition('takeout', 'preparing', 'ready-for-pickup'), true);
  assert.equal(isAllowedOrderTransition('dine-in', 'served', 'completed'), true);
  assert.equal(isAllowedOrderTransition('delivery', 'pending', 'picked-up'), false);
  assert.equal(isAllowedOrderTransition('takeout', 'delivered', 'preparing'), false);
  assert.equal(isAllowedOrderTransition('unknown', 'pending', 'confirmed'), false);
});

test('reservation transitions reject repeated or terminal status changes', () => {
  assert.equal(isAllowedReservationTransition('pending', 'confirmed'), true);
  assert.equal(isAllowedReservationTransition('confirmed', 'seated'), true);
  assert.equal(isAllowedReservationTransition('completed', 'confirmed'), false);
  assert.equal(isAllowedReservationTransition('cancelled', 'seated'), false);
});

test('table assignments reject overlapping 90-minute bookings', () => {
  assert.equal(reservationsOverlap('07:00 PM', '08:00 PM'), true);
  assert.equal(reservationsOverlap('07:00 PM', '08:30 PM'), false);
  assert.equal(reservationsOverlap('19:00', '20:00'), true);
  assert.equal(reservationsOverlap('not-a-time', 'not-a-time'), true);
});
