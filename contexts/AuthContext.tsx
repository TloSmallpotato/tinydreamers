
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/app/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isInitialized: boolean;
  userRole: 'user' | 'admin' | null;
  roleLoading: boolean;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isInitialized: false,
  userRole: null,
  roleLoading: true,
  signOut: async () => {},
  refreshUserRole: async () => {},
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
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const isInitializing = useRef(false);
  const signInTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roleChannelRef = useRef<any>(null);

  // Fetch user role from database
  const fetchUserRole = async (userId: string) => {
    try {
      console.log('AuthProvider: Fetching role for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthProvider: Error fetching role:', error);
        setUserRole('user'); // Default to user on error
        return;
      }

      const role = data?.role === 'admin' ? 'admin' : 'user';
      console.log('AuthProvider: User role:', role);
      setUserRole(role);
    } catch (err) {
      console.error('AuthProvider: Unexpected error fetching role:', err);
      setUserRole('user'); // Default to user on error
    } finally {
      setRoleLoading(false);
    }
  };

  // Refresh user role (can be called manually)
  const refreshUserRole = async () => {
    if (!user) {
      console.log('AuthProvider: No user to refresh role for');
      return;
    }
    setRoleLoading(true);
    await fetchUserRole(user.id);
  };

  // Set up real-time subscription for role changes
  const setupRoleSubscription = (userId: string) => {
    // Clean up existing subscription
    if (roleChannelRef.current) {
      console.log('AuthProvider: Cleaning up existing role subscription');
      supabase.removeChannel(roleChannelRef.current);
      roleChannelRef.current = null;
    }

    console.log('AuthProvider: Setting up role subscription for user:', userId);
    const channel = supabase
      .channel(`user_role_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('AuthProvider: Role update detected:', payload);
          const newRole = payload.new?.role === 'admin' ? 'admin' : 'user';
          console.log('AuthProvider: Updating role to:', newRole);
          setUserRole(newRole);
        }
      )
      .subscribe((status, err) => {
        console.log('AuthProvider: Role subscription status:', status);
        if (err) {
          console.error('AuthProvider: Role subscription error:', err);
        }
      });

    roleChannelRef.current = channel;
  };

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
          setUserRole(null);
          setRoleLoading(false);
        } else {
          console.log('AuthProvider: Initial session:', session?.user?.id || 'none');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch role if user exists
          if (session?.user) {
            await fetchUserRole(session.user.id);
            setupRoleSubscription(session.user.id);
          } else {
            setUserRole(null);
            setRoleLoading(false);
          }
        }
      } catch (err) {
        console.error('AuthProvider: Unexpected error getting session:', err);
        setSession(null);
        setUser(null);
        setUserRole(null);
        setRoleLoading(false);
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
          setRoleLoading(true);
          
          // Extended delay to ensure all native modules are ready
          // This prevents view snapshot crashes during navigation
          await new Promise(resolve => {
            signInTimeoutRef.current = setTimeout(resolve, 1000);
          });
          
          console.log('AuthProvider: Session stabilized, updating state');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch role and set up subscription
          if (session?.user) {
            await fetchUserRole(session.user.id);
            setupRoleSubscription(session.user.id);
          }
          
          setLoading(false);
        } else if (_event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, clearing role cache');
          
          // Clean up role subscription
          if (roleChannelRef.current) {
            supabase.removeChannel(roleChannelRef.current);
            roleChannelRef.current = null;
          }
          
          // Clear all state
          setSession(null);
          setUser(null);
          setUserRole(null);
          setRoleLoading(false);
          setLoading(false);
        } else {
          // For other events, update immediately
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setRoleLoading(true);
            await fetchUserRole(session.user.id);
            setupRoleSubscription(session.user.id);
          } else {
            setUserRole(null);
            setRoleLoading(false);
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthProvider: Error handling auth state change:', err);
        // On error, still update state to prevent stuck loading
        setSession(session);
        setUser(session?.user ?? null);
        setUserRole(null);
        setRoleLoading(false);
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
      
      // Clean up role subscription
      if (roleChannelRef.current) {
        supabase.removeChannel(roleChannelRef.current);
        roleChannelRef.current = null;
      }
      
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out');
      setLoading(true);
      
      // Clean up role subscription before signing out
      if (roleChannelRef.current) {
        console.log('AuthProvider: Cleaning up role subscription on logout');
        supabase.removeChannel(roleChannelRef.current);
        roleChannelRef.current = null;
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthProvider: Sign out error:', error);
      } else {
        console.log('AuthProvider: Sign out successful, clearing role cache');
        setSession(null);
        setUser(null);
        setUserRole(null);
        setRoleLoading(false);
      }
    } catch (err) {
      console.error('AuthProvider: Unexpected error during sign out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      isInitialized, 
      userRole, 
      roleLoading,
      signOut,
      refreshUserRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
