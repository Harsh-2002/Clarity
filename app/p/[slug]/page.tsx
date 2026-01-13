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

    const [note] = await db.select({
        title: notes.title,
        content: notes.content,
    })
        .from(notes)
        .where(and(
            eq(notes.publishedSlug, slug),
            eq(notes.isPublished, true)
        ))
        .limit(1)

    if (!note) {
        return { title: "Note Not Found" }
    }

    // Extract description from content (first paragraph text)
    let description = "A note published on Clarity"
    let ogImage: string | undefined

    try {
        const json = JSON.parse(note.content || "{}")

        // Extract first paragraph text for description
        const extractText = (content: any[]): string => {
            for (const node of content || []) {
                if (node.type === 'paragraph' && node.content) {
                    const text = node.content
                        .filter((n: any) => n.type === 'text')
                        .map((n: any) => n.text)
                        .join('')
                    if (text.trim()) return text.trim()
                }
                if (node.content) {
                    const text = extractText(node.content)
                    if (text) return text
                }
            }
            return ""
        }

        // Extract first image for OG image  
        const extractFirstImage = (content: any[]): string | undefined => {
            for (const node of content || []) {
                if (node.type === 'image' && node.attrs?.src) {
                    return node.attrs.src
                }
                if (node.content) {
                    const img = extractFirstImage(node.content)
                    if (img) return img
                }
            }
            return undefined
        }

        if (json.content) {
            const extractedText = extractText(json.content)
            if (extractedText) {
                // Truncate to ~160 chars for meta description
                description = extractedText.length > 160
                    ? extractedText.slice(0, 157) + "..."
                    : extractedText
            }
            ogImage = extractFirstImage(json.content)
        }
    } catch (e) {
        // Ignore parsing errors
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clarity.app'

    return {
        title: note.title,
        description,
        openGraph: {
            title: note.title,
            description,
            type: 'article',
            url: `${baseUrl}/p/${slug}`,
            ...(ogImage && {
                images: [{
                    url: ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`,
                    width: 1200,
                    height: 630,
                    alt: note.title,
                }]
            }),
            siteName: 'Clarity',
        },
        twitter: {
            card: ogImage ? 'summary_large_image' : 'summary',
            title: note.title,
            description,
            ...(ogImage && {
                images: [ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`]
            }),
        },
    }
}
