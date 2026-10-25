export const SPARK_ADMIN_UID = 'op2EtvYEBkb6yatyZFeIZ3IAdFC2';
export const SPARK_ADMIN_EMAIL = 'admindashboard@gmail.com';
export const DESIGNATED_MANAGER_UID = 'ym0RGabzVLN1GiS7Iyp9uijFKxz2';

export type AccountRole = 'customer' | 'manager' | 'admin';

export interface AccountIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export type RoleLandingPage = 'loading' | 'access-error' | 'manager' | 'restaurant';

export function isFixedSparkAdmin(identity: AccountIdentity): boolean {
  return identity.uid === SPARK_ADMIN_UID &&
    identity.email === SPARK_ADMIN_EMAIL &&
    identity.emailVerified;
}

export function isDesignatedManager(identity: AccountIdentity): boolean {
  return identity.uid === DESIGNATED_MANAGER_UID;
}

export function resolveAccountRole(
  identity: AccountIdentity,
  managerRoleRecord: unknown
): AccountRole {
  if (isFixedSparkAdmin(identity)) return 'admin';
  if (isDesignatedManager(identity)) return 'manager';

  if (
    typeof managerRoleRecord === 'object' &&
    managerRoleRecord !== null &&
    'role' in managerRoleRecord &&
    managerRoleRecord.role === 'manager' &&
    'grantedBy' in managerRoleRecord &&
    managerRoleRecord.grantedBy === SPARK_ADMIN_UID &&
    'grantedAt' in managerRoleRecord &&
    typeof managerRoleRecord.grantedAt === 'string'
  ) {
    return 'manager';
  }

  return 'customer';
}

export function getRoleLandingPage(
  authenticated: boolean,
  role: AccountRole,
  loading: boolean,
  roleResolutionError: string | null
): RoleLandingPage {
  if (loading) return 'loading';
  if (roleResolutionError) return 'access-error';
  return authenticated && (role === 'admin' || role === 'manager')
    ? 'manager'
    : 'restaurant';
}
