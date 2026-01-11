"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Calendar, Flag, CheckCircle2, Circle, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface Task {
    id: string
    text: string
    completed: boolean
    priority: "low" | "medium" | "high"
    dueDate?: string
    createdAt: string // API returns ISO string
}

const priorityColors = {
    low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    high: "text-red-500 bg-red-500/10 border-red-500/20"
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState("")
    const [newPriority, setNewPriority] = useState<Task["priority"]>("medium")
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Load tasks from API
    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/tasks")
            if (res.ok) {
                const data = await res.json()
                setTasks(data)
            }
        } catch (error) {
            toast.error("Failed to load tasks")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const addTask = async () => {
        if (!newTask.trim()) return

        setSubmitting(true)
        const task = {
            id: crypto.randomUUID(),
            text: newTask.trim(),
            priority: newPriority,
            completed: false,
            createdAt: new Date().toISOString()
        }

        // Optimistic update
        setTasks([task as any, ...tasks])
        setNewTask("")

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task)
            })
            if (!res.ok) throw new Error()
        } catch (error) {
            toast.error("Failed to save task")
            fetchTasks() // Revert on error
        } finally {
            setSubmitting(false)
        }
    }

    const toggleTask = async (id: string, currentCompleted: boolean) => {
        // Optimistic update
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !currentCompleted } : t))

        try {
            await fetch("/api/tasks", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, completed: !currentCompleted })
            })
        } catch (error) {
            toast.error("Failed to update task")
            fetchTasks()
        }
    }

    const deleteTask = async (id: string) => {
        // Optimistic update
        setTasks(tasks.filter(t => t.id !== id))

        try {
            await fetch(`/api/tasks?id=${id}`, { method: "DELETE" })
        } catch (error) {
            toast.error("Failed to delete task")
            fetchTasks()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addTask()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const pending = tasks.filter(t => !t.completed)
    const completed = tasks.filter(t => t.completed)

    const TaskItem = ({ task }: { task: Task }) => (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "group flex items-center gap-4 p-4 rounded-3xl transition-all border border-border/50",
                task.completed
                    ? "bg-secondary/20 opacity-60 hover:bg-secondary/30"
                    : "bg-background/80 backdrop-blur-md shadow-sm hover:shadow-md hover:border-primary/20"
            )}
        >
            <button
                onClick={() => toggleTask(task.id, task.completed)}
                className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    task.completed
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 hover:border-primary group-hover:scale-110"
                )}
            >
                {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
            </button>

            <div className="flex-1 min-w-0">
                <p className={cn(
                    "font-medium truncate transition-all",
                    task.completed && "line-through text-muted-foreground"
                )}>
                    {task.text}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(task.createdAt).toLocaleDateString()}
                </p>
            </div>

            <div className={cn("px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5", priorityColors[task.priority])}>
                <Flag className="w-3 h-3" strokeWidth={2.5} />
                <span className="capitalize">{task.priority}</span>
            </div>

            <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    )

    return (
        <div className="min-h-screen p-6 md:pl-24 bg-gradient-to-b from-background to-secondary/10">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Tasks
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Stay organized and track your progress.
                    </p>
                </div>

                {/* Add Task Card */}
                <div className="p-1.5 bg-background/60 backdrop-blur-xl border border-border rounded-[2rem] shadow-lg flex gap-2">
                    <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What needs to be done?"
                        className="flex-1 h-12 border-0 bg-transparent focus-visible:ring-0 text-lg px-4 placeholder:text-muted-foreground/50"
                        disabled={submitting}
                    />
                    <div className="flex items-center gap-2 pr-2">
                        <div className="flex bg-secondary/50 p-1 rounded-full">
                            {(["low", "medium", "high"] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setNewPriority(p)}
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                        newPriority === p
                                            ? "bg-background shadow-sm scale-110"
                                            : "text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
                                    )}
                                    title={`Priority: ${p}`}
                                >
                                    <div className={cn("w-2.5 h-2.5 rounded-full",
                                        p === 'low' ? "bg-blue-500" : p === 'medium' ? "bg-yellow-500" : "bg-red-500"
                                    )} />
                                </button>
                            ))}
                        </div>
                        <Button
                            onClick={addTask}
                            disabled={!newTask.trim() || submitting}
                            size="icon"
                            className="h-10 w-10 rounded-full shadow-md"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Task Lists */}
                <div className="space-y-8">
                    {/* Pending */}
                    <AnimatePresence mode="popLayout">
                        {pending.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    In Progress ({pending.length})
                                </h2>
                                <div className="space-y-3">
                                    {pending.map(task => <TaskItem key={task.id} task={task} />)}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Completed */}
                    <AnimatePresence mode="popLayout">
                        {completed.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Completed ({completed.length})
                                </h2>
                                <div className="space-y-3">
                                    {completed.map(task => <TaskItem key={task.id} task={task} />)}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Empty State */}
                    {tasks.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20"
                        >
                            <div className="bg-secondary/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">All caught up!</h3>
                            <p className="text-muted-foreground">You have no pending tasks. Enjoy your day.</p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}
