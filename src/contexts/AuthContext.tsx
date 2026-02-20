import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { ref, set, onDisconnect, serverTimestamp, onValue, update } from 'firebase/database';
import { auth, database } from '@/services/firebase';
import { User } from '@/types/chat';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        
        // Get user data from database
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: userData?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            status: 'online',
            lastSeen: Date.now(),
            photoURL: userData?.photoURL || firebaseUser.photoURL
          };
          setCurrentUser(user);
        }, { onlyOnce: true });

        // Set user online and setup presence
        await set(userRef, {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          status: 'online',
          lastSeen: serverTimestamp(),
          photoURL: firebaseUser.photoURL
        });

        // Setup disconnect handler
        const presenceRef = ref(database, `users/${firebaseUser.uid}/status`);
        const lastSeenRef = ref(database, `users/${firebaseUser.uid}/lastSeen`);
        
        onDisconnect(presenceRef).set('offline');
        onDisconnect(lastSeenRef).set(serverTimestamp());
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-update status based on activity
  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimer: NodeJS.Timeout;
    const userRef = ref(database, `users/${currentUser.id}`);

    const updateStatus = async (status: 'online' | 'away') => {
      await update(userRef, { status, lastSeen: serverTimestamp() });
      setCurrentUser(prev => prev ? { ...prev, status } : null);
    };

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      if (currentUser.status !== 'online') {
        updateStatus('online');
      }
      inactivityTimer = setTimeout(() => {
        updateStatus('away');
      }, 5 * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [currentUser?.id]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseProfile(user, { displayName });
    
    // Save user to database
    await set(ref(database, `users/${user.uid}`), {
      id: user.uid,
      email: user.email,
      displayName,
      status: 'online',
      lastSeen: serverTimestamp()
    });
  };

  const logout = async () => {
    if (currentUser) {
      await update(ref(database, `users/${currentUser.id}`), {
        status: 'offline',
        lastSeen: serverTimestamp()
      });
    }
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (currentUser && auth.currentUser) {
      if (data.displayName) {
        await updateFirebaseProfile(auth.currentUser, { displayName: data.displayName });
      }
      await update(ref(database, `users/${currentUser.id}`), data);
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, logout, updateProfile, resetPassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
