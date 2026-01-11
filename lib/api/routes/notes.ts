import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { notes, syncLog } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const notesRoutes = new Hono();

const noteSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    content: z.string(),
    version: z.number().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
});

// List all notes
notesRoutes.get('/', async (c) => {
    const allNotes = await db.query.notes.findMany({
        where: isNull(notes.deletedAt),
        orderBy: (notes, { desc }) => [desc(notes.updatedAt)],
    });
    return c.json(allNotes);
});

// Get single note
notesRoutes.get('/:id', async (c) => {
    const noteId = c.req.param('id');
    const note = await db.query.notes.findFirst({
        where: and(eq(notes.id, noteId), isNull(notes.deletedAt)),
    });

    if (!note) {
        return c.json({ error: 'Note not found' }, 404);
    }

    return c.json(note);
});

// Create note
notesRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const data = noteSchema.parse(body);

    const noteId = data.id || nanoid();
    const now = new Date();

    await db.insert(notes).values({
        id: noteId,
        title: data.title,
        content: data.content,
        version: 1,
        createdAt: now,
        updatedAt: now,
    });

    // Log sync event
    await db.insert(syncLog).values({
        entityType: 'note',
        entityId: noteId,
        operation: 'create',
        version: 1,
        timestamp: now,
    });

    return c.json({ id: noteId, version: 1, synced: true }, 201);
});

// Update note
notesRoutes.put('/:id', async (c) => {
    const noteId = c.req.param('id');
    const body = await c.req.json();
    const data = noteSchema.parse(body);

    // Get current note
    const existing = await db.query.notes.findFirst({
        where: eq(notes.id, noteId),
    });

    if (!existing) {
        return c.json({ error: 'Note not found' }, 404);
    }

    const newVersion = (existing.version || 0) + 1;
    const now = new Date();

    await db.update(notes)
        .set({
            title: data.title,
            content: data.content,
            version: newVersion,
            updatedAt: now,
        })
        .where(eq(notes.id, noteId));

    // Log sync event
    await db.insert(syncLog).values({
        entityType: 'note',
        entityId: noteId,
        operation: 'update',
        version: newVersion,
        timestamp: now,
    });

    return c.json({ id: noteId, version: newVersion, synced: true });
});

// Delete note (soft delete)
notesRoutes.delete('/:id', async (c) => {
    const noteId = c.req.param('id');
    const now = new Date();

    const existing = await db.query.notes.findFirst({
        where: eq(notes.id, noteId),
    });

    if (!existing) {
        return c.json({ error: 'Note not found' }, 404);
    }

    const newVersion = (existing.version || 0) + 1;

    await db.update(notes)
        .set({
            deletedAt: now,
            version: newVersion,
            updatedAt: now,
        })
        .where(eq(notes.id, noteId));

    // Log sync event
    await db.insert(syncLog).values({
        entityType: 'note',
        entityId: noteId,
        operation: 'delete',
        version: newVersion,
        timestamp: now,
    });

    return c.json({ success: true });
});

// Publish note
notesRoutes.post('/:id/publish', async (c) => {
    const noteId = c.req.param('id');
    const slug = nanoid(10);

    const existing = await db.query.notes.findFirst({
        where: eq(notes.id, noteId),
    });

    if (!existing) {
        return c.json({ error: 'Note not found' }, 404);
    }

    await db.update(notes)
        .set({
            isPublished: true,
            publishedSlug: slug,
            updatedAt: new Date(),
        })
        .where(eq(notes.id, noteId));

    return c.json({ slug, url: `/p/${slug}` });
});

// Unpublish note
notesRoutes.delete('/:id/publish', async (c) => {
    const noteId = c.req.param('id');

    await db.update(notes)
        .set({
            isPublished: false,
            publishedSlug: null,
            updatedAt: new Date(),
        })
        .where(eq(notes.id, noteId));

    return c.json({ success: true });
});

export default notesRoutes;
