"use server"

import { db } from "@/lib/api/db/client"
import { notes } from "@/lib/api/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"
import { nanoid } from "nanoid"

// POST /api/notes/[id]/publish - Toggle publish status
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        // Get current note
        const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1)

        if (!note) {
            return badRequest("Note not found")
        }

        if (note.isPublished) {
            // Unpublish: remove slug but keep view count for analytics
            await db.update(notes).set({
                isPublished: false,
                updatedAt: new Date(),
            }).where(eq(notes.id, id))

            return NextResponse.json({
                success: true,
                isPublished: false,
                slug: null,
                viewCount: note.viewCount || 0
            })
        } else {
            // Publish: generate slug if not exists
            const slug = note.publishedSlug || nanoid(10)

            await db.update(notes).set({
                isPublished: true,
                publishedSlug: slug,
                updatedAt: new Date(),
            }).where(eq(notes.id, id))

            return NextResponse.json({
                success: true,
                isPublished: true,
                slug,
                viewCount: note.viewCount || 0
            })
        }
    } catch (error) {
        console.error("Failed to toggle publish:", error)
        return serverError("Failed to toggle publish status")
    }
}

// GET /api/notes/[id]/publish - Get publish status
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        const [note] = await db.select({
            isPublished: notes.isPublished,
            publishedSlug: notes.publishedSlug,
            viewCount: notes.viewCount,
        }).from(notes).where(eq(notes.id, id)).limit(1)

        if (!note) {
            return badRequest("Note not found")
        }

        return NextResponse.json({
            isPublished: note.isPublished,
            slug: note.publishedSlug,
            viewCount: note.viewCount || 0
        })
    } catch (error) {
        console.error("Failed to get publish status:", error)
        return serverError("Failed to get publish status")
    }
}
