"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Task {
    id: string
    text: string
    completed: boolean
    priority: string
    dueDate: string | null
    createdAt: string
}

type ViewMode = "month" | "year"

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [tasks, setTasks] = useState<Task[]>([])
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [mounted, setMounted] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [newTaskText, setNewTaskText] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    const fetchTasks = () => {
        fetch("/api/tasks")
            .then(r => r.ok ? r.json() : [])
            .then(setTasks)
    }

    useEffect(() => {
        setMounted(true)
        fetchTasks()
    }, [])

    const createTask = async () => {
        if (!newTaskText.trim() || !selectedDate) return

        setIsCreating(true)
        const task = {
            id: crypto.randomUUID(),
            text: newTaskText.trim(),
            priority: "medium",
            completed: false,
            dueDate: selectedDate.toISOString(),
            createdAt: new Date().toISOString()
        }

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task)
            })
            if (res.ok) {
                setNewTaskText("")
                fetchTasks()
                toast.success("Task created!")
            } else {
                toast.error("Failed to create task")
            }
        } catch (error) {
            toast.error("Failed to create task")
        } finally {
            setIsCreating(false)
        }
    }

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Group tasks by due date
    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {}
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = task.dueDate.split('T')[0]
                if (!map[dateKey]) map[dateKey] = []
                map[dateKey].push(task)
            }
        })
        return map
    }, [tasks])

    // Get tasks for selected date
    const selectedDateTasks = useMemo(() => {
        if (!selectedDate) return []
        const dateKey = selectedDate.toISOString().split('T')[0]
        return tasksByDate[dateKey] || []
    }, [selectedDate, tasksByDate])

    const prevPeriod = () => {
        if (viewMode === "month") {
            setCurrentDate(new Date(year, month - 1, 1))
        } else {
            setCurrentDate(new Date(year - 1, 0, 1))
        }
        setSelectedDate(null)
    }

    const nextPeriod = () => {
        if (viewMode === "month") {
            setCurrentDate(new Date(year, month + 1, 1))
        } else {
            setCurrentDate(new Date(year + 1, 0, 1))
        }
        setSelectedDate(null)
    }

    const goToToday = () => {
        setCurrentDate(new Date())
        setSelectedDate(new Date())
    }

    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const getDateKey = (y: number, m: number, d: number) => {
        return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }

    const isTodayCheck = (y: number, m: number, d: number) => {
        const today = new Date()
        return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y
    }

    // Mini month component for year view
    const MiniMonth = ({ monthIndex }: { monthIndex: number }) => {
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
        const firstDay = new Date(year, monthIndex, 1).getDay()

        return (
            <button
                onClick={() => {
                    setCurrentDate(new Date(year, monthIndex, 1))
                    setViewMode("month")
                }}
                className="p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-all text-left"
            >
                <div className="text-sm font-semibold mb-2">{monthNames[monthIndex]}</div>
                <div className="grid grid-cols-7 gap-px text-[10px]">
                    {/* Day headers */}
                    {days.map((d, i) => (
                        <div key={i} className="text-center text-muted-foreground w-4 h-4">{d}</div>
                    ))}
                    {/* Empty cells */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`e-${i}`} className="w-4 h-4" />
                    ))}
                    {/* Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const dateKey = getDateKey(year, monthIndex, day)
                        const dayTasks = tasksByDate[dateKey] || []
                        const hasPending = dayTasks.some(t => !t.completed)
                        const hasCompleted = dayTasks.some(t => t.completed)
                        const isToday = isTodayCheck(year, monthIndex, day)

                        return (
                            <div
                                key={day}
                                className={cn(
                                    "w-4 h-4 flex items-center justify-center rounded-sm text-[9px]",
                                    isToday && "bg-primary text-primary-foreground font-bold",
                                    hasPending && !isToday && "bg-yellow-500/20",
                                    hasCompleted && !hasPending && !isToday && "bg-green-500/20"
                                )}
                            >
                                {day}
                            </div>
                        )
                    })}
                </div>
            </button>
        )
    }

    // Full month view component
    const MonthView = () => {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDayOfMonth = new Date(year, month, 1).getDay()

        return (
            <Card className="rounded-2xl border-border/50">
                <CardContent className="p-4">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const dateKey = getDateKey(year, month, day)
                            const dayTasks = tasksByDate[dateKey] || []
                            const hasTasks = dayTasks.length > 0
                            const pendingCount = dayTasks.filter(t => !t.completed).length
                            const isToday = isTodayCheck(year, month, day)
                            const isSelected = selectedDate?.getDate() === day &&
                                selectedDate?.getMonth() === month &&
                                selectedDate?.getFullYear() === year

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(new Date(year, month, day))}
                                    className={cn(
                                        "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-colors",
                                        isToday && "bg-primary text-primary-foreground",
                                        isSelected && !isToday && "bg-secondary",
                                        !isToday && !isSelected && "hover:bg-secondary/50"
                                    )}
                                >
                                    <span className="text-sm font-medium">{day}</span>
                                    {hasTasks && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {pendingCount > 0 && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                            )}
                                            {dayTasks.some(t => t.completed) && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            )}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!mounted) return null

    const headerTitle = viewMode === "month"
        ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : String(year)

    return (
        <div className="min-h-screen p-6 md:pl-24 pt-10 md:pt-20">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{headerTitle}</h1>
                        <p className="text-muted-foreground">View your tasks by due date</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex rounded-full border border-border/50 p-0.5 bg-secondary/30">
                            <button
                                onClick={() => setViewMode("month")}
                                className={cn(
                                    "px-3 py-1 rounded-full text-sm transition-colors",
                                    viewMode === "month" ? "bg-background shadow-sm" : "text-muted-foreground"
                                )}
                            >
                                Month
                            </button>
                            <button
                                onClick={() => setViewMode("year")}
                                className={cn(
                                    "px-3 py-1 rounded-full text-sm transition-colors",
                                    viewMode === "year" ? "bg-background shadow-sm" : "text-muted-foreground"
                                )}
                            >
                                Year
                            </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={goToToday} className="rounded-full">
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" onClick={prevPeriod} className="rounded-full">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextPeriod} className="rounded-full">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </motion.div>

                {viewMode === "year" ? (
                    /* Year View - 12 month grid */
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                        {Array.from({ length: 12 }).map((_, i) => (
                            <MiniMonth key={i} monthIndex={i} />
                        ))}
                    </motion.div>
                ) : (
                    /* Month View */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-2"
                        >
                            <MonthView />
                        </motion.div>

                        {/* Tasks Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                        >
                            <h2 className="text-xl font-semibold">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                                    : 'Select a date'
                                }
                            </h2>

                            {selectedDate ? (
                                <div className="space-y-4">
                                    {/* Add Task Form */}
                                    <div className="p-1 bg-secondary/30 rounded-full flex gap-2">
                                        <Input
                                            value={newTaskText}
                                            onChange={(e) => setNewTaskText(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && createTask()}
                                            placeholder="Add a task for this day..."
                                            className="flex-1 border-0 bg-transparent focus-visible:ring-0"
                                            disabled={isCreating}
                                        />
                                        <Button
                                            onClick={createTask}
                                            disabled={!newTaskText.trim() || isCreating}
                                            size="icon"
                                            className="rounded-full shrink-0"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Tasks List */}
                                    {selectedDateTasks.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedDateTasks.map(task => (
                                                <Card key={task.id} className="rounded-xl border-border/50">
                                                    <CardContent className="p-3 flex items-center gap-3">
                                                        {task.completed ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <Clock className="w-4 h-4 text-yellow-500" />
                                                        )}
                                                        <span className={cn(
                                                            "text-sm",
                                                            task.completed && "line-through text-muted-foreground"
                                                        )}>
                                                            {task.text}
                                                        </span>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl text-sm">
                                            No tasks for this day yet
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                                    Click on a date to view and add tasks
                                </div>
                            )}

                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span>Pending</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>Completed</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    )
}

