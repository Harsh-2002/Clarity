import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/api/db/client';

/**
 * Get JWT secret from database (cached in memory after first load)
 */
let _cachedJwtSecret: Uint8Array | null = null;

async function getJwtSecret(): Promise<Uint8Array> {
    if (_cachedJwtSecret) return _cachedJwtSecret;

    const config = await db.query.systemConfig.findFirst();
    if (!config?.jwtSecret) {
        throw new Error('JWT secret not configured');
    }
    _cachedJwtSecret = new TextEncoder().encode(config.jwtSecret);
    return _cachedJwtSecret;
}

/**
 * Verify authentication from Authorization header or cookie
 * Returns user ID if valid, null otherwise
 */
export async function verifyAuth(req: NextRequest): Promise<string | null> {
    // Check Authorization header first
    const authHeader = req.headers.get('Authorization');
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '');
    } else {
        // Fallback to cookie (for browser requests)
        const accessToken = req.cookies.get('access_token')?.value;
        if (accessToken) {
            token = accessToken;
        }
    }

    if (!token) {
        return null;
    }

    try {
        const secret = await getJwtSecret();
        const { payload } = await jwtVerify(token, secret);
        return payload.sub as string || null;
    } catch {
        return null;
    }
}

/**
 * Return 401 Unauthorized response
 */
export function unauthorized(): NextResponse {
    return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
    );
}

/**
 * Return 400 Bad Request response with message
 */
export function badRequest(message: string): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 400 }
    );
}

/**
 * Return 500 Internal Server Error response
 */
export function serverError(message: string = 'Internal server error'): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 500 }
    );
}
