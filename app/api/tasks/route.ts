import { db } from "@/lib/api/db/client"
import { tasks } from "@/lib/api/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth, unauthorized, badRequest, serverError } from "@/lib/api/middleware/nextjs-auth"

// Validation schemas
const createTaskSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(1000),
    priority: z.enum(["low", "medium", "high"]).optional(),
    completed: z.boolean().optional(),
    dueDate: z.string().datetime().optional().nullable(),
    createdAt: z.string().datetime().optional(),
})

const updateTaskSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(1000).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    completed: z.boolean().optional(),
    dueDate: z.string().datetime().optional().nullable(),
    position: z.number().int().optional(),
})

// GET /api/tasks - List all tasks
export async function GET(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt))
        return NextResponse.json(allTasks)
    } catch (error) {
        console.error("Failed to fetch tasks:", error)
        return serverError("Failed to fetch tasks")
    }
}

// POST /api/tasks - Create new task
export async function POST(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const body = await req.json()

        const result = createTaskSchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid input: " + result.error.message)
        }

        const { id, text, priority, completed, dueDate, createdAt } = result.data

        await db.insert(tasks).values({
            id,
            text,
            priority: priority || "medium",
            completed: completed || false,
            dueDate: dueDate ? new Date(dueDate) : null,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            updatedAt: new Date(),
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to create task:", error)
        return serverError("Failed to create task")
    }
}

// PUT /api/tasks - Update task
export async function PUT(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    try {
        const body = await req.json()

        const result = updateTaskSchema.safeParse(body)
        if (!result.success) {
            return badRequest("Invalid input: " + result.error.message)
        }

        const { id, text, priority, completed, dueDate, position } = result.data

        await db.update(tasks)
            .set({
                ...(text !== undefined && { text }),
                ...(priority !== undefined && { priority }),
                ...(completed !== undefined && { completed }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(position !== undefined && { position }),
                updatedAt: new Date()
            })
            .where(eq(tasks.id, id))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to update task:", error)
        return serverError("Failed to update task")
    }
}

// DELETE /api/tasks - Delete task
export async function DELETE(req: NextRequest) {
    const userId = await verifyAuth(req)
    if (!userId) return unauthorized()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
        return badRequest("ID required")
    }

    try {
        await db.delete(tasks).where(eq(tasks.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete task:", error)
        return serverError("Failed to delete task")
    }
}
