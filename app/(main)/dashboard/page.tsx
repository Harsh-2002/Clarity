"use client"

import { useState, useEffect, useCallback, memo } from "react"
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
import { cn } from "@/lib/utils"
import { isOfflineSyncEnabled } from "@/lib/sync/pwa-detection"
import { getLocalDb } from "@/lib/sync/db"
import { SyncEngine } from "@/lib/sync/engine"

// Isolated clock component — ticks every second without re-rendering the parent
const LiveClock = memo(function LiveClock() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = () => time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    const formatDate = () => time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="text-right hidden md:block">
            <div className="text-4xl md:text-5xl font-light tracking-tight tabular-nums">{formatTime()}</div>
            <div className="text-muted-foreground mt-1">{formatDate()}</div>
        </div>
    )
})

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
}

export default function DashboardPage() {
    const [stats, setStats] = useState({ notes: 0, pendingTasks: 0, completedTasks: 0, transcripts: 0, canvases: 0, journals: 0, bookmarks: 0 })
    const [recentNotes, setRecentNotes] = useState<Note[]>([])
    const [recentTasks, setRecentTasks] = useState<Task[]>([])
    const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
    const [recentTranscripts, setRecentTranscripts] = useState<Transcript[]>([])
    const [recentCanvases, setRecentCanvases] = useState<Canvas[]>([])
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

    useEffect(() => {
        setMounted(true)

        // Load widget order from localStorage
        const savedOrder = localStorage.getItem("dashboard-widget-order")
        if (savedOrder) {
            try {
                setWidgets(JSON.parse(savedOrder))
            } catch (e) {
                console.error("Failed to parse widget order", e)
            }
        }
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

    // Fetch data — from IndexedDB in PWA mode, network otherwise
    const fetchDataFromLocal = useCallback(async () => {
        const db = getLocalDb()
        const [notes, tasks, transcripts, canvases, journals, bmarks] = await Promise.all([
            db.notes.toArray().then(n => n.filter(x => !x.deletedAt)),
            db.tasks.toArray().then(t => t.filter(x => !x.deletedAt)),
            db.transcripts.toArray().then(t => t.filter(x => !x.deletedAt)),
            db.canvases.toArray().then(c => c.filter(x => !x.deletedAt)),
            db.journalEntries.toArray().then(j => j.filter(x => !x.deletedAt)),
            db.bookmarks.toArray().then(b => b.filter(x => !x.deletedAt)),
        ])

        const pending = tasks.filter(t => !t.completed)
        const completed = tasks.filter(t => t.completed)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const upcoming = pending
            .filter(t => t.dueDate && t.dueDate >= today.getTime())
            .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
            .slice(0, 5)

        setRecentNotes(notes.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3) as any)
        setRecentTasks(pending.slice(0, 5) as any)
        setUpcomingTasks(upcoming as any)
        setRecentTranscripts(transcripts.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3) as any)
        setRecentCanvases(canvases.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3) as any)
        setStats({
            notes: notes.length,
            pendingTasks: pending.length,
            completedTasks: completed.length,
            transcripts: transcripts.length,
            canvases: canvases.length,
            journals: journals.length,
            bookmarks: bmarks.length,
        })
    }, [])

    const fetchDataFromNetwork = useCallback(async () => {
        const res = await fetch("/api/dashboard", { credentials: "include" })
        if (!res.ok) return

        const data = await res.json()
        setStats(data.stats)
        setRecentNotes(data.recentNotes)
        setUpcomingTasks(data.upcomingTasks)
        setRecentTranscripts(data.recentTranscripts)
        setRecentCanvases(data.recentCanvases)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const loadData = async () => {
            try {
                if (isOfflineSyncEnabled()) {
                    const engine = SyncEngine.getInstance()
                    try { await engine.initialSync() } catch {}
                    await fetchDataFromLocal()
                } else {
                    await fetchDataFromNetwork()
                }
            } catch (error) {
                console.error("Failed to load dashboard data", error)
            }
        }

        loadData()

        // Subscribe to sync engine updates in PWA mode
        if (isOfflineSyncEnabled()) {
            const engine = SyncEngine.getInstance()
            const unsub = engine.subscribe(() => { fetchDataFromLocal() })
            return () => { unsub() }
        }
    }, [mounted, fetchDataFromLocal, fetchDataFromNetwork])

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
                    <LiveClock />
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

