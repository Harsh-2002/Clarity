import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { notes, syncLog, noteLinks } from '../db/schema';
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

const updateLinksSchema = z.object({
    content: z.string(),
})

// Regex to find [[Note Title]] links
const LINK_REGEX = /\[\[([^\]]+)\]\]/g

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

// Update links for a note based on its content
notesRoutes.post('/:id/links', async (c) => {
    const noteId = c.req.param('id');
    const body = await c.req.json();
    const result = updateLinksSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: 'Invalid content' }, 400);
    }

    const { content } = result.data;

    // Extract all [[Note Title]] references
    const matches = [...content.matchAll(LINK_REGEX)];
    const linkedTitles = matches.map(m => m[1].trim());

    // Delete existing links from this note
    await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, noteId));

    if (linkedTitles.length === 0) {
        return c.json({ success: true, linksCreated: 0 });
    }

    // Find notes by title and create links
    let linksCreated = 0;
    for (const title of linkedTitles) {
        // Use simpler query to find potential targets
        const targets = await db
            .select({ id: notes.id })
            .from(notes)
            .where(eq(notes.title, title))
            .limit(1);

        if (targets.length > 0 && targets[0].id !== noteId) {
            const targetId = targets[0].id;

            // Should be clean insert since we did delete above, but be safe
            // Check if link already exists (shouldn't since we deleted)
            const existing = await db
                .select({ id: noteLinks.id })
                .from(noteLinks)
                .where(and(
                    eq(noteLinks.sourceNoteId, noteId),
                    eq(noteLinks.targetNoteId, targetId)
                ))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(noteLinks).values({
                    sourceNoteId: noteId,
                    targetNoteId: targetId,
                    createdAt: new Date(),
                });
                linksCreated++;
            }
        }
    }

    return c.json({ success: true, linksCreated });
});

// Get all notes that link to this note (Backlinks)
notesRoutes.get('/:id/backlinks', async (c) => {
    const noteId = c.req.param('id');

    // Get all links where this note is the target
    const links = await db
        .select({
            sourceNoteId: noteLinks.sourceNoteId,
            createdAt: noteLinks.createdAt,
        })
        .from(noteLinks)
        .where(eq(noteLinks.targetNoteId, noteId));

    // Get source note details
    const backlinks = await Promise.all(
        links.map(async (link) => {
            const sourceNote = await db
                .select({
                    id: notes.id,
                    title: notes.title,
                    updatedAt: notes.updatedAt,
                })
                .from(notes)
                .where(eq(notes.id, link.sourceNoteId))
                .limit(1);

            return sourceNote[0] || null;
        })
    );

    // Filter out nulls (deleted notes)
    const validBacklinks = backlinks.filter(Boolean);

    return c.json({
        count: validBacklinks.length,
        backlinks: validBacklinks,
    });
});

// Helper to slugify custom slugs
function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces with hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

// Publish/Unpublish note (Consolidated logic)
notesRoutes.post('/:id/publish', async (c) => {
    const noteId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const customSlug = body.slug ? slugify(body.slug) : null;
    const action = body.action;

    // Get current note
    const existing = await db.query.notes.findFirst({
        where: eq(notes.id, noteId),
    });

    if (!existing) {
        return c.json({ error: 'Note not found' }, 404);
    }

    // If custom slug provided, check for uniqueness
    if (customSlug && customSlug !== existing.publishedSlug) {
        const conflict = await db.query.notes.findFirst({
            where: eq(notes.publishedSlug, customSlug)
        });
        if (conflict && conflict.id !== noteId) {
            return c.json({ error: 'This slug is already taken. Please choose another.' }, 400);
        }
    }

    const now = new Date();

    if (action === 'unpublish') {
        await db.update(notes).set({
            isPublished: false,
            updatedAt: now,
        }).where(eq(notes.id, noteId));

        return c.json({
            success: true,
            isPublished: false,
            slug: existing.publishedSlug,
            viewCount: existing.viewCount || 0
        });
    } else if (action === 'updateSlug' && customSlug) {
        await db.update(notes).set({
            publishedSlug: customSlug,
            updatedAt: now,
        }).where(eq(notes.id, noteId));

        return c.json({
            success: true,
            isPublished: existing.isPublished,
            slug: customSlug,
            viewCount: existing.viewCount || 0
        });
    } else {
        // Default: Publish - use title-based slug as default
        const titleSlug = slugify(existing.title);
        const slug = customSlug || existing.publishedSlug || (titleSlug.length >= 3 ? titleSlug : nanoid(10));

        await db.update(notes).set({
            isPublished: true,
            publishedSlug: slug,
            updatedAt: now,
        }).where(eq(notes.id, noteId));

        return c.json({
            success: true,
            isPublished: true,
            slug,
            viewCount: existing.viewCount || 0,
            url: `/p/${slug}`
        });
    }
});

// Deprecated DELETE route (kept if legacy calls use it, but POST handles unpublish now)
notesRoutes.delete('/:id/publish', async (c) => {
    const noteId = c.req.param('id');
    const now = new Date();

    await db.update(notes)
        .set({
            isPublished: false,
            updatedAt: now,
        })
        .where(eq(notes.id, noteId));

    return c.json({ success: true });
});

export default notesRoutes;

