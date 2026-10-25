const orderTransitions = {
  delivery: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready-for-dispatch', 'cancelled'],
    ready: ['on-the-way', 'cancelled'],
    'ready-for-dispatch': ['on-the-way', 'cancelled'],
    'on-the-way': ['delivered'],
    delivered: [],
    cancelled: []
  },
  takeout: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready-for-pickup', 'cancelled'],
    ready: ['picked-up'],
    'ready-for-pickup': ['picked-up'],
    'picked-up': [],
    cancelled: []
  },
  'dine-in': {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready-to-serve', 'cancelled'],
    ready: ['served'],
    'ready-to-serve': ['served'],
    served: ['completed'],
    completed: [],
    cancelled: []
  }
};

const reservationTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled'],
  seated: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

function isAllowedOrderTransition(orderType, currentStatus, nextStatus) {
  return (orderTransitions[orderType]?.[currentStatus] || []).includes(nextStatus);
}

function isAllowedReservationTransition(currentStatus, nextStatus) {
  return (reservationTransitions[currentStatus] || []).includes(nextStatus);
}

function timeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(value || '');
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  if (match[3]) {
    if (hours < 1 || hours > 12) return null;
    hours = hours % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  }
  return hours * 60 + minutes;
}

function reservationsOverlap(firstTime, secondTime, intervalMinutes = 90) {
  const firstStart = timeToMinutes(firstTime);
  const secondStart = timeToMinutes(secondTime);
  if (firstStart === null || secondStart === null) return firstTime === secondTime;
  return firstStart < secondStart + intervalMinutes && secondStart < firstStart + intervalMinutes;
}

module.exports = {
  isAllowedOrderTransition,
  isAllowedReservationTransition,
  reservationsOverlap
};
