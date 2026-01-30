"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, ArrowRight, FileText, CheckSquare, Smile, Meh, Frown, Sparkles, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { getAccessToken } from "@/lib/storage"

interface JournalEntry {
    id: string
    content: string
    mood: "great" | "good" | "okay" | "bad" | null
    tags: string | null
    convertedTo: string | null
    createdAt: string
}

const DAILY_PROMPTS = [
    "What's on your mind right now?",
    "What are you grateful for today?",
    "What's your top priority for today?",
    "What challenge are you facing?",
    "What would make today great?",
    "What did you learn recently?",
    "What's something you're looking forward to?",
    "How are you feeling about your progress?",
]

const moodOptions = [
    { value: "great", label: "Great", icon: Sparkles, color: "text-green-500" },
    { value: "good", label: "Good", icon: Smile, color: "text-blue-500" },
    { value: "okay", label: "Okay", icon: Meh, color: "text-yellow-500" },
    { value: "bad", label: "Bad", icon: Frown, color: "text-red-500" },
]

export default function JournalPage() {
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [newEntry, setNewEntry] = useState("")
    const [selectedMood, setSelectedMood] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [dailyPrompt, setDailyPrompt] = useState("")

    // Get random daily prompt
    useEffect(() => {
        const todayIndex = new Date().getDate() % DAILY_PROMPTS.length
        setDailyPrompt(DAILY_PROMPTS[todayIndex])
    }, [])

    // Fetch entries
    const fetchEntries = useCallback(async () => {
        try {
            const token = getAccessToken()
            const headers: Record<string, string> = {}
            if (token) headers["Authorization"] = `Bearer ${token}`

            const res = await fetch("/api/journal?limit=50", { headers })
            if (res.ok) {
                const data = await res.json()
                setEntries(data)
            }
        } catch (error) {
            console.error("Failed to fetch entries:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchEntries()
    }, [fetchEntries])

    // Add new entry
    const addEntry = async () => {
        if (!newEntry.trim()) return
        setSubmitting(true)

        const id = crypto.randomUUID()
        const entry: JournalEntry = {
            id,
            content: newEntry.trim(),
            mood: selectedMood as JournalEntry["mood"],
            tags: null,
            convertedTo: null,
            createdAt: new Date().toISOString(),
        }

        // Optimistic update
        setEntries([entry, ...entries])
        setNewEntry("")
        setSelectedMood(null)

        try {
            const token = getAccessToken()
            const headers: Record<string, string> = { "Content-Type": "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`

            const res = await fetch("/api/journal", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    id,
                    content: entry.content,
                    mood: entry.mood,
                }),
            })
            if (!res.ok) {
                throw new Error("Failed to save")
            }
            toast.success("Entry saved")
        } catch {
            setEntries(entries)
            toast.error("Failed to save entry")
        } finally {
            setSubmitting(false)
        }
    }

    // Delete entry
    const deleteEntry = async (id: string) => {
        const previousEntries = entries
        setEntries(entries.filter(e => e.id !== id))

        try {
            const token = getAccessToken()
            const headers: Record<string, string> = {}
            if (token) headers["Authorization"] = `Bearer ${token}`

            await fetch(`/api/journal?id=${id}`, { method: "DELETE", headers })
            toast.success("Entry deleted")
        } catch {
            setEntries(previousEntries)
            toast.error("Failed to delete")
        }
    }

    // Convert entry
    const convertEntry = async (id: string, type: "task" | "note") => {
        try {
            const token = getAccessToken()
            const headers: Record<string, string> = { "Content-Type": "application/json" }
            if (token) headers["Authorization"] = `Bearer ${token}`

            const res = await fetch(`/api/journal/${id}/convert`, {
                method: "POST",
                headers,
                body: JSON.stringify({ type }),
            })
            if (res.ok) {
                const data = await res.json()
                // Update entry to show it's converted
                setEntries(entries.map(e =>
                    e.id === id ? { ...e, convertedTo: `${type}:${data.id}` } : e
                ))
                toast.success(`Converted to ${type}`)
            }
        } catch {
            toast.error("Failed to convert")
        }
    }

    // Group entries by date
    const groupedEntries = entries.reduce((groups, entry) => {
        const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        if (!groups[date]) groups[date] = []
        groups[date].push(entry)
        return groups
    }, {} as Record<string, JournalEntry[]>)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            addEntry()
        }
    }

    return (
        <div className="min-h-screen p-6 md:pl-24 pb-24 pt-10 md:pt-20">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Daily Journal</h1>
                    <p className="text-muted-foreground text-lg">
                        Capture your thoughts, ideas, and reflections
                    </p>
                </motion.div>

                {/* Quick Capture */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-6 mb-12 bg-card/50 backdrop-blur-sm border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 ring-offset-2 ring-offset-background">
                        <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-4">
                                {dailyPrompt && (
                                    <div className="text-sm font-medium text-muted-foreground/80 px-1">
                                        {dailyPrompt}
                                    </div>
                                )}
                                <textarea
                                    value={newEntry}
                                    onChange={(e) => setNewEntry(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Write something..."
                                    className="w-full min-h-[120px] bg-transparent border-none p-0 text-lg md:text-xl placeholder:text-muted-foreground/40 text-foreground resize-none outline-none focus:ring-0 leading-relaxed"
                                />

                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                    <div className="flex gap-1">
                                        {moodOptions.map((mood) => (
                                            <button
                                                key={mood.value}
                                                onClick={() => setSelectedMood(selectedMood === mood.value ? null : mood.value)}
                                                className={`p-2 rounded-xl transition-all duration-200 ${selectedMood === mood.value
                                                    ? "bg-primary/10 text-primary scale-110"
                                                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                                                    }`}
                                                title={mood.label}
                                            >
                                                <mood.icon className={`w-5 h-5 ${selectedMood === mood.value ? mood.color : "currentColor"}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="hidden md:inline-block text-xs text-muted-foreground font-medium">
                                            ⌘ + Enter
                                        </span>
                                        <Button
                                            onClick={addEntry}
                                            disabled={!newEntry.trim() || submitting}
                                            className="rounded-full px-6 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Entries Timeline */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-muted-foreground"
                    >
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-1">No journal entries yet</p>
                        <p className="text-sm">Your personal timeline starts here.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-10">
                        <AnimatePresence>
                            {Object.entries(groupedEntries).map(([date, dateEntries]) => (
                                <motion.div
                                    key={date}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="relative pl-4 md:pl-0"
                                >
                                    <div className="sticky top-4 z-10 mb-6 flex items-center">
                                        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase bg-background/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/40 shadow-sm">
                                            {date}
                                        </h2>
                                    </div>

                                    <div className="absolute left-0 top-12 bottom-0 w-px bg-border/40 hidden md:block" />

                                    <div className="space-y-6 md:pl-8">
                                        {dateEntries.map((entry) => (
                                            <motion.div
                                                key={entry.id}
                                                layoutId={entry.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="group relative"
                                            >
                                                {/* Timeline Dot (Desktop) */}
                                                <div className="absolute -left-[37px] top-6 w-2.5 h-2.5 rounded-full border-2 border-background bg-border hidden md:block group-hover:bg-primary group-hover:scale-125 transition-all duration-300 z-10" />

                                                <Card className={`p-6 rounded-3xl border-border/40 bg-card/60 backdrop-blur-md hover:bg-card/80 hover:shadow-md transition-all duration-300 ${entry.convertedTo ? "opacity-70 grayscale-[0.5] hover:grayscale-0" : ""}`}>
                                                    <div className="flex flex-col gap-3">
                                                        {/* Metadata Header */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-medium text-muted-foreground/70 bg-secondary/50 px-2 py-0.5 rounded-md">
                                                                    {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                                                                        hour: "numeric",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </span>
                                                                {entry.mood && (() => {
                                                                    const mood = moodOptions.find(m => m.value === entry.mood)
                                                                    if (!mood) return null
                                                                    return (
                                                                        <div className="flex items-center gap-1.5" title={`Mood: ${mood.label}`}>
                                                                            <mood.icon className={`w-4 h-4 ${mood.color}`} />
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                {!entry.convertedTo && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => convertEntry(entry.id, "task")}
                                                                            className="p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                                                                            title="Convert to Task"
                                                                        >
                                                                            <CheckSquare className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => convertEntry(entry.id, "note")}
                                                                            className="p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                                                                            title="Convert to Note"
                                                                        >
                                                                            <FileText className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    onClick={() => deleteEntry(entry.id)}
                                                                    className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                                                {entry.content}
                                                            </p>
                                                        </div>

                                                        {/* Footer info */}
                                                        {entry.convertedTo && (
                                                            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border/30">
                                                                <span className="text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded flex items-center gap-1">
                                                                    <Sparkles className="w-3 h-3" />
                                                                    Converted to {entry.convertedTo.split(":")[0]}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    )
}
