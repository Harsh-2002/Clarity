import { db } from "@/lib/api/db/client"
import { notes } from "@/lib/api/db/schema"
import { eq, and, isNull, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import { PublishedNoteContent } from "@/components/notes/published-note-content"

interface Props {
    params: Promise<{ slug: string }>
}

export default async function PublishedNotePage({ params }: Props) {
    const { slug } = await params

    // Fetch the published note
    const [note] = await db.select()
        .from(notes)
        .where(and(
            eq(notes.publishedSlug, slug),
            eq(notes.isPublished, true),
            isNull(notes.deletedAt)
        ))
        .limit(1)

    if (!note) {
        notFound()
    }

    // Increment view count (async, don't block render)
    db.update(notes)
        .set({ viewCount: sql`${notes.viewCount} + 1` })
        .where(eq(notes.id, note.id))
        .then(() => { })
        .catch(() => { })

    return <PublishedNoteContent note={note} />
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params

    const [note] = await db.select({ title: notes.title })
        .from(notes)
        .where(and(
            eq(notes.publishedSlug, slug),
            eq(notes.isPublished, true)
        ))
        .limit(1)

    if (!note) {
        return { title: "Note Not Found" }
    }

    return {
        title: note.title,
        description: `A note published on Clarity`,
    }
}
