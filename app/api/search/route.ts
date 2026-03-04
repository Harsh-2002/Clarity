import { db } from "@/lib/api/db/client"
import { notes, tasks, canvases, journalEntries, transcripts } from "@/lib/api/db/schema"
import { isNull, like, or, and, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

function safeJsonParse(value: string | null): string[] {
    if (!value) return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

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
            const conditions = [isNull(notes.deletedAt)]
            if (query) {
                conditions.push(
                    or(
                        like(notes.title, searchTerm),
                        like(notes.content, searchTerm)
                    )!
                )
            }
            if (tag) {
                conditions.push(like(notes.tags, `%"${tag}"%`))
            }

            const noteResults = await db
                .select({
                    id: notes.id,
                    title: notes.title,
                    content: notes.content,
                    tags: notes.tags,
                    updatedAt: notes.updatedAt,
                })
                .from(notes)
                .where(and(...conditions))
                .limit(limit)

            noteResults.forEach((n: any) => {
                results.push({
                    type: "note",
                    id: n.id,
                    title: n.title,
                    preview: n.content.slice(0, 100),
                    tags: safeJsonParse(n.tags),
                    updatedAt: n.updatedAt,
                })
            })
        }

        // Search Tasks
        if (type === "all" || type === "tasks") {
            const conditions = []
            if (query) {
                conditions.push(like(tasks.text, searchTerm))
            }
            if (tag) {
                conditions.push(like(tasks.tags, `%"${tag}"%`))
            }

            const taskResults = await db
                .select()
                .from(tasks)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .limit(limit)

            taskResults.forEach((t: any) => {
                results.push({
                    type: "task",
                    id: t.id,
                    title: t.text,
                    preview: t.completed ? "✓ Completed" : "○ Pending",
                    tags: safeJsonParse(t.tags),
                    updatedAt: t.updatedAt,
                })
            })
        }

        // Search Canvases
        if (type === "all" || type === "canvases") {
            const conditions = []
            if (query) {
                conditions.push(like(canvases.name, searchTerm))
            }
            if (tag) {
                conditions.push(like(canvases.tags, `%"${tag}"%`))
            }

            const canvasResults = await db
                .select()
                .from(canvases)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .limit(limit)

            canvasResults.forEach((c: any) => {
                results.push({
                    type: "canvas",
                    id: c.id,
                    title: c.name,
                    preview: "Whiteboard",
                    tags: safeJsonParse(c.tags),
                    updatedAt: c.updatedAt,
                })
            })
        }

        // Search Journal
        if (type === "all" || type === "journal") {
            const conditions = []
            if (query) {
                conditions.push(like(journalEntries.content, searchTerm))
            }
            if (tag) {
                conditions.push(like(journalEntries.tags, `%"${tag}"%`))
            }

            const journalResults = await db
                .select()
                .from(journalEntries)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .limit(limit)

            journalResults.forEach((j: any) => {
                results.push({
                    type: "journal",
                    id: j.id,
                    title: new Date(j.createdAt).toLocaleDateString(),
                    preview: j.content.slice(0, 100),
                    tags: safeJsonParse(j.tags),
                    updatedAt: j.createdAt,
                })
            })
        }

        // Search Transcripts
        if (type === "all" || type === "transcripts") {
            const conditions = [isNull(transcripts.deletedAt)]
            if (query) {
                conditions.push(
                    or(
                        like(transcripts.text, searchTerm),
                        like(transcripts.fineTunedText, searchTerm)
                    )!
                )
            }
            if (tag) {
                conditions.push(like(transcripts.tags, `%"${tag}"%`))
            }

            const transcriptResults = await db
                .select()
                .from(transcripts)
                .where(and(...conditions))
                .limit(limit)

            transcriptResults.forEach((t: any) => {
                results.push({
                    type: "transcript",
                    id: t.id,
                    title: `Transcript ${new Date(t.createdAt).toLocaleDateString()}`,
                    preview: t.text.slice(0, 100),
                    tags: safeJsonParse(t.tags),
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
