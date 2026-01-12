import { db } from "@/lib/api/db/client"
import { noteLinks, notes } from "@/lib/api/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorized, serverError } from "@/lib/api/middleware/nextjs-auth"

// GET /api/notes/[id]/backlinks - Get all notes that link to this note
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        // Get all links where this note is the target
        const links = await db
            .select({
                sourceNoteId: noteLinks.sourceNoteId,
                createdAt: noteLinks.createdAt,
            })
            .from(noteLinks)
            .where(eq(noteLinks.targetNoteId, id))

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
                    .limit(1)

                return sourceNote[0] || null
            })
        )

        // Filter out nulls (deleted notes)
        const validBacklinks = backlinks.filter(Boolean)

        return NextResponse.json({
            count: validBacklinks.length,
            backlinks: validBacklinks,
        })
    } catch (error) {
        console.error("Failed to fetch backlinks:", error)
        return serverError("Failed to fetch backlinks")
    }
}
