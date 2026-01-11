"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, GripVertical, MoreHorizontal, X, Loader2, Columns } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { toast } from "sonner"

interface Card {
    id: string
    title: string
    description?: string
    columnId: string
    position: number
}

interface Column {
    id: string
    title: string
    position: number
    cards: Card[]
}

export default function KanbanPage() {
    const [columns, setColumns] = useState<Column[]>([])
    const [loading, setLoading] = useState(true)
    const [newCardTitle, setNewCardTitle] = useState<{ [key: string]: string }>({})
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
    const [draggedCard, setDraggedCard] = useState<{ card: Card; fromColumn: string } | null>(null)

    const fetchBoard = async () => {
        try {
            const res = await fetch("/api/kanban")
            if (res.ok) {
                const data = await res.json()
                setColumns(data)
            }
        } catch (error) {
            toast.error("Failed to load board")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBoard()
    }, [])

    const syncBoard = async (updatedColumns: Column[]) => {
        try {
            await fetch("/api/kanban", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "sync", columns: updatedColumns })
            })
        } catch (error) {
            console.error("Sync failed", error)
        }
    }

    const addCard = async (columnId: string) => {
        const title = newCardTitle[columnId]?.trim()
        if (!title) return

        const tempId = crypto.randomUUID()
        const newCard = {
            id: tempId,
            columnId,
            title,
            position: columns.find(c => c.id === columnId)?.cards.length || 0
        }

        // Optimistic update
        const updatedColumns = columns.map(col =>
            col.id === columnId
                ? { ...col, cards: [...col.cards, newCard] }
                : col
        )
        setColumns(updatedColumns)
        setNewCardTitle({ ...newCardTitle, [columnId]: "" })
        setAddingToColumn(null)

        try {
            await fetch("/api/kanban", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "card", ...newCard })
            })
        } catch (error) {
            toast.error("Failed to add card")
            fetchBoard()
        }
    }

    const deleteCard = async (columnId: string, cardId: string) => {
        // Optimistic
        const updatedColumns = columns.map(col =>
            col.id === columnId
                ? { ...col, cards: col.cards.filter(c => c.id !== cardId) }
                : col
        )
        setColumns(updatedColumns)

        try {
            await fetch(`/api/kanban?id=${cardId}&type=card`, { method: "DELETE" })
        } catch (error) {
            toast.error("Failed to delete card")
            fetchBoard()
        }
    }

    const addColumn = async () => {
        const newColumn = {
            id: crypto.randomUUID(),
            title: "New Column",
            position: columns.length,
            cards: []
        }

        setColumns([...columns, newColumn])

        try {
            await fetch("/api/kanban", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "column", ...newColumn })
            })
        } catch (error) {
            toast.error("Failed to add column")
            fetchBoard()
        }
    }

    const deleteColumn = async (columnId: string) => {
        setColumns(columns.filter(col => col.id !== columnId))
        try {
            await fetch(`/api/kanban?id=${columnId}&type=column`, { method: "DELETE" })
        } catch (error) {
            toast.error("Failed to delete column")
            fetchBoard()
        }
    }

    const renameColumn = async (columnId: string, newTitle: string) => {
        const updatedColumns = columns.map(col =>
            col.id === columnId ? { ...col, title: newTitle } : col
        )
        setColumns(updatedColumns)

        // Debounce actual API call? For simplicity we just sync occasionally or on blur.
        // Or we can use the sync mechanism.
        syncBoard(updatedColumns)
    }

    const handleDragStart = (card: Card, columnId: string) => {
        setDraggedCard({ card, fromColumn: columnId })
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (toColumnId: string) => {
        if (!draggedCard) return

        const { card, fromColumn } = draggedCard

        if (fromColumn === toColumnId) {
            setDraggedCard(null)
            return
        }

        const updatedColumns = columns.map(col => {
            if (col.id === fromColumn) {
                return { ...col, cards: col.cards.filter(c => c.id !== card.id) }
            }
            if (col.id === toColumnId) {
                return { ...col, cards: [...col.cards, { ...card, columnId: toColumnId }] }
            }
            return col
        })

        setColumns(updatedColumns)
        setDraggedCard(null)
        syncBoard(updatedColumns)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6 md:pl-24 bg-gradient-to-br from-background via-background to-secondary/20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
                        Kanban Board
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your projects effectively.
                    </p>
                </div>
                <Button onClick={addColumn} className="rounded-full shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                </Button>
            </div>

            {/* Board */}
            <div className="flex gap-6 overflow-x-auto pb-4 items-start min-h-[calc(100vh-200px)]">
                <AnimatePresence mode="popLayout">
                    {columns.map(column => (
                        <motion.div
                            key={column.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex-shrink-0 w-80 bg-secondary/20 backdrop-blur-xl border border-border/50 rounded-[2rem] p-4 shadow-sm"
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(column.id)}
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between mb-4 pl-2 pr-1">
                                <input
                                    type="text"
                                    value={column.title}
                                    onChange={(e) => renameColumn(column.id, e.target.value)}
                                    className="font-bold bg-transparent border-none outline-none w-full text-foreground/80 focus:text-foreground transition-colors"
                                />
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-full border border-border/50">
                                        {column.cards.length}
                                    </span>
                                    {columns.length > 1 && (
                                        <button
                                            onClick={() => deleteColumn(column.id)}
                                            className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="space-y-3 min-h-[100px]">
                                <AnimatePresence>
                                    {column.cards.map(card => (
                                        <motion.div
                                            key={card.id}
                                            layoutId={card.id}
                                            draggable
                                            onDragStart={() => handleDragStart(card, column.id)}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="group relative p-4 bg-background/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-primary/20 transition-all"
                                        >
                                            <div className="flex items-start gap-3">
                                                <GripVertical className="w-4 h-4 mt-0.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <p className="font-medium text-sm leading-relaxed text-foreground/90">
                                                    {card.title}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => deleteCard(column.id, card.id)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground/50 hover:text-destructive transition-all rounded-full hover:bg-destructive/10"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Add Card */}
                            <div className="mt-3">
                                {addingToColumn === column.id ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-background rounded-2xl p-3 border border-border shadow-lg"
                                    >
                                        <Input
                                            autoFocus
                                            value={newCardTitle[column.id] || ""}
                                            onChange={(e) => setNewCardTitle({ ...newCardTitle, [column.id]: e.target.value })}
                                            onKeyDown={(e) => e.key === "Enter" && addCard(column.id)}
                                            placeholder="Card title..."
                                            className="h-9 mb-2 bg-secondary/50 border-none"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => addCard(column.id)} className="flex-1 rounded-xl h-8 text-xs">
                                                Add
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setAddingToColumn(null)} className="rounded-xl h-8 text-xs">
                                                Cancel
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <button
                                        onClick={() => setAddingToColumn(column.id)}
                                        className="w-full py-3 rounded-2xl border border-dashed border-border/40 text-muted-foreground/70 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Card
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
