import { db } from "@/lib/api/db/client"
import { tasks } from "@/lib/api/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
        return NextResponse.json(allTasks);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, text, priority, createdAt, completed } = body;

        await db.insert(tasks).values({
            id,
            text,
            priority,
            completed: completed || false,
            createdAt: new Date(createdAt),
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        await db.update(tasks)
            .set({
                ...updates,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    try {
        await db.delete(tasks).where(eq(tasks.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
