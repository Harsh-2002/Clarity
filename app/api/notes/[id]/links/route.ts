import { db } from "@/lib/api/db/client"
import { noteLinks, notes } from "@/lib/api/db/schema"
import { eq, and } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

const updateLinksSchema = z.object({
    content: z.string(),
})

// Regex to find [[Note Title]] links
const LINK_REGEX = /\[\[([^\]]+)\]\]/g

// POST /api/notes/[id]/links - Update links for a note based on its content
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id: sourceNoteId } = await params

    try {
        const body = await req.json()
        const result = updateLinksSchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid content")
        }

        const { content } = result.data

        // Extract all [[Note Title]] references
        const matches = [...content.matchAll(LINK_REGEX)]
        const linkedTitles = matches.map(m => m[1].trim())

        // Delete existing links from this note
        await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, sourceNoteId))

        if (linkedTitles.length === 0) {
            return NextResponse.json({ success: true, linksCreated: 0 })
        }

        // Find notes by title and create links
        let linksCreated = 0
        for (const title of linkedTitles) {
            const targetNote = await db
                .select({ id: notes.id })
                .from(notes)
                .where(eq(notes.title, title))
                .limit(1)

            if (targetNote.length > 0 && targetNote[0].id !== sourceNoteId) {
                // Check if link already exists (shouldn't since we deleted)
                const existing = await db
                    .select({ id: noteLinks.id })
                    .from(noteLinks)
                    .where(and(
                        eq(noteLinks.sourceNoteId, sourceNoteId),
                        eq(noteLinks.targetNoteId, targetNote[0].id)
                    ))
                    .limit(1)

                if (existing.length === 0) {
                    await db.insert(noteLinks).values({
                        sourceNoteId,
                        targetNoteId: targetNote[0].id,
                        createdAt: new Date(),
                    })
                    linksCreated++
                }
            }
        }

        return NextResponse.json({ success: true, linksCreated })
    } catch (error) {
        console.error("Failed to update links:", error)
        return serverError("Failed to update links")
    }
}
