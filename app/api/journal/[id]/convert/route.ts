import { db } from "@/lib/api/db/client"
import { journalEntries, tasks, notes } from "@/lib/api/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { nanoid } from "nanoid"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

// Validation schema
const convertSchema = z.object({
    type: z.enum(["task", "note"]),
    title: z.string().min(1).max(200).optional(),
})

// POST /api/journal/[id]/convert - Convert entry to task or note
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        // Get the journal entry
        const entry = await db
            .select()
            .from(journalEntries)
            .where(eq(journalEntries.id, id))
            .limit(1)

        if (entry.length === 0) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 })
        }

        const journalEntry = entry[0]
        const body = await req.json()

        const result = convertSchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid input")
        }

        const { type, title } = result.data
        const newId = nanoid()

        if (type === "task") {
            // Create task from journal entry
            await db.insert(tasks).values({
                id: newId,
                text: title || journalEntry.content.slice(0, 200),
                completed: false,
                priority: "medium",
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Update journal entry to mark as converted
            await db.update(journalEntries)
                .set({ convertedTo: `task:${newId}` })
                .where(eq(journalEntries.id, id))

            return NextResponse.json({ success: true, type: "task", id: newId })
        } else if (type === "note") {
            // Create note from journal entry
            await db.insert(notes).values({
                id: newId,
                title: title || `Journal: ${new Date(journalEntry.createdAt).toLocaleDateString()}`,
                content: JSON.stringify({
                    type: "doc",
                    content: [
                        {
                            type: "paragraph",
                            content: [{ type: "text", text: journalEntry.content }]
                        }
                    ]
                }),
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            // Update journal entry to mark as converted
            await db.update(journalEntries)
                .set({ convertedTo: `note:${newId}` })
                .where(eq(journalEntries.id, id))

            return NextResponse.json({ success: true, type: "note", id: newId })
        }

        return badRequest("Invalid type")
    } catch (error) {
        console.error("Failed to convert journal entry:", error)
        return serverError("Failed to convert journal entry")
    }
}
