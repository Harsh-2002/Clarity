import { db } from "@/lib/api/db/client"
import { journalEntries } from "@/lib/api/db/schema"
import { eq, desc, gte, lte, and } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

// Validation schemas
const createEntrySchema = z.object({
    id: z.string().min(1),
    content: z.string().min(1).max(10000),
    mood: z.enum(["great", "good", "okay", "bad"]).optional().nullable(),
    tags: z.string().optional(), // JSON array string
})

// GET /api/journal - List entries (with optional date filter)
export async function GET(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date") // YYYY-MM-DD format
    const limit = parseInt(searchParams.get("limit") || "50")

    try {
        let query = db.select().from(journalEntries)

        if (date) {
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const entries = await db
                .select()
                .from(journalEntries)
                .where(and(
                    gte(journalEntries.createdAt, startOfDay),
                    lte(journalEntries.createdAt, endOfDay)
                ))
                .orderBy(desc(journalEntries.createdAt))
                .limit(limit)

            return NextResponse.json(entries)
        }

        const entries = await db
            .select()
            .from(journalEntries)
            .orderBy(desc(journalEntries.createdAt))
            .limit(limit)

        return NextResponse.json(entries)
    } catch (error) {
        console.error("Failed to fetch journal entries:", error)
        return serverError("Failed to fetch journal entries")
    }
}

// POST /api/journal - Create new entry
export async function POST(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const body = await req.json()

        const result = createEntrySchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid input: " + result.error.message)
        }

        const { id, content, mood, tags } = result.data

        await db.insert(journalEntries).values({
            id,
            content,
            mood: mood || null,
            tags: tags || null,
            createdAt: new Date(),
        })

        return NextResponse.json({ success: true, id })
    } catch (error) {
        console.error("Failed to create journal entry:", error)
        return serverError("Failed to create journal entry")
    }
}

// DELETE /api/journal - Delete entry
export async function DELETE(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
        return badRequest("ID required")
    }

    try {
        await db.delete(journalEntries).where(eq(journalEntries.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete journal entry:", error)
        return serverError("Failed to delete journal entry")
    }
}
