
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/app/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isInitialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isInitialized: false,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializing = useRef(false);
  const signInTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Initializing auth state');

    // Prevent multiple initializations
    if (isInitializing.current) {
      console.log('AuthProvider: Already initializing, skipping');
      return;
    }

    isInitializing.current = true;

    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Fetching initial session...');
        
        // Add a small delay to ensure native modules are ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          setSession(null);
          setUser(null);
        } else {
          console.log('AuthProvider: Initial session:', session?.user?.id || 'none');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('AuthProvider: Unexpected error getting session:', err);
        setSession(null);
        setUser(null);
      } finally {
        console.log('AuthProvider: Auth initialization complete');
        setLoading(false);
        setIsInitialized(true);
        isInitializing.current = false;
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('AuthProvider: Auth state changed:', _event, session?.user?.id || 'none');
      
      try {
        // Clear any pending sign-in timeout
        if (signInTimeoutRef.current) {
          clearTimeout(signInTimeoutRef.current);
          signInTimeoutRef.current = null;
        }

        // Handle sign-in with extended delay to prevent TurboModule crashes
        if (_event === 'SIGNED_IN' && session) {
          console.log('AuthProvider: User signed in, stabilizing session...');
          setLoading(true);
          
          // Extended delay to ensure all native modules are ready
          // This prevents view snapshot crashes during navigation
          await new Promise(resolve => {
            signInTimeoutRef.current = setTimeout(resolve, 1000);
          });
          
          console.log('AuthProvider: Session stabilized, updating state');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } else if (_event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setSession(null);
          setUser(null);
          setLoading(false);
        } else {
          // For other events, update immediately
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthProvider: Error handling auth state change:', err);
        // On error, still update state to prevent stuck loading
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up subscription');
      
      // Clear any pending timeouts
      if (signInTimeoutRef.current) {
        clearTimeout(signInTimeoutRef.current);
        signInTimeoutRef.current = null;
      }
      
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthProvider: Sign out error:', error);
      } else {
        console.log('AuthProvider: Sign out successful');
        setSession(null);
        setUser(null);
      }
    } catch (err) {
      console.error('AuthProvider: Unexpected error during sign out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isInitialized, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
