import { db } from "@/lib/api/db/client"
import { notes, tasks, canvases, journalEntries, transcripts } from "@/lib/api/db/schema"
import { isNull, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorized, serverError } from "@/lib/api/middleware/nextjs-auth"

// GET /api/tags - Get all unique tags with usage counts
export async function GET(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        // Aggregate tags from all sources
        const tagCounts: Record<string, { count: number; sources: string[] }> = {}

        // Notes tags
        const notesWithTags = await db
            .select({ tags: notes.tags })
            .from(notes)
            .where(isNull(notes.deletedAt))

        notesWithTags.forEach(n => {
            if (n.tags) {
                try {
                    const tagList = JSON.parse(n.tags) as string[]
                    tagList.forEach(tag => {
                        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, sources: [] }
                        tagCounts[tag].count++
                        if (!tagCounts[tag].sources.includes("notes")) {
                            tagCounts[tag].sources.push("notes")
                        }
                    })
                } catch { }
            }
        })

        // Tasks tags
        const tasksWithTags = await db.select({ tags: tasks.tags }).from(tasks)
        tasksWithTags.forEach(t => {
            if (t.tags) {
                try {
                    const tagList = JSON.parse(t.tags) as string[]
                    tagList.forEach(tag => {
                        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, sources: [] }
                        tagCounts[tag].count++
                        if (!tagCounts[tag].sources.includes("tasks")) {
                            tagCounts[tag].sources.push("tasks")
                        }
                    })
                } catch { }
            }
        })

        // Canvases tags
        const canvasesWithTags = await db.select({ tags: canvases.tags }).from(canvases)
        canvasesWithTags.forEach(c => {
            if (c.tags) {
                try {
                    const tagList = JSON.parse(c.tags) as string[]
                    tagList.forEach(tag => {
                        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, sources: [] }
                        tagCounts[tag].count++
                        if (!tagCounts[tag].sources.includes("canvases")) {
                            tagCounts[tag].sources.push("canvases")
                        }
                    })
                } catch { }
            }
        })

        // Journal tags
        const journalWithTags = await db.select({ tags: journalEntries.tags }).from(journalEntries)
        journalWithTags.forEach(j => {
            if (j.tags) {
                try {
                    const tagList = JSON.parse(j.tags) as string[]
                    tagList.forEach(tag => {
                        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, sources: [] }
                        tagCounts[tag].count++
                        if (!tagCounts[tag].sources.includes("journal")) {
                            tagCounts[tag].sources.push("journal")
                        }
                    })
                } catch { }
            }
        })

        // Transcripts tags
        const transcriptsWithTags = await db
            .select({ tags: transcripts.tags })
            .from(transcripts)
            .where(isNull(transcripts.deletedAt))

        transcriptsWithTags.forEach(t => {
            if (t.tags) {
                try {
                    const tagList = JSON.parse(t.tags) as string[]
                    tagList.forEach(tag => {
                        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, sources: [] }
                        tagCounts[tag].count++
                        if (!tagCounts[tag].sources.includes("transcripts")) {
                            tagCounts[tag].sources.push("transcripts")
                        }
                    })
                } catch { }
            }
        })

        // Convert to array and sort by count
        const tagsArray = Object.entries(tagCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)

        return NextResponse.json(tagsArray)
    } catch (error) {
        console.error("Failed to fetch tags:", error)
        return serverError("Failed to fetch tags")
    }
}
