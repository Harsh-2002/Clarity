import { db } from "@/lib/api/db/client"
import { canvases } from "@/lib/api/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// GET /api/canvas/:id - Get single canvas with full data
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        return NextResponse.json({ error: "Failed to fetch canvas" }, { status: 500 })
    }
}

// PUT /api/canvas/:id - Update canvas
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const body = await req.json()
        const { name, data, thumbnail } = body

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
        return NextResponse.json({ error: "Failed to update canvas" }, { status: 500 })
    }
}

// DELETE /api/canvas/:id - Delete canvas
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        await db.delete(canvases).where(eq(canvases.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete canvas:", error)
        return NextResponse.json({ error: "Failed to delete canvas" }, { status: 500 })
    }
}
