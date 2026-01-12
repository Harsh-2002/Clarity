import { db } from "@/lib/api/db/client"
import { canvases } from "@/lib/api/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextResponse } from "next/server"

// GET /api/canvas - List all canvases
export async function GET() {
    try {
        const allCanvases = await db
            .select({
                id: canvases.id,
                name: canvases.name,
                thumbnail: canvases.thumbnail,
                createdAt: canvases.createdAt,
                updatedAt: canvases.updatedAt,
            })
            .from(canvases)
            .orderBy(desc(canvases.updatedAt))

        return NextResponse.json(allCanvases)
    } catch (error) {
        console.error("Failed to fetch canvases:", error)
        return NextResponse.json({ error: "Failed to fetch canvases" }, { status: 500 })
    }
}

// POST /api/canvas - Create new canvas
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id, name, data } = body

        await db.insert(canvases).values({
            id,
            name: name || "Untitled Canvas",
            data: data || "{}",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        return NextResponse.json({ success: true, id })
    } catch (error) {
        console.error("Failed to create canvas:", error)
        return NextResponse.json({ error: "Failed to create canvas" }, { status: 500 })
    }
}
