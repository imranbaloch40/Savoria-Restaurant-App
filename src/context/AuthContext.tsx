import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  isDesignatedManager,
  isFixedSparkAdmin,
  resolveAccountRole
} from '../firebase/authorization';
import { UserProfile } from '../types/restaurant';
import { UserRole } from '../types/restaurant';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  roleResolutionError: string | null;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signInDemoUser: () => Promise<void>;
  refreshRole: () => Promise<UserRole>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorCode = (error: unknown): string =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof error.code === 'string'
    ? error.code
    : 'unknown';

const createFallbackProfile = (user: User): UserProfile => ({
  uid: user.uid,
  userId: user.uid,
  email: user.email || '',
  displayName: user.displayName || user.email?.split('@')[0] || 'Valued Guest',
  phoneNumber: user.phoneNumber || '',
  createdAt: new Date().toISOString()
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(true);
  const [roleResolutionError, setRoleResolutionError] = useState<string | null>(null);

  const syncUserProfile = async (
    currentUser: User,
    updates?: Pick<UserProfile, 'displayName' | 'phoneNumber'>
  ): Promise<UserProfile> => {
    const email = currentUser.email;
    if (!email || email.length > 128) {
      throw new Error('Profile sync requires an email accepted by the Firestore rules.');
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    let userDoc = await getDoc(userDocRef);
    let profileData: Record<string, unknown>;

    if (userDoc.exists()) {
      profileData = userDoc.data();
    } else {
      const newProfile = {
        ...createFallbackProfile(currentUser),
        email,
        userId: currentUser.uid
      };
      try {
        await setDoc(userDocRef, newProfile);
        profileData = newProfile;
      } catch (writeError) {
        // Another auth callback may have created the document between getDoc and setDoc.
        userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          throw writeError;
        }
        profileData = userDoc.data();
      }
    }

    if (profileData.userId !== currentUser.uid) {
      console.warn('Could not sync user profile to Firestore: profile schema does not match the signed-in user.');
    } else if (updates) {
      const changedFields: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber'>> = {};
      if (profileData.displayName !== updates.displayName) {
        changedFields.displayName = updates.displayName;
      }
      if (profileData.phoneNumber !== updates.phoneNumber) {
        changedFields.phoneNumber = updates.phoneNumber;
      }

      if (Object.keys(changedFields).length > 0) {
        const updatedAt = new Date().toISOString();
        await updateDoc(userDocRef, { ...changedFields, updatedAt });
        profileData = { ...profileData, ...changedFields, updatedAt };
      }
    }

    return { ...profileData, uid: currentUser.uid } as UserProfile;
  };

  // Monitor auth state changes
  useEffect(() => {
    let authEvent = 0;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentEvent = ++authEvent;
      setLoading(true);
      setUser(currentUser);
      console.log("LOGIN EMAIL:", currentUser?.email);
console.log("LOGIN UID:", currentUser?.uid);
console.log("EMAIL VERIFIED:", currentUser?.emailVerified);
      setRole('customer');
      setRoleResolutionError(null);
      try {
        if (!currentUser) {
          if (currentEvent === authEvent) {
            setUserProfile(null);
            setRole('customer');
          }
          return;
        }

        let profile: UserProfile;
        try {
          profile = await syncUserProfile(currentUser);
        } catch (error) {
          console.warn('Could not sync user profile to Firestore.', getErrorCode(error));
          profile = createFallbackProfile(currentUser);
        }
        let roleDocument: Record<string, unknown> | null = null;
        let roleError: string | null = null;
        const isFixedAdmin = isFixedSparkAdmin(currentUser);
        const isDesignated = isDesignatedManager(currentUser);
        if (!isFixedAdmin && !isDesignated) {
          try {
            const roleSnapshot = await getDoc(doc(db, 'managerRoles', currentUser.uid));
            roleDocument = roleSnapshot.exists() ? roleSnapshot.data() : null;
          } catch (error) {
            roleError = getErrorCode(error);
            console.error('Could not resolve account access from managerRoles/{uid}.', {
              code: roleError
            });
          }
        }
        if (currentEvent === authEvent) {
          setUserProfile(profile);
          const resolvedRole = resolveAccountRole(currentUser, roleDocument);
          setRoleResolutionError(roleError);
          setRole(resolvedRole);
          console.info('[Savoria auth] Account role resolved.', {
            role: resolvedRole,
            managerRoleDocumentExists: roleDocument !== null,
            managerRoleValue: typeof roleDocument?.role === 'string' ? roleDocument.role : null,
            roleLookupError: roleError
          });
        }
      } finally {
        if (currentEvent === authEvent) {
          setLoading(false);
        }
      }
    });

    return () => {
      authEvent++;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sign in';
      let userFriendly = errorMsg;
      if (errorMsg.includes('auth/invalid-credential') || errorMsg.includes('auth/wrong-password')) {
        userFriendly = 'Invalid email or password. Please verify and try again.';
      } else if (errorMsg.includes('auth/user-not-found')) {
        userFriendly = 'No account found with this email. Please sign up first.';
      } else if (errorMsg.includes('auth/operation-not-allowed')) {
        userFriendly = 'Email/Password authentication is not yet enabled in your Firebase Console. Please enable it in Authentication > Sign-in method, or try Demo Guest Mode!';
      }
      return { success: false, error: userFriendly };
    }
  };

  const signUp = async (email: string, pass: string, name: string, phone: string = '') => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
      }
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        userId: cred.user.uid,
        email,
        displayName: name || email.split('@')[0],
        phoneNumber: phone,
        createdAt: new Date().toISOString()
      };

      try {
        const profile = await syncUserProfile(cred.user, {
          displayName: newProfile.displayName,
          phoneNumber: newProfile.phoneNumber
        });
        setUserProfile(profile);
      } catch (error) {
        console.warn('Could not save user profile to Firestore.', getErrorCode(error));
        setUserProfile(newProfile);
      }
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create account';
      let userFriendly = errorMsg;
      if (errorMsg.includes('auth/email-already-in-use')) {
        userFriendly = 'This email is already registered. Please sign in instead.';
      } else if (errorMsg.includes('auth/weak-password')) {
        userFriendly = 'Password should be at least 6 characters.';
      } else if (errorMsg.includes('auth/operation-not-allowed')) {
        userFriendly = 'Email/Password sign-up is not yet enabled in Firebase Console. You can enable it in Authentication > Sign-in method.';
      }
      return { success: false, error: userFriendly };
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setRole('customer');
      setRoleResolutionError(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const signInDemoUser = async () => {
    // Simulated VIP Guest account for immediate testing
    const demoProfile: UserProfile = {
      uid: 'demo-guest-' + Date.now().toString(36),
      email: 'alex.gourmet@savoria.com',
      displayName: 'Alex Montgomery',
      phoneNumber: '+1 (555) 234-5678',
      createdAt: new Date().toISOString()
    };
    setUserProfile(demoProfile);
    setRole('customer');
  };

  const refreshRole = async (): Promise<UserRole> => {
    if (!auth.currentUser) {
      setRole('customer');
      setRoleResolutionError(null);
      return 'customer';
    }
    try {
      const isFixedAdmin = isFixedSparkAdmin(auth.currentUser);
      const roleSnapshot = isFixedAdmin || isDesignatedManager(auth.currentUser)
        ? null
        : await getDoc(doc(db, 'managerRoles', auth.currentUser.uid));
      const roleDocument = roleSnapshot?.exists() ? roleSnapshot.data() : null;
      const nextRole = resolveAccountRole(auth.currentUser, roleDocument);
      setRoleResolutionError(null);
      setRole(nextRole);
      console.info('[Savoria auth] Account role refreshed.', {
        role: nextRole,
        managerRoleDocumentExists: roleDocument !== null,
        managerRoleValue: typeof roleDocument?.role === 'string' ? roleDocument.role : null,
        roleLookupError: null
      });
      return nextRole;
    } catch (error) {
      const code = getErrorCode(error);
      setRoleResolutionError(code);
      setRole('customer');
      console.error('Could not resolve account access from managerRoles/{uid}.', { code });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, role, loading, roleResolutionError, signIn, signUp, signOut, signInDemoUser, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
