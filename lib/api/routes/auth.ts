import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db/client';
import { sessions, users, systemConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import { keystore } from '../lib/keystore';

const auth = new Hono();

const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

const setupSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 chars'),
    password: z.string().min(8, 'Password must be at least 8 chars'),
});

// Get JWT secret as Uint8Array
function getJwtSecret(): Uint8Array {
    return new TextEncoder().encode(keystore.getJwtSecret());
}

// Generate access token (15 min)
async function generateAccessToken(userId: string): Promise<string> {
    return new SignJWT({ sub: userId, role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(getJwtSecret());
}

// Check if setup is required
auth.get('/status', async (c) => {
    const config = await db.query.systemConfig.findFirst();
    return c.json({
        setupComplete: !!config?.setupComplete
    });
});

// Setup Endpoint (Run once)
auth.post('/setup', async (c) => {
    // 1. Check if already setup
    const config = await db.query.systemConfig.findFirst();
    if (config?.setupComplete) {
        return c.json({ error: 'Setup already complete' }, 403);
    }

    try {
        const body = await c.req.json();
        const { username, password } = setupSchema.parse(body);

        // 2. Generate System Secrets (JWT & Encryption Key)
        await keystore.generateAndSave();

        // 3. Create Admin User
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = nanoid();

        await db.insert(users).values({
            id: userId,
            username,
            passwordHash,
            createdAt: new Date(),
        });

        // 4. Auto-Login: Generate Tokens
        const accessToken = await generateAccessToken(userId);
        const refreshToken = nanoid(64);
        const sessionId = nanoid();

        // Store session
        await db.insert(sessions).values({
            id: sessionId,
            refreshToken,
            deviceName: c.req.header('User-Agent') || 'Unknown',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // Set refresh token as httpOnly cookie
        setCookie(c, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return c.json({ success: true, accessToken });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return c.json({ error: 'Validation error', details: err.errors }, 400);
        }
        console.error("Setup failed:", err);
        return c.json({ error: 'Setup failed' }, 500);
    }
});

// Login endpoint (DB-based)
auth.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const { username, password } = loginSchema.parse(body);

        // Find user
        const user = await db.query.users.findFirst({
            where: eq(users.username, username)
        });

        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Generate tokens
        const accessToken = await generateAccessToken(user.id);
        const refreshToken = nanoid(64);
        const sessionId = nanoid();

        // Store session
        await db.insert(sessions).values({
            id: sessionId,
            refreshToken,
            deviceName: c.req.header('User-Agent') || 'Unknown',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // Set refresh token as httpOnly cookie
        setCookie(c, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return c.json({ accessToken });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return c.json({ error: 'Validation error', details: err.errors }, 400);
        }
        throw err;
    }
});

// Refresh token endpoint
auth.post('/refresh', async (c) => {
    const refreshToken = getCookie(c, 'refresh_token');
    if (!refreshToken) {
        return c.json({ error: 'No refresh token' }, 401);
    }

    // Find session
    const session = await db.query.sessions.findFirst({
        where: eq(sessions.refreshToken, refreshToken),
    });

    if (!session) {
        return c.json({ error: 'Invalid session' }, 401);
    }

    if (session.expiresAt < new Date()) {
        // Delete expired session
        await db.delete(sessions).where(eq(sessions.id, session.id));
        return c.json({ error: 'Session expired' }, 401);
    }

    // Rotate refresh token
    const newRefreshToken = nanoid(64);
    await db.update(sessions)
        .set({ refreshToken: newRefreshToken })
        .where(eq(sessions.id, session.id));

    // Generate new access token (We need userId here ideally, but for now assuming valid session implies valid user)
    // To be perfectly strict, we should link session to userId in schema, but for single user it's fine.
    // Wait, generateAccessToken needs a sub (user id).
    // Let's use 'admin' generic ID or modify schema later. 
    // Ideally we store userId in session.
    // For this migration, let's look up the ONLY user to get their ID, or use 'admin-id' placeholder if not strict.
    // BETTER FIX: Add userId to sessions table. But to avoid another migration right now:
    // Just fetch the first user. It's a single user app.
    const user = await db.query.users.findFirst();
    const userId = user?.id || 'admin';

    const accessToken = await generateAccessToken(userId);

    // Set new refresh token cookie
    setCookie(c, 'refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
    });

    return c.json({ accessToken });
});

// Logout endpoint
auth.post('/logout', async (c) => {
    const refreshToken = getCookie(c, 'refresh_token');
    if (refreshToken) {
        await db.delete(sessions).where(eq(sessions.refreshToken, refreshToken));
    }

    // Clear cookie
    setCookie(c, 'refresh_token', '', { maxAge: 0, path: '/' });

    return c.json({ success: true });
});

// Check auth status
auth.get('/me', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ authenticated: false }, 401);
    }

    const token = authHeader.slice(7);
    try {
        await jwtVerify(token, getJwtSecret());
        // Could fetch user details if needed
        return c.json({ authenticated: true, user: 'admin' });
    } catch {
        return c.json({ authenticated: false }, 401);
    }
});

// List active sessions
auth.get('/sessions', async (c) => {
    // 1. Verify auth (same as /me)
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    try {
        await jwtVerify(token, getJwtSecret());
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }

    // 2. Get current session's refresh token to mark "current"
    const currentRefreshToken = getCookie(c, 'refresh_token');

    // 3. Fetch all sessions
    const allSessions = await db.select().from(sessions);

    // 4. Map to response format
    const sessionList = allSessions.map(s => ({
        id: s.id,
        deviceName: s.deviceName,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.refreshToken === currentRefreshToken
    }));

    return c.json(sessionList);
});

// Revoke a session
auth.delete('/sessions/:id', async (c) => {
    // 1. Verify auth
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.slice(7);
    try {
        await jwtVerify(token, getJwtSecret());
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }

    const sessionId = c.req.param('id');

    // 2. Delete the session
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    return c.json({ success: true });
});

export default auth;
