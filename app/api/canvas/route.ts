import { db } from "@/lib/api/db/client"
import { canvases } from "@/lib/api/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

// Validation schemas
const createCanvasSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(200).optional(),
    data: z.string().optional(),
})

// GET /api/canvas - List all canvases
export async function GET(req: NextRequest) {
    // Verify authentication
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

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
        return serverError("Failed to fetch canvases")
    }
}

// POST /api/canvas - Create new canvas
export async function POST(req: NextRequest) {
    // Verify authentication
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const body = await req.json()

        // Validate input
        const result = createCanvasSchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid input: " + result.error.message)
        }

        const { id, name, data } = result.data

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
        return serverError("Failed to create canvas")
    }
}
