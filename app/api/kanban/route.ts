import { db } from "@/lib/api/db/client"
import { kanbanColumns, kanbanCards } from "@/lib/api/db/schema"
import { eq, asc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

// Validation schemas
const createColumnSchema = z.object({
    type: z.literal("column"),
    id: z.string().min(1),
    title: z.string().min(1).max(100),
    position: z.number().int().optional(),
})

const createCardSchema = z.object({
    type: z.literal("card"),
    id: z.string().min(1),
    columnId: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    position: z.number().int().optional(),
})

const syncSchema = z.object({
    type: z.literal("sync"),
    columns: z.array(z.object({
        id: z.string(),
        title: z.string(),
        cards: z.array(z.object({
            id: z.string(),
        })).optional(),
    })),
})

export async function GET(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const columns = await db.select().from(kanbanColumns).orderBy(asc(kanbanColumns.position))
        const cards = await db.select().from(kanbanCards).orderBy(asc(kanbanCards.position))

        const result = columns.map((col: typeof columns[0]) => ({
            ...col,
            cards: cards.filter((card: typeof cards[0]) => card.columnId === col.id)
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to fetch kanban:", error)
        return serverError("Failed to fetch kanban board")
    }
}

export async function POST(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const body = await req.json()
        const { type } = body

        if (type === "column") {
            const result = createColumnSchema.safeParse(body)
            if (!result.success) return badRequest("Invalid column data")

            const { id, title, position } = result.data
            await db.insert(kanbanColumns).values({
                id,
                title,
                position: position || 0,
                updatedAt: new Date()
            })
        } else if (type === "card") {
            const result = createCardSchema.safeParse(body)
            if (!result.success) return badRequest("Invalid card data")

            const { id, columnId, title, description, position } = result.data
            await db.insert(kanbanCards).values({
                id,
                columnId,
                title,
                description,
                position: position || 0,
                updatedAt: new Date()
            })
        } else if (type === "sync") {
            const result = syncSchema.safeParse(body)
            if (!result.success) return badRequest("Invalid sync data")

            const { columns } = result.data
            for (const col of columns) {
                await db.update(kanbanColumns)
                    .set({ title: col.title, updatedAt: new Date() })
                    .where(eq(kanbanColumns.id, col.id))

                if (col.cards && col.cards.length > 0) {
                    for (let i = 0; i < col.cards.length; i++) {
                        const card = col.cards[i]
                        await db.update(kanbanCards)
                            .set({
                                columnId: col.id,
                                position: i,
                                updatedAt: new Date()
                            })
                            .where(eq(kanbanCards.id, card.id))
                    }
                }
            }
        } else {
            return badRequest("Invalid type")
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Kanban POST Error", error)
        return serverError("Failed to update kanban")
    }
}

export async function DELETE(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const type = searchParams.get("type")

    if (!id || !type) {
        return badRequest("ID and Type required")
    }

    if (type !== "column" && type !== "card") {
        return badRequest("Type must be 'column' or 'card'")
    }

    try {
        if (type === "column") {
            await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id))
        } else {
            await db.delete(kanbanCards).where(eq(kanbanCards.id, id))
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete kanban item:", error)
        return serverError("Failed to delete item")
    }
}
