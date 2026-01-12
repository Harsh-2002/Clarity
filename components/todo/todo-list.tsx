"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { toast } from "sonner"

interface TodoItem {
    id: string
    text: string
    completed: boolean
    priority?: string
    createdAt?: string
}

export default function TodoList() {
    const [todos, setTodos] = useState<TodoItem[]>([])
    const [newTodo, setNewTodo] = useState("")
    const [loading, setLoading] = useState(true)

    // Fetch todos from API
    const fetchTodos = useCallback(async () => {
        try {
            const res = await fetch("/api/tasks")
            if (res.ok) {
                const data = await res.json()
                setTodos(data)
            }
        } catch (error) {
            console.error("Failed to fetch todos:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTodos()
    }, [fetchTodos])

    const addTodo = async () => {
        if (!newTodo.trim()) return

        const todo: TodoItem = {
            id: crypto.randomUUID(),
            text: newTodo.trim(),
            completed: false,
            priority: "medium",
            createdAt: new Date().toISOString(),
        }

        // Optimistic update
        setTodos([todo, ...todos])
        setNewTodo("")

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(todo),
            })
            if (!res.ok) {
                // Revert on error
                setTodos(todos)
                toast.error("Failed to add task")
            }
        } catch {
            setTodos(todos)
            toast.error("Failed to add task")
        }
    }

    const toggleTodo = async (id: string) => {
        const todo = todos.find(t => t.id === id)
        if (!todo) return

        // Optimistic update
        setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

        try {
            await fetch("/api/tasks", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, completed: !todo.completed }),
            })
        } catch {
            // Revert on error
            setTodos(todos)
        }
    }

    const deleteTodo = async (id: string) => {
        // Optimistic update
        const previousTodos = todos
        setTodos(todos.filter(t => t.id !== id))

        try {
            await fetch(`/api/tasks?id=${id}`, { method: "DELETE" })
        } catch {
            // Revert on error
            setTodos(previousTodos)
            toast.error("Failed to delete task")
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addTodo()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const pending = todos.filter(t => !t.completed)
    const completed = todos.filter(t => t.completed)

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Tasks</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                    {pending.length} pending
                </span>
            </div>

            {/* Add new task */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a task..."
                    className="flex-1 px-4 py-2 text-sm bg-secondary/50 border border-border rounded-full outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                    onClick={addTodo}
                    disabled={!newTodo.trim()}
                    className="p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {pending.length === 0 && completed.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                        No tasks yet. Add one above!
                    </p>
                )}

                {pending.map((todo) => (
                    <div
                        key={todo.id}
                        className="group flex items-center gap-3 p-3 bg-secondary/30 hover:bg-secondary/50 rounded-2xl transition-colors"
                    >
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                        <button
                            onClick={() => toggleTodo(todo.id)}
                            className="w-5 h-5 rounded-full border-2 border-primary/50 hover:border-primary flex-shrink-0 transition-colors"
                        />
                        <span className="flex-1 text-sm">{todo.text}</span>
                        <button
                            onClick={() => deleteTodo(todo.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {completed.length > 0 && (
                    <>
                        <div className="text-xs text-muted-foreground pt-4 pb-2">
                            Completed ({completed.length})
                        </div>
                        {completed.map((todo) => (
                            <div
                                key={todo.id}
                                className="group flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl transition-colors"
                            >
                                <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                                <button
                                    onClick={() => toggleTodo(todo.id)}
                                    className="w-5 h-5 rounded-full bg-primary/80 border-2 border-primary flex-shrink-0 flex items-center justify-center"
                                >
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                                <span className="flex-1 text-sm text-muted-foreground line-through">{todo.text}</span>
                                <button
                                    onClick={() => deleteTodo(todo.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
}
