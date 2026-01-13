import type { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { getCookie } from 'hono/cookie';

// Get JWT secret as Uint8Array
import { keystore } from '../lib/keystore';

// Get JWT secret as Uint8Array
function getJwtSecret(): Uint8Array {
    return new TextEncoder().encode(keystore.getJwtSecret());
}

export async function authMiddleware(c: Context, next: Next) {
    // Skip auth for public routes
    const path = c.req.path;
    if (path.startsWith('/api/v1/auth') || path.startsWith('/api/v1/public') || path.startsWith('/api/v1/health')) {
        return next();
    }

    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');
    const cookieToken = getCookie(c, 'access_token');

    let token = '';
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (queryToken) {
        token = queryToken;
    } else if (cookieToken) {
        token = cookieToken;
    }

    if (!token) {
        return c.json({ error: 'Missing or invalid authorization' }, 401);
    }
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());

        // Attach user info to context
        c.set('user', { sub: payload.sub });

        return next();
    } catch (err) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
}
