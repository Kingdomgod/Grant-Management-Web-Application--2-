import { getSupabaseClient } from './client';

export interface APISecurityConfig {
  rateLimit: {
    window: number;
    max: number;
    byIP: boolean;
    byUser: boolean;
  };
  headers: {
    csrf: boolean;
    hsts: boolean;
    frameOptions: string;
    contentSecurity: string[];
  };
  validation: {
    inputSanitization: boolean;
    schemaValidation: boolean;
    sqlInjectionPrevention: boolean;
  };
}

export interface SecurityMonitoring {
  alerts: {
    failedLogins: number;
    unusualActivity: {
      timeWindow: number;
      threshold: number;
    };
    dataExports: boolean;
  };
  reporting: {
    frequency: 'daily' | 'weekly';
    recipients: string[];
    severity: string[];
  };
}

export const apiSecurityConfig: APISecurityConfig = {
  rateLimit: {
    window: 60000,        // 1 minute
    max: 100,            // requests per window
    byIP: true,
    byUser: true
  },
  headers: {
    csrf: true,
    hsts: true,
    frameOptions: 'DENY',
    contentSecurity: [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co"
    ]
  },
  validation: {
    inputSanitization: true,
    schemaValidation: true,
    sqlInjectionPrevention: true
  }
};

export const securityMonitoring: SecurityMonitoring = {
  alerts: {
    failedLogins: 5,      // threshold
    unusualActivity: {
      timeWindow: 5,      // minutes
      threshold: 50       // events
    },
    dataExports: true
  },
  reporting: {
    frequency: 'daily',
    recipients: ['security@example.com'],
    severity: ['high', 'medium', 'low']
  }
};

// Rate limiting implementation
let requestCounts = new Map<string, { count: number; timestamp: number }>();

export const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const windowStart = now - apiSecurityConfig.rateLimit.window;
  
  // Clean up old entries
  for (const [key, value] of requestCounts.entries()) {
    if (value.timestamp < windowStart) {
      requestCounts.delete(key);
    }
  }
  
  // Check and update rate limit
  const current = requestCounts.get(identifier);
  if (!current) {
    requestCounts.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.count >= apiSecurityConfig.rateLimit.max) {
    return false;
  }
  
  current.count += 1;
  return true;
};

// Security headers middleware
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Frame-Options': apiSecurityConfig.headers.frameOptions,
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': apiSecurityConfig.headers.contentSecurity.join('; '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char];
    })
    .trim();
};

// Monitor for unusual activity
export const monitorActivity = async (
  userId: string,
  action: string,
  metadata: Record<string, any>
): Promise<void> => {
  const supabase = getSupabaseClient();
  
  try {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - securityMonitoring.alerts.unusualActivity.timeWindow * 60000
    );

    // Count recent activities
    const { count, error } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('timestamp', windowStart.toISOString());

    if (error) throw error;

    if (count >= securityMonitoring.alerts.unusualActivity.threshold) {
      // Trigger alert
      await supabase
        .from('security_alerts')
        .insert({
          user_id: userId,
          type: 'unusual_activity',
          details: {
            count,
            timeWindow: securityMonitoring.alerts.unusualActivity.timeWindow,
            action,
            metadata
          },
          timestamp: now.toISOString()
        });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        metadata,
        timestamp: now.toISOString()
      });
  } catch (error) {
    console.error('Activity monitoring failed:', error);
    throw error;
  }
};

// Track failed login attempts
export const trackFailedLogin = async (
  userId: string,
  ip: string
): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30 * 60000); // 30 minutes

    // Count recent failed attempts
    const { count, error } = await supabase
      .from('failed_logins')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('timestamp', windowStart.toISOString());

    if (error) throw error;

    // Log failed attempt
    await supabase
      .from('failed_logins')
      .insert({
        user_id: userId,
        ip,
        timestamp: now.toISOString()
      });

    // Check if account should be locked
    if (count >= securityMonitoring.alerts.failedLogins - 1) {
      // Lock account
      await supabase
        .from('users')
        .update({ locked: true })
        .eq('id', userId);

      // Create security alert
      await supabase
        .from('security_alerts')
        .insert({
          user_id: userId,
          type: 'account_locked',
          details: {
            failedAttempts: count + 1,
            ip
          },
          timestamp: now.toISOString()
        });

      return true; // Account locked
    }

    return false; // Account not locked
  } catch (error) {
    console.error('Failed login tracking failed:', error);
    throw error;
  }
};