import { db } from "@/lib/api/db/client"
import { kanbanColumns, kanbanCards } from "@/lib/api/db/schema"
import { eq, asc } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        // Fetch columns and cards
        const columns = await db.select().from(kanbanColumns).orderBy(asc(kanbanColumns.position));
        const cards = await db.select().from(kanbanCards).orderBy(asc(kanbanCards.position));

        // Reconstruct hierarchical structure
        const result = columns.map((col: typeof columns[0]) => ({
            ...col,
            cards: cards.filter((card: typeof cards[0]) => card.columnId === col.id)
        }));

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch kanban board" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type } = body;

        if (type === "column") {
            const { id, title, position } = body;
            await db.insert(kanbanColumns).values({
                id,
                title,
                position: position || 0,
                updatedAt: new Date()
            });
        } else if (type === "card") {
            const { id, columnId, title, description, position } = body;
            await db.insert(kanbanCards).values({
                id,
                columnId,
                title,
                description,
                position: position || 0,
                updatedAt: new Date()
            });
        } else if (type === "sync") {
            // Full sync/update for drag and drop
            const { columns } = body;

            // This is a simplified approach: update positions and structure. 
            // In a real heavy-load app, we'd be more granular.
            // For now, we update column titles/positions and card column_ids/positions.

            for (const col of columns) {
                // Update column if needed (title/position)
                await db.update(kanbanColumns)
                    .set({ title: col.title, updatedAt: new Date() })
                    .where(eq(kanbanColumns.id, col.id));

                // Update all cards in this column
                if (col.cards && col.cards.length > 0) {
                    for (let i = 0; i < col.cards.length; i++) {
                        const card = col.cards[i] as { id: string };
                        await db.update(kanbanCards)
                            .set({
                                columnId: col.id,
                                position: i,
                                updatedAt: new Date()
                            })
                            .where(eq(kanbanCards.id, card.id));
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Kanban POST Error", error);
        return NextResponse.json({ error: "Failed to update kanban" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // 'column' or 'card'

    if (!id || !type) {
        return NextResponse.json({ error: "ID and Type required" }, { status: 400 });
    }

    try {
        if (type === "column") {
            await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
        } else {
            await db.delete(kanbanCards).where(eq(kanbanCards.id, id));
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
