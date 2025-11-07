import {
  apiSecurityConfig,
  getSecurityHeaders,
  checkRateLimit,
  monitorActivity
} from '../utils/supabase/networkSecurity';
import { logAuditEvent, AuditAction } from '../utils/supabase/audit';
import { NextRequest, NextResponse } from 'next/server';

// Define middleware configuration
const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*'
  ]
};

export async function middleware(request: NextRequest) {
  try {
    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    
    // Check rate limits
    const identifier = `${ip}:${request.url}`;
    if (!checkRateLimit(identifier)) {
      await logAuditEvent({
        userId: 'system',
        action: AuditAction.CREATE,
        resource: {
          type: 'rate_limit',
          id: identifier
        },
        metadata: {
          ip,
          userAgent: request.headers.get('user-agent') || 'unknown',
          url: request.url
        },
        status: 'failure'
      });

      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil(apiSecurityConfig.rateLimit.window / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(apiSecurityConfig.rateLimit.window / 1000).toString()
          }
        }
      );
    }

    // Create response
    const response = await fetch(request);
    
    // Clone response to modify headers
    const newResponse = new NextResponse(response.body, response);
    
    // Add security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    // Log successful request
    await monitorActivity(
      'system',
      'api_request',
      {
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams),
        ip,
        userAgent: request.headers.get('user-agent')
      }
    );

    return newResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Log error
    await logAuditEvent({
      userId: 'system',
      action: AuditAction.CREATE,
      resource: {
        type: 'error',
        id: new Date().toISOString()
      },
      metadata: {
        ip: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      status: 'failure'
    });

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}