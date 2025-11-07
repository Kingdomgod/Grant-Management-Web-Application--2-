import { getSupabaseClient } from './client';
import { Session } from '@supabase/supabase-js';

export interface MFAConfig {
  required: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  gracePeriodDays: number;
  backupCodes: number;
}

export interface SessionConfig {
  maxDuration: number;
  inactivityTimeout: number;
  renewalWindow: number;
  tokenFormat: 'JWT';
  tokenExpiry: number;
}

export const defaultMFAConfig: MFAConfig = {
  required: true,
  methods: ['totp'],
  gracePeriodDays: 7,
  backupCodes: 10
};

export const sessionConfig: SessionConfig = {
  maxDuration: 8 * 60 * 60 * 1000, // 8 hours
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  renewalWindow: 60 * 60 * 1000, // 1 hour
  tokenFormat: 'JWT',
  tokenExpiry: 15 * 60 * 1000 // 15 minutes
};

export const initializeMFA = async (userId: string) => {
  const supabase = getSupabaseClient();
  
  try {
    // Initialize TOTP MFA factor
    const { data: factor, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp'
    });

    if (error) throw error;
    
    return factor;
  } catch (error) {
    console.error('MFA initialization failed:', error);
    throw error;
  }
};

export const verifyMFA = async (factorId: string, code: string) => {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      code
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('MFA verification failed:', error);
    throw error;
  }
};

export const checkSession = async (): Promise<{ session: Session | null; error: Error | null }> => {
  const supabase = getSupabaseClient();
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      // Check session expiry
      const expiryTime = new Date(session.expires_at!).getTime();
      const now = new Date().getTime();

      if (expiryTime - now <= sessionConfig.renewalWindow) {
        // Refresh session if within renewal window
        const { data: { session: newSession }, error: refreshError } = 
          await supabase.auth.refreshSession();

        if (refreshError) throw refreshError;
        
        return { session: newSession, error: null };
      }
    }

    return { session, error: null };
  } catch (error) {
    console.error('Session check failed:', error);
    return { session: null, error: error as Error };
  }
};

export const validateRole = async (userId: string, requiredRole: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    // Check if user has required role
    return data.role === requiredRole || data.role === 'admin';
  } catch (error) {
    console.error('Role validation failed:', error);
    return false;
  }
};

export const enforceInactivityTimeout = (callback: () => void) => {
  let inactivityTimer: NodeJS.Timeout;

  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(callback, sessionConfig.inactivityTimeout);
  };

  // Reset timer on user activity
  const activities = ['mousedown', 'keydown', 'touchstart', 'scroll'];
  activities.forEach(event => {
    window.addEventListener(event, resetTimer);
  });

  // Initial timer
  resetTimer();

  // Cleanup function
  return () => {
    activities.forEach(event => {
      window.removeEventListener(event, resetTimer);
    });
    clearTimeout(inactivityTimer);
  };
};