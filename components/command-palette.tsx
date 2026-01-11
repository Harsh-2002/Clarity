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
    Sun,
    ArrowRight
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

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

    // Toggle with Cmd+K / Ctrl+K and handle ESC
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
            if (e.key === "Escape" && open) {
                e.preventDefault()
                setOpen(false)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [open])

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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
                onClick={() => setOpen(false)}
            />

            {/* Command Dialog */}
            <div className="relative w-full max-w-lg shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-200">
                <Command
                    className="w-full bg-background/90 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden"
                    loop
                >
                    <div className="flex items-center border-b border-border/50 px-6 py-4">
                        <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
                        <Command.Input
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Type a command or search..."
                            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-lg font-medium"
                        />
                        <div className="hidden sm:flex items-center gap-2">
                            <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded-full bg-muted/50 px-2.5 font-mono text-[10px] font-medium text-muted-foreground">
                                ESC
                            </kbd>
                        </div>
                    </div>

                    <Command.List className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
                        <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                            <div className="space-y-1 mt-2">
                                <Item
                                    icon={Home}
                                    label="Dashboard"
                                    onSelect={() => runCommand(() => router.push("/dashboard"))}
                                />
                                <Item
                                    icon={Mic}
                                    label="Transcribe Audio"
                                    onSelect={() => runCommand(() => router.push("/transcribe"))}
                                />
                                <Item
                                    icon={BookMarked}
                                    label="Notes"
                                    onSelect={() => runCommand(() => router.push("/notes"))}
                                />
                                <Item
                                    icon={ListTodo}
                                    label="Tasks"
                                    onSelect={() => runCommand(() => router.push("/tasks"))}
                                />
                                <Item
                                    icon={Calendar}
                                    label="Calendar"
                                    onSelect={() => runCommand(() => router.push("/calendar"))}
                                />
                                <Item
                                    icon={Settings}
                                    label="Settings"
                                    onSelect={() => runCommand(() => router.push("/settings"))}
                                />
                            </div>
                        </Command.Group>

                        <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                            <div className="space-y-1 mt-2">
                                <Item
                                    icon={Plus}
                                    label="Create New Note"
                                    onSelect={() => runCommand(() => router.push("/notes?new=true"))}
                                />
                                <Item
                                    icon={theme === "dark" ? Sun : Moon}
                                    label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
                                    onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}
                                />
                            </div>
                        </Command.Group>

                        {/* Recent Notes */}
                        {notes.length > 0 && (
                            <Command.Group heading="Recent Notes" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                                <div className="space-y-1 mt-2">
                                    {notes.map((note) => (
                                        <Item
                                            key={note.id}
                                            icon={BookMarked}
                                            label={note.title || "Untitled"}
                                            value={`note:${note.title}`}
                                            onSelect={() => runCommand(() => router.push(`/notes?id=${note.id}`))}
                                        />
                                    ))}
                                </div>
                            </Command.Group>
                        )}

                        {/* Tasks */}
                        {tasks.length > 0 && (
                            <Command.Group heading="Tasks" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                                <div className="space-y-1 mt-2">
                                    {tasks.map((task) => (
                                        <Item
                                            key={task.id}
                                            icon={ListTodo}
                                            label={task.text}
                                            value={`task:${task.text}`}
                                            onSelect={() => runCommand(() => router.push("/tasks"))}
                                        />
                                    ))}
                                </div>
                            </Command.Group>
                        )}
                    </Command.List>

                    <div className="border-t border-border/50 bg-muted/30 px-6 py-3 text-[10px] text-muted-foreground flex items-center justify-between backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <kbd className="h-5 px-1.5 flex items-center justify-center rounded bg-background border border-border/50 shadow-sm font-sans text-xs">↑</kbd>
                                <kbd className="h-5 px-1.5 flex items-center justify-center rounded bg-background border border-border/50 shadow-sm font-sans text-xs">↓</kbd>
                                <span>navigate</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <kbd className="h-5 px-1.5 flex items-center justify-center rounded bg-background border border-border/50 shadow-sm font-sans text-xs">↵</kbd>
                                <span>select</span>
                            </div>
                        </div>
                    </div>
                </Command>
            </div>
        </div>
    )
}

function Item({
    icon: Icon,
    label,
    value,
    onSelect
}: {
    icon: any,
    label: string,
    value?: string,
    onSelect: () => void
}) {
    return (
        <Command.Item
            value={value || label}
            onSelect={onSelect}
            className={cn(
                "group flex items-center justify-between px-4 py-3 rounded-full cursor-pointer transition-all",
                "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:shadow-md",
                "text-muted-foreground"
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-5 h-5 shrink-0 transition-transform group-data-[selected=true]:scale-110" />
                <span className="font-medium truncate">{label}</span>
            </div>
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0" />
        </Command.Item>
    )
}

