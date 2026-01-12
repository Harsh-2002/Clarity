import { db } from "@/lib/api/db/client"
import { notes, tasks, canvases, journalEntries, transcripts } from "@/lib/api/db/schema"
import { isNull, like, or } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

const searchSchema = z.object({
    q: z.string().min(1).max(200),
    tag: z.string().optional(),
    type: z.enum(["all", "notes", "tasks", "canvases", "journal", "transcripts"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
})

// GET /api/search - Global search across all content types
export async function GET(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""
    const tag = searchParams.get("tag")
    const type = searchParams.get("type") || "all"
    const limit = parseInt(searchParams.get("limit") || "20")

    if (!query && !tag) {
        return badRequest("Search query or tag required")
    }

    try {
        const results: {
            type: string
            id: string
            title: string
            preview: string
            tags: string[]
            updatedAt: Date
        }[] = []

        const searchTerm = `%${query}%`

        // Search Notes
        if (type === "all" || type === "notes") {
            const noteResults = await db
                .select({
                    id: notes.id,
                    title: notes.title,
                    content: notes.content,
                    tags: notes.tags,
                    updatedAt: notes.updatedAt,
                })
                .from(notes)
                .where(isNull(notes.deletedAt))
                .limit(limit)

            noteResults
                .filter(n => {
                    const matchesQuery = !query ||
                        n.title.toLowerCase().includes(query.toLowerCase()) ||
                        n.content.toLowerCase().includes(query.toLowerCase())
                    const matchesTag = !tag ||
                        (n.tags && JSON.parse(n.tags).includes(tag))
                    return matchesQuery && matchesTag
                })
                .forEach(n => {
                    results.push({
                        type: "note",
                        id: n.id,
                        title: n.title,
                        preview: n.content.slice(0, 100),
                        tags: n.tags ? JSON.parse(n.tags) : [],
                        updatedAt: n.updatedAt,
                    })
                })
        }

        // Search Tasks
        if (type === "all" || type === "tasks") {
            const taskResults = await db.select().from(tasks).limit(limit)

            taskResults
                .filter(t => {
                    const matchesQuery = !query ||
                        t.text.toLowerCase().includes(query.toLowerCase())
                    const matchesTag = !tag ||
                        (t.tags && JSON.parse(t.tags).includes(tag))
                    return matchesQuery && matchesTag
                })
                .forEach(t => {
                    results.push({
                        type: "task",
                        id: t.id,
                        title: t.text,
                        preview: t.completed ? "✓ Completed" : "○ Pending",
                        tags: t.tags ? JSON.parse(t.tags) : [],
                        updatedAt: t.updatedAt,
                    })
                })
        }

        // Search Canvases
        if (type === "all" || type === "canvases") {
            const canvasResults = await db.select().from(canvases).limit(limit)

            canvasResults
                .filter(c => {
                    const matchesQuery = !query ||
                        c.name.toLowerCase().includes(query.toLowerCase())
                    const matchesTag = !tag ||
                        (c.tags && JSON.parse(c.tags).includes(tag))
                    return matchesQuery && matchesTag
                })
                .forEach(c => {
                    results.push({
                        type: "canvas",
                        id: c.id,
                        title: c.name,
                        preview: "Whiteboard",
                        tags: c.tags ? JSON.parse(c.tags) : [],
                        updatedAt: c.updatedAt,
                    })
                })
        }

        // Search Journal
        if (type === "all" || type === "journal") {
            const journalResults = await db.select().from(journalEntries).limit(limit)

            journalResults
                .filter(j => {
                    const matchesQuery = !query ||
                        j.content.toLowerCase().includes(query.toLowerCase())
                    const matchesTag = !tag ||
                        (j.tags && JSON.parse(j.tags).includes(tag))
                    return matchesQuery && matchesTag
                })
                .forEach(j => {
                    results.push({
                        type: "journal",
                        id: j.id,
                        title: new Date(j.createdAt).toLocaleDateString(),
                        preview: j.content.slice(0, 100),
                        tags: j.tags ? JSON.parse(j.tags) : [],
                        updatedAt: j.createdAt,
                    })
                })
        }

        // Search Transcripts
        if (type === "all" || type === "transcripts") {
            const transcriptResults = await db
                .select()
                .from(transcripts)
                .where(isNull(transcripts.deletedAt))
                .limit(limit)

            transcriptResults
                .filter(t => {
                    const matchesQuery = !query ||
                        t.text.toLowerCase().includes(query.toLowerCase()) ||
                        (t.fineTunedText && t.fineTunedText.toLowerCase().includes(query.toLowerCase()))
                    const matchesTag = !tag ||
                        (t.tags && JSON.parse(t.tags).includes(tag))
                    return matchesQuery && matchesTag
                })
                .forEach(t => {
                    results.push({
                        type: "transcript",
                        id: t.id,
                        title: `Transcript ${new Date(t.createdAt).toLocaleDateString()}`,
                        preview: t.text.slice(0, 100),
                        tags: t.tags ? JSON.parse(t.tags) : [],
                        updatedAt: t.updatedAt,
                    })
                })
        }

        // Sort by updatedAt desc
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        return NextResponse.json(results.slice(0, limit))
    } catch (error) {
        console.error("Search failed:", error)
        return serverError("Search failed")
    }
}
