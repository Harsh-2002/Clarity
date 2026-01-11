import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'

import authRoutes from './routes/auth'
import notesRoutes from './routes/notes'
import transcriptsRoutes from './routes/transcripts'
import settingsRoutes from './routes/settings'
import providersRoutes from './routes/providers'
import storageRoutes from './routes/storage'
import syncRoutes from './routes/sync'
import publicRoutes from './routes/public'
import aiRoutes from './routes/ai'

const app = new Hono().basePath('/api/v1')

import { keystore } from './lib/keystore';

app.use('*', logger())
app.use('*', cors())

// Initialize Keystore on startup (lazy load)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
    keystore.init().catch(err => {
        // Silent during build or first run
        if (process.env.NEXT_PHASE !== 'phase-production-build') {
            console.error("Keystore Init Check:", err.message);
        }
    });
}

// Auth Middleware (skips /auth and /public internally)
app.use('*', authMiddleware)

app.route('/auth', authRoutes)
app.route('/notes', notesRoutes)
app.route('/transcripts', transcriptsRoutes)
app.route('/settings', settingsRoutes)
app.route('/providers', providersRoutes)
app.route('/storage', storageRoutes)
app.route('/sync', syncRoutes)
app.route('/sync', syncRoutes)
app.route('/public', publicRoutes)
app.route('/ai', aiRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Error handler
app.onError((err, c) => {
    console.error('API Error:', err)
    return c.json({ error: err.message || 'Internal server error' }, 500)
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

export default app
