import { db } from "@/lib/api/db/client"
import { canvases } from "@/lib/api/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

// Validation schema for updates
const updateCanvasSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    data: z.string().optional(),
    thumbnail: z.string().optional(),
})

// GET /api/canvas/:id - Get single canvas with full data
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify authentication
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        const canvas = await db
            .select()
            .from(canvases)
            .where(eq(canvases.id, id))
            .limit(1)

        if (canvas.length === 0) {
            return NextResponse.json({ error: "Canvas not found" }, { status: 404 })
        }

        return NextResponse.json(canvas[0])
    } catch (error) {
        console.error("Failed to fetch canvas:", error)
        return serverError("Failed to fetch canvas")
    }
}

// PUT /api/canvas/:id - Update canvas
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify authentication
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        const body = await req.json()

        // Validate input
        const result = updateCanvasSchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid input: " + result.error.message)
        }

        const { name, data, thumbnail } = result.data

        await db
            .update(canvases)
            .set({
                ...(name !== undefined && { name }),
                ...(data !== undefined && { data }),
                ...(thumbnail !== undefined && { thumbnail }),
                updatedAt: new Date(),
            })
            .where(eq(canvases.id, id))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to update canvas:", error)
        return serverError("Failed to update canvas")
    }
}

// DELETE /api/canvas/:id - Delete canvas
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify authentication
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { id } = await params

    try {
        await db.delete(canvases).where(eq(canvases.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete canvas:", error)
        return serverError("Failed to delete canvas")
    }
}
