
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = "https://vxglluxqhceajceizbbm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Z2xsdXhxaGNlYWpjZWl6YmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODI3NjgsImV4cCI6MjA4MDA1ODc2OH0.AhRHzG_gWMraMJoR76nErEle1E8b9U2B5BL-Lj_vnJo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// For web, we'll use localStorage which is the default
// For native, we'll use AsyncStorage
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
