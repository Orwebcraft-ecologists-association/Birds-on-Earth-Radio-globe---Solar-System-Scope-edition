import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { syncUserProfile } from '../services/firebaseDataService';

interface FirebaseContextValue {
    user: User | null;
    authReady: boolean;
    authError: string | null;
    signInWithGoogle: () => Promise<User | null>;
    signOutUser: () => Promise<void>;
    clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthReady(true);
            if (firebaseUser) {
                syncUserProfile(firebaseUser).catch((err) => {
                    console.error('Failed to sync profile:', err);
                });
            }
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = useCallback(async (): Promise<User | null> => {
        setAuthError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (err: any) {
            if (err?.code !== 'auth/popup-closed-by-user') {
                setAuthError(err?.message || 'Sign-in failed. Please try again.');
            }
            return null;
        }
    }, []);

    const signOutUser = useCallback(async (): Promise<void> => {
        setAuthError(null);
        try {
            await signOut(auth);
        } catch (err: any) {
            setAuthError(err?.message || 'Sign-out failed.');
        }
    }, []);

    const clearAuthError = useCallback(() => setAuthError(null), []);

    return (
        <FirebaseContext.Provider value={{ user, authReady, authError, signInWithGoogle, signOutUser, clearAuthError }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebaseAuth = (): FirebaseContextValue => {
    const ctx = useContext(FirebaseContext);
    if (!ctx) {
        throw new Error('useFirebaseAuth must be used within a FirebaseProvider');
    }
    return ctx;
};
