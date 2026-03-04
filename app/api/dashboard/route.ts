import { NextResponse } from 'next/server'
import { verifyAuth, unauthorized } from '@/lib/api/middleware/nextjs-auth'
import { db } from '@/lib/api/db/client'
import { notes, transcripts, tasks, canvases, journalEntries, bookmarks } from '@/lib/api/db/schema'
import { isNull, and, eq, gte, desc, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const todayTs = now

    // Run all queries in parallel — these are cheap COUNT/limited SELECTs on SQLite
    const [
        noteCountRows,
        transcriptCountRows,
        taskStatsRows,
        canvasCountRows,
        journalCountRows,
        bookmarkCountRows,
        recentNotes,
        upcomingTasks,
        recentTranscripts,
        recentCanvases,
    ] = await Promise.all([
        // Counts
        db.select({ count: sql<number>`count(*)` }).from(notes).where(isNull(notes.deletedAt)),
        db.select({ count: sql<number>`count(*)` }).from(transcripts).where(isNull(transcripts.deletedAt)),
        db.select({
            pending: sql<number>`sum(case when completed = 0 then 1 else 0 end)`,
            completed: sql<number>`sum(case when completed = 1 then 1 else 0 end)`,
        }).from(tasks).where(isNull(tasks.deletedAt)),
        db.select({ count: sql<number>`count(*)` }).from(canvases).where(isNull(canvases.deletedAt)),
        db.select({ count: sql<number>`count(*)` }).from(journalEntries).where(isNull(journalEntries.deletedAt)),
        db.select({ count: sql<number>`count(*)` }).from(bookmarks).where(isNull(bookmarks.deletedAt)),

        // Recent items (without heavy content fields)
        db.select({
            id: notes.id,
            title: notes.title,
            tags: notes.tags,
            createdAt: notes.createdAt,
            updatedAt: notes.updatedAt,
        }).from(notes).where(isNull(notes.deletedAt)).orderBy(desc(notes.updatedAt)).limit(3),

        // Upcoming tasks (due today or later, not completed)
        db.select({
            id: tasks.id,
            text: tasks.text,
            completed: tasks.completed,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            tags: tasks.tags,
        }).from(tasks).where(
            and(isNull(tasks.deletedAt), eq(tasks.completed, false), gte(tasks.dueDate, todayTs))
        ).orderBy(tasks.dueDate).limit(5),

        // Recent transcripts (without full text)
        db.select({
            id: transcripts.id,
            provider: transcripts.provider,
            model: transcripts.model,
            tags: transcripts.tags,
            createdAt: transcripts.createdAt,
            updatedAt: transcripts.updatedAt,
            text: sql<string>`substr(${transcripts.text}, 1, 200)`,
        }).from(transcripts).where(isNull(transcripts.deletedAt)).orderBy(desc(transcripts.updatedAt)).limit(3),

        // Recent canvases (without heavy data blob)
        db.select({
            id: canvases.id,
            name: canvases.name,
            thumbnail: canvases.thumbnail,
            createdAt: canvases.createdAt,
            updatedAt: canvases.updatedAt,
        }).from(canvases).where(isNull(canvases.deletedAt)).orderBy(desc(canvases.updatedAt)).limit(3),
    ])

    // Extract counts from result rows
    const noteCount = noteCountRows[0].count
    const transcriptCount = transcriptCountRows[0].count
    const taskStats = {
        pending: taskStatsRows[0].pending || 0,
        completed: taskStatsRows[0].completed || 0,
    }
    const canvasCount = canvasCountRows[0].count
    const journalCount = journalCountRows[0].count
    const bookmarkCount = bookmarkCountRows[0].count

    // Parse tags for transcripts
    const parsedTranscripts = recentTranscripts.map((t: typeof recentTranscripts[number]) => {
        let tags: string[] = []
        if (t.tags) {
            try { tags = JSON.parse(t.tags) } catch {}
        }
        return { ...t, tags }
    })

    return NextResponse.json({
        stats: {
            notes: noteCount,
            transcripts: transcriptCount,
            pendingTasks: taskStats.pending,
            completedTasks: taskStats.completed,
            canvases: canvasCount,
            journals: journalCount,
            bookmarks: bookmarkCount,
        },
        recentNotes,
        upcomingTasks,
        recentTranscripts: parsedTranscripts,
        recentCanvases,
    })
}
