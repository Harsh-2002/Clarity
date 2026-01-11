"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
    Home,
    Mic,
    History,
    BookMarked,
    ListTodo,
    Columns3,
    Settings,
    Plus,
    Calendar,
    Search,
    Moon,
    Sun
} from "lucide-react"
import { useTheme } from "next-themes"

interface Note {
    id: string
    title: string
    updatedAt: string
}

interface Task {
    id: string
    text: string
    completed: boolean
}

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [notes, setNotes] = useState<Note[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const router = useRouter()
    const { theme, setTheme } = useTheme()

    // Toggle with Cmd+K / Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // Fetch data when opened
    useEffect(() => {
        if (open) {
            Promise.all([
                fetch("/api/v1/notes").then(r => r.ok ? r.json() : []),
                fetch("/api/tasks").then(r => r.ok ? r.json() : [])
            ]).then(([notesData, tasksData]) => {
                setNotes(notesData.slice(0, 10))
                setTasks(tasksData.filter((t: Task) => !t.completed).slice(0, 10))
            })
        }
    }, [open])

    const runCommand = useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />

            {/* Command Dialog */}
            <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
                <Command
                    className="rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
                    shouldFilter={true}
                >
                    <div className="flex items-center border-b border-border px-4">
                        <Search className="w-4 h-4 text-muted-foreground mr-2" />
                        <Command.Input
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Search or jump to..."
                            className="flex-1 h-12 bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            ESC
                        </kbd>
                    </div>

                    <Command.List className="max-h-80 overflow-y-auto p-2">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </Command.Empty>

                        {/* Navigation */}
                        <Command.Group heading="Navigation" className="text-xs text-muted-foreground px-2 py-1.5">
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/dashboard"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <Home className="w-4 h-4" />
                                <span>Dashboard</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/transcribe"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <Mic className="w-4 h-4" />
                                <span>Transcribe</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/transcripts"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <History className="w-4 h-4" />
                                <span>History</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/notes"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <BookMarked className="w-4 h-4" />
                                <span>Notes</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/tasks"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <ListTodo className="w-4 h-4" />
                                <span>Tasks</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/kanban"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <Columns3 className="w-4 h-4" />
                                <span>Kanban</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/calendar"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Calendar</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/settings"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Settings</span>
                            </Command.Item>
                        </Command.Group>

                        {/* Actions */}
                        <Command.Group heading="Actions" className="text-xs text-muted-foreground px-2 py-1.5 mt-2">
                            <Command.Item
                                onSelect={() => runCommand(() => router.push("/notes?new=true"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create New Note</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                            >
                                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                <span>Toggle Theme</span>
                            </Command.Item>
                        </Command.Group>

                        {/* Notes Search Results */}
                        {notes.length > 0 && (
                            <Command.Group heading="Notes" className="text-xs text-muted-foreground px-2 py-1.5 mt-2">
                                {notes.map((note) => (
                                    <Command.Item
                                        key={note.id}
                                        value={note.title}
                                        onSelect={() => runCommand(() => router.push(`/notes?id=${note.id}`))}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                                    >
                                        <BookMarked className="w-4 h-4 text-muted-foreground" />
                                        <span className="truncate">{note.title || "Untitled"}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Tasks Search Results */}
                        {tasks.length > 0 && (
                            <Command.Group heading="Pending Tasks" className="text-xs text-muted-foreground px-2 py-1.5 mt-2">
                                {tasks.map((task) => (
                                    <Command.Item
                                        key={task.id}
                                        value={task.text}
                                        onSelect={() => runCommand(() => router.push("/tasks"))}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-secondary"
                                    >
                                        <ListTodo className="w-4 h-4 text-muted-foreground" />
                                        <span className="truncate">{task.text}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}
                    </Command.List>

                    <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                        <span>Type to search...</span>
                        <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↑↓</kbd>
                            <span>navigate</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↵</kbd>
                            <span>select</span>
                        </div>
                    </div>
                </Command>
            </div>
        </div>
    )
}
