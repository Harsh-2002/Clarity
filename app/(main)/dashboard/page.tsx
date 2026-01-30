"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from "@dnd-kit/sortable"

import { StatsCards, RecentNotesWidget, UpcomingTasksWidget, RecentTranscriptsWidget, RecentCanvasesWidget, QuickActionsWidget, Task, Transcript, Note, Canvas } from "@/components/dashboard/dashboard-widgets"
import { MobileStatsCarousel } from "@/components/dashboard/mobile-stats-carousel"
import { ZenQuoteWidget } from "@/components/dashboard/zen-quote-widget"
import { OnThisDayWidget } from "@/components/dashboard/on-this-day-widget"
import { SortableWidget } from "@/components/dashboard/sortable-widget"
import { getAccessToken } from "@/lib/storage"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
    const [stats, setStats] = useState({ notes: 0, pendingTasks: 0, completedTasks: 0, transcripts: 0, canvases: 0, journals: 0, bookmarks: 0 })
    const [recentNotes, setRecentNotes] = useState<Note[]>([])
    const [recentTasks, setRecentTasks] = useState<Task[]>([])
    const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
    const [recentTranscripts, setRecentTranscripts] = useState<Transcript[]>([])
    const [recentCanvases, setRecentCanvases] = useState<Canvas[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    // Widget Order State
    const [widgets, setWidgets] = useState<string[]>([
        "recent-notes",
        "upcoming-tasks",
        "recent-transcripts",
        "recent-canvases"
    ])

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Live clock
    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)

        // Load widget order from localStorage
        const savedOrder = localStorage.getItem("dashboard-widget-order")
        if (savedOrder) {
            try {
                setWidgets(JSON.parse(savedOrder))
            } catch (e) {
                console.error("Failed to parse widget order", e)
            }
        }

        return () => clearInterval(timer)
    }, [])

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.indexOf(active.id.toString())
                const newIndex = items.indexOf(over.id.toString())
                const newOrder = arrayMove(items, oldIndex, newIndex)

                // Save to localStorage
                localStorage.setItem("dashboard-widget-order", JSON.stringify(newOrder))
                return newOrder
            })
        }
    }

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = getAccessToken()
                const headers: Record<string, string> = {}
                if (token) headers["Authorization"] = `Bearer ${token}`

                const [notesRes, tasksRes, transcriptsRes, canvasesRes, journalRes, bookmarksRes] = await Promise.all([
                    fetch("/api/v1/notes", { headers }),
                    fetch("/api/tasks", { headers }),
                    fetch("/api/v1/transcripts", { headers }),
                    fetch("/api/canvas", { headers }),
                    fetch("/api/journal?limit=50", { headers }),
                    fetch("/api/bookmarks", { headers })
                ])

                if (notesRes.ok) {
                    const notes = await notesRes.json()
                    setRecentNotes(notes.slice(0, 3))
                    setStats(prev => ({ ...prev, notes: notes.length }))
                }

                if (tasksRes.ok) {
                    const tasks: Task[] = await tasksRes.json()
                    const pending = tasks.filter(t => !t.completed)
                    const completed = tasks.filter(t => t.completed)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const upcoming = pending
                        .filter(t => t.dueDate && new Date(t.dueDate) >= today)
                        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                        .slice(0, 5)

                    // Recent tasks (regardless of due date)
                    setRecentTasks(pending.slice(0, 5))
                    setUpcomingTasks(upcoming)
                    setStats(prev => ({ ...prev, pendingTasks: pending.length, completedTasks: completed.length }))
                }

                if (transcriptsRes.ok) {
                    const transcripts = await transcriptsRes.json()
                    setRecentTranscripts(transcripts.slice(0, 3))
                    setStats(prev => ({ ...prev, transcripts: transcripts.length }))
                }

                if (canvasesRes.ok) {
                    const canvases = await canvasesRes.json()
                    setRecentCanvases(canvases.slice(0, 3))
                    setStats(prev => ({ ...prev, canvases: canvases.length }))
                }

                if (journalRes.ok) {
                    const journals = await journalRes.json()
                    setStats(prev => ({ ...prev, journals: journals.length }))
                }

                if (bookmarksRes.ok) {
                    const bookmarks = await bookmarksRes.json()
                    setStats(prev => ({ ...prev, bookmarks: bookmarks.length }))
                }
            } catch (error) {
                console.error("Failed to load dashboard data", error)
            }
        }

        if (mounted) fetchData()
    }, [mounted])

    // Format time
    const formatTime = () => currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    const formatDate = () => currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Good morning"
        if (hour < 18) return "Good afternoon"
        return "Good evening"
    }

    const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    const slideUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } }

    const renderWidget = (id: string) => {
        switch (id) {
            case "recent-notes":
                return <RecentNotesWidget notes={recentNotes} />
            case "upcoming-tasks":
                return <UpcomingTasksWidget tasks={upcomingTasks} />
            case "recent-transcripts":
                return <RecentTranscriptsWidget transcripts={recentTranscripts} />
            case "recent-canvases":
                return <RecentCanvasesWidget canvases={recentCanvases} />
            default:
                return null
        }
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen p-4 md:pl-24 pb-24 md:pb-6 pt-10 md:pt-20">
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                {/* Header */}
                <motion.div {...fadeIn} className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{getGreeting()}</h1>
                        <p className="text-muted-foreground text-base md:text-lg">Here&apos;s what&apos;s happening today.</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-4xl md:text-5xl font-light tracking-tight tabular-nums">{formatTime()}</div>
                        <div className="text-muted-foreground mt-1">{formatDate()}</div>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div {...slideUp}>
                    <div className="hidden md:block">
                        <StatsCards stats={stats} />
                    </div>
                    <div className="md:hidden">
                        <MobileStatsCarousel stats={stats} />
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Reorderable Left Column */}
                    <div className="lg:col-span-2">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={widgets}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-6">
                                    {widgets.map(id => (
                                        <SortableWidget key={id} id={id}>
                                            {renderWidget(id)}
                                        </SortableWidget>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    {/* Right Column - Fixed */}
                    <motion.div {...slideUp} className="space-y-6">
                        <QuickActionsWidget />
                        <ZenQuoteWidget />
                    </motion.div>
                </div>

                {/* Bottom Section - On This Day */}
                <motion.div {...slideUp} className="w-full mt-8">
                    <OnThisDayWidget />
                </motion.div>
            </div>
        </div>
    )
}

