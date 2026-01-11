"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
    BookMarked,
    CheckCircle2,
    Clock,
    Mic,
    Plus,
    ArrowRight,
    ListTodo,
    Columns3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardPage() {
    const [stats, setStats] = useState({ notes: 0, pendingTasks: 0, completedTasks: 0 })
    const [recentNotes, setRecentNotes] = useState<any[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    // Live clock - updates every second
    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [notesRes, tasksRes] = await Promise.all([
                    fetch("/api/v1/notes"),
                    fetch("/api/tasks")
                ])

                if (notesRes.ok && tasksRes.ok) {
                    const notes = await notesRes.json()
                    const tasks = await tasksRes.json()

                    setStats({
                        notes: notes.length,
                        pendingTasks: tasks.filter((t: any) => !t.completed).length,
                        completedTasks: tasks.filter((t: any) => t.completed).length
                    })
                    setRecentNotes(notes.slice(0, 3))
                }
            } catch (error) {
                console.error("Failed to load dashboard data", error)
            }
        }

        fetchData()
    }, [])

    // Format time beautifully
    const formatTime = () => {
        return currentTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })
    }

    const formatDate = () => {
        return currentTime.toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour < 12) return "Good morning"
        if (hour < 18) return "Good afternoon"
        return "Good evening"
    }

    // Fast, subtle animations
    const fadeIn = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.15 }
    }

    const slideUp = {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 }
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen p-6 md:pl-24">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header with Live Clock */}
                <motion.div {...fadeIn} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight">
                            {getGreeting()}
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Here's what's happening today.
                        </p>
                    </div>

                    {/* Live Clock Display */}
                    <div className="text-right">
                        <div className="text-4xl md:text-5xl font-light tracking-tight tabular-nums">
                            {formatTime()}
                        </div>
                        <div className="text-muted-foreground mt-1">
                            {formatDate()}
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div {...slideUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="rounded-2xl border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-3xl font-bold">{stats.notes}</p>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <BookMarked className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-3xl font-bold">{stats.pendingTasks}</p>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-3xl font-bold">{stats.completedTasks}</p>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recent Notes */}
                    <motion.div {...slideUp} className="md:col-span-2 space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            Recent Notes
                        </h2>
                        <div className="space-y-3">
                            {recentNotes.length > 0 ? (
                                recentNotes.map((note) => (
                                    <Link key={note.id} href={`/notes?id=${note.id}`}>
                                        <div className="group p-4 rounded-xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground/50 group-hover:text-primary transition-colors">
                                                    <BookMarked className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium group-hover:text-primary transition-colors">{note.title || "Untitled"}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(note.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-6 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                                    No notes yet
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Quick Actions Sidebar */}
                    <motion.div {...slideUp} className="space-y-6">
                        <h2 className="text-xl font-semibold">Quick Actions</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <Button variant="outline" className="h-auto py-3 px-6 justify-start rounded-full border-border/50 hover:bg-secondary/50 shadow-sm" asChild>
                                <Link href="/transcribe">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mr-4">
                                        <Mic className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Record Audio</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 ml-2" />
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-auto py-3 px-6 justify-start rounded-full border-border/50 hover:bg-secondary/50 shadow-sm" asChild>
                                <Link href="/tasks">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mr-4">
                                        <ListTodo className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Manage Tasks</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 ml-2" />
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-auto py-3 px-6 justify-start rounded-full border-border/50 hover:bg-secondary/50 shadow-sm" asChild>
                                <Link href="/kanban">
                                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 mr-4">
                                        <Columns3 className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Kanban Board</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 ml-2" />
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-auto py-3 px-6 justify-start rounded-full border-border/50 hover:bg-secondary/50 shadow-sm" asChild>
                                <Link href="/notes">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mr-4">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">New Note</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 ml-2" />
                                </Link>
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
