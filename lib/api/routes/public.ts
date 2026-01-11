import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { db } from '../db/client';
import { notes } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const publicRoutes = new Hono();

// In-memory subscribers for SSE
const subscribers = new Map<string, Set<(data: string) => void>>();

// Get published note
publicRoutes.get('/:slug', async (c) => {
    const slug = c.req.param('slug');

    const note = await db.query.notes.findFirst({
        where: and(
            eq(notes.publishedSlug, slug),
            eq(notes.isPublished, true)
        ),
    });

    if (!note) {
        return c.json({ error: 'Note not found' }, 404);
    }

    return c.json({
        title: note.title,
        content: note.content,
        updatedAt: note.updatedAt,
    });
});

// SSE stream for live updates
publicRoutes.get('/:slug/stream', async (c) => {
    const slug = c.req.param('slug');

    // Verify note exists and is published
    const note = await db.query.notes.findFirst({
        where: and(
            eq(notes.publishedSlug, slug),
            eq(notes.isPublished, true)
        ),
    });

    if (!note) {
        return c.json({ error: 'Note not found' }, 404);
    }

    return streamSSE(c, async (stream) => {
        const callback = (data: string) => {
            stream.writeSSE({ data });
        };

        // Subscribe
        if (!subscribers.has(slug)) {
            subscribers.set(slug, new Set());
        }
        subscribers.get(slug)!.add(callback);

        // Send initial ping
        await stream.writeSSE({ event: 'connected', data: 'ok' });

        // Keep alive every 30 seconds
        const keepAlive = setInterval(() => {
            stream.writeSSE({ event: 'ping', data: '' });
        }, 30000);

        // Cleanup on disconnect
        stream.onAbort(() => {
            subscribers.get(slug)?.delete(callback);
            if (subscribers.get(slug)?.size === 0) {
                subscribers.delete(slug);
            }
            clearInterval(keepAlive);
        });

        // Block until client disconnects
        await new Promise(() => { });
    });
});

// Broadcast update to subscribers (exported for use in notes.ts)
export function broadcastNoteUpdate(slug: string, content: string) {
    const subs = subscribers.get(slug);
    if (subs) {
        for (const callback of subs) {
            callback(JSON.stringify({ content, updatedAt: Date.now() }));
        }
    }
}

export default publicRoutes;
