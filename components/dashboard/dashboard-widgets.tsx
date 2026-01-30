"use client"

import Link from "next/link"
import { ArrowRight, BookMarked, Calendar, FileText, ListTodo, Mic, PenTool, Plus, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Types
export interface Task {
    id: string
    text: string
    completed: boolean
    priority: string
    dueDate: string | null
    createdAt: string
}

export interface Transcript {
    id: string
    name: string
    createdAt: string
}

export interface Note {
    id: string
    title: string
    updatedAt: string
}

export interface Canvas {
    id: string
    name: string
    updatedAt: string
}

// Stats Component
export function StatsCards({ stats }: { stats: { notes: number, pendingTasks: number, completedTasks: number, journals?: number, bookmarks?: number } }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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
                        <p className="text-sm text-muted-foreground">Done</p>
                        <p className="text-3xl font-bold">{stats.completedTasks}</p>
                    </div>
                    <div className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Journal</p>
                        <p className="text-3xl font-bold">{stats.journals ?? 0}</p>
                    </div>
                    <div className="w-11 h-11 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Calendar className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 bg-secondary/20 hover:bg-secondary/30 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Bookmarks</p>
                        <p className="text-3xl font-bold">{stats.bookmarks ?? 0}</p>
                    </div>
                    <div className="w-11 h-11 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <FileText className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Recent Notes Widget
export function RecentNotesWidget({ notes }: { notes: Note[] }) {
    return (
        <div className="space-y-3 h-full">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-500" />
                Recent Notes
            </h2>
            <div className={cn(
                "space-y-2", // Desktop vertical spacing
                "flex md:block overflow-x-auto md:overflow-visible gap-3 md:gap-0 pb-4 md:pb-0 pl-4 md:pl-0 -mr-4 md:mr-0 pr-4 md:pr-0 scrollbar-hide snap-x md:snap-none" // Mobile horizontal scroll with left padding
            )}>
                {notes.length > 0 ? (
                    notes.map((note) => (
                        <Link key={note.id} href={`/notes?id=${note.id}`} className="flex-none w-[280px] md:w-auto snap-center">
                            <div className="group p-4 rounded-xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer h-full">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-foreground/50 group-hover:text-primary transition-colors">
                                        <BookMarked className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium group-hover:text-primary transition-colors truncate">{note.title || "Untitled"}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(note.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-6 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl w-full">
                        No notes yet
                    </div>
                )}
            </div>
        </div>
    )
}

// Upcoming Tasks Widget
export function UpcomingTasksWidget({ tasks }: { tasks: Task[] }) {
    return (
        <div className="space-y-3 h-full">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-yellow-500" />
                Upcoming Tasks
            </h2>
            <div className={cn(
                "space-y-2",
                "flex md:block overflow-x-auto md:overflow-visible gap-3 md:gap-0 pb-4 md:pb-0 pl-4 md:pl-0 -mr-4 md:mr-0 pr-4 md:pr-0 scrollbar-hide snap-x md:snap-none"
            )}>
                {tasks.length > 0 ? (
                    tasks.map((task) => (
                        <Link key={task.id} href="/tasks" className="flex-none w-[280px] md:w-auto snap-center">
                            <div className="group p-4 rounded-xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer h-full">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex-shrink-0 flex items-center justify-center text-yellow-500">
                                        <ListTodo className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium group-hover:text-primary transition-colors truncate">{task.text}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Due: {new Date(task.dueDate!).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-6 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl w-full">
                        No upcoming tasks with due dates
                    </div>
                )}
            </div>
        </div>
    )
}

// Recent Transcripts Widget
export function RecentTranscriptsWidget({ transcripts }: { transcripts: Transcript[] }) {
    return (
        <div className="space-y-3 h-full">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Mic className="w-5 h-5 text-purple-500" />
                Recent Transcriptions
            </h2>
            <div className={cn(
                "space-y-2",
                "flex md:block overflow-x-auto md:overflow-visible gap-3 md:gap-0 pb-4 md:pb-0 pl-4 md:pl-0 -mr-4 md:mr-0 pr-4 md:pr-0 scrollbar-hide snap-x md:snap-none"
            )}>
                {transcripts.length > 0 ? (
                    transcripts.map((transcript) => (
                        <Link key={transcript.id} href="/transcripts" className="flex-none w-[280px] md:w-auto snap-center">
                            <div className="group p-4 rounded-xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer h-full">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 rounded-full bg-purple-500/10 flex-shrink-0 flex items-center justify-center text-purple-500">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium group-hover:text-primary transition-colors truncate">{transcript.name || "Recording"}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(transcript.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-6 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl w-full">
                        No transcriptions yet
                    </div>
                )}
            </div>
        </div>
    )
}

// Recent Canvases Widget
export function RecentCanvasesWidget({ canvases }: { canvases: Canvas[] }) {
    return (
        <div className="space-y-3 h-full">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <PenTool className="w-5 h-5 text-orange-500" />
                Recent Canvases
            </h2>
            <div className={cn(
                "space-y-2",
                "flex md:block overflow-x-auto md:overflow-visible gap-3 md:gap-0 pb-4 md:pb-0 pl-4 md:pl-0 -mr-4 md:mr-0 pr-4 md:pr-0 scrollbar-hide snap-x md:snap-none"
            )}>
                {canvases.length > 0 ? (
                    canvases.map((canvas) => (
                        <Link key={canvas.id} href={`/canvas/${canvas.id}`} className="flex-none w-[280px] md:w-auto snap-center">
                            <div className="group p-4 rounded-xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between cursor-pointer h-full">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 rounded-full bg-orange-500/10 flex-shrink-0 flex items-center justify-center text-orange-500">
                                        <PenTool className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium group-hover:text-primary transition-colors truncate">{canvas.name || "Untitled Canvas"}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(canvas.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-6 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl w-full">
                        No canvases yet
                    </div>
                )}
            </div>
        </div>
    )
}

// Quick Actions Widget (Fixed, not draggable usually, but good to export)
export function QuickActionsWidget() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
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
                    <Link href="/calendar">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mr-4">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-medium">View Calendar</div>
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
        </div>
    )
}

import * as Icons from "lucide-react"

// For dynamic icon usage if needed
export const IconsMap = Icons
