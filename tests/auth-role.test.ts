import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DESIGNATED_MANAGER_UID,
  getRoleLandingPage,
  isFixedSparkAdmin,
  resolveAccountRole
} from '../src/firebase/authorization';

const managerIdentity = {
  uid: '5Wa84MZHehN4tG6wRscNKfXPnmv1',
  email: 'managerpanael@gmail.com',
  emailVerified: true
};

test('the designated manager UID resolves to the manager dashboard without a role document', () => {
  const designatedManager = {
    uid: DESIGNATED_MANAGER_UID,
    email: 'managerpanel@gmail.com',
    emailVerified: true
  };
  const role = resolveAccountRole(designatedManager, null);

  assert.equal(role, 'manager');
  assert.equal(getRoleLandingPage(true, role, false, null), 'manager');
  assert.equal(
    resolveAccountRole({ ...designatedManager, uid: 'another-uid' }, null),
    'customer'
  );
});

test('a managerRoles/{uid} record with role manager resolves to the manager dashboard', () => {
  const role = resolveAccountRole(managerIdentity, {
    role: 'manager',
    grantedBy: 'op2EtvYEBkb6yatyZFeIZ3IAdFC2',
    grantedAt: '2026-10-24T00:00:00.000Z'
  });

  assert.equal(role, 'manager');
  assert.equal(getRoleLandingPage(true, role, false, null), 'manager');
});

test('missing, unapproved, or differently shaped role records do not grant manager access', () => {
  for (const roleRecord of [
    null,
    undefined,
    {},
    { status: 'approved' },
    { role: 'Manager' },
    { role: 'manager', grantedBy: 'untrusted-user', grantedAt: '2026-10-24T00:00:00.000Z' },
    { role: 'manager', grantedBy: 'op2EtvYEBkb6yatyZFeIZ3IAdFC2' }
  ]) {
    const role = resolveAccountRole(managerIdentity, roleRecord);
    assert.equal(role, 'customer');
    assert.equal(getRoleLandingPage(true, role, false, null), 'restaurant');
  }
});

test('the admin role requires the fixed UID, exact email, and verified email', () => {
  const admin = {
    uid: 'op2EtvYEBkb6yatyZFeIZ3IAdFC2',
    email: 'admindashboard@gmail.com',
    emailVerified: true
  };
  assert.equal(isFixedSparkAdmin(admin), true);
  assert.equal(resolveAccountRole(admin, null), 'admin');
  assert.equal(getRoleLandingPage(true, 'admin', false, null), 'manager');
  assert.equal(isFixedSparkAdmin({ ...admin, uid: 'another-uid' }), false);
  assert.equal(isFixedSparkAdmin({ ...admin, email: 'other@example.test' }), false);
  assert.equal(isFixedSparkAdmin({ ...admin, emailVerified: false }), false);
});

test('role lookup loading and errors do not render the customer interface', () => {
  assert.equal(getRoleLandingPage(true, 'customer', true, null), 'loading');
  assert.equal(getRoleLandingPage(true, 'customer', false, 'permission-denied'), 'access-error');
});
