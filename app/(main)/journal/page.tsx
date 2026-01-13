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
        <div className="min-h-screen p-6 md:pl-24 pb-24">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Daily Journal</h1>
                    <p className="text-muted-foreground">
                        Capture your thoughts, ideas, and reflections
                    </p>
                </motion.div>

                {/* Quick Capture */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-4 mb-8 bg-card/50 backdrop-blur-sm border-primary/20">
                        <div className="text-sm text-muted-foreground mb-3 italic">
                            {dailyPrompt}
                        </div>
                        <textarea
                            value={newEntry}
                            onChange={(e) => setNewEntry(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What's on your mind?"
                            className="w-full min-h-[100px] p-3 bg-background/50 border border-border rounded-2xl resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />

                        {/* Mood Selector */}
                        <div className="flex items-center justify-between mt-3">
                            <div className="flex gap-2">
                                {moodOptions.map((mood) => (
                                    <button
                                        key={mood.value}
                                        onClick={() => setSelectedMood(selectedMood === mood.value ? null : mood.value)}
                                        className={`p-2 rounded-full transition-all ${selectedMood === mood.value
                                            ? "bg-primary/20 scale-110"
                                            : "hover:bg-secondary"
                                            }`}
                                        title={mood.label}
                                    >
                                        <mood.icon className={`w-5 h-5 ${mood.color}`} />
                                    </button>
                                ))}
                            </div>
                            <Button
                                onClick={addEntry}
                                disabled={!newEntry.trim() || submitting}
                                className="rounded-full"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Entry
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Press ⌘+Enter to save
                        </p>
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
                        <p>No journal entries yet.</p>
                        <p className="text-sm">Start capturing your thoughts above!</p>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        <AnimatePresence>
                            {Object.entries(groupedEntries).map(([date, dateEntries]) => (
                                <motion.div
                                    key={date}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <h2 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                                        {date}
                                    </h2>
                                    <div className="space-y-3">
                                        {dateEntries.map((entry) => (
                                            <motion.div
                                                key={entry.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="group"
                                            >
                                                <Card className={`p-4 hover:shadow-md transition-all ${entry.convertedTo ? "opacity-60" : ""
                                                    }`}>
                                                    <div className="flex items-start gap-3">
                                                        {/* Time */}
                                                        <div className="text-xs text-muted-foreground min-w-[50px] pt-1">
                                                            {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            })}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1">
                                                            <p className="text-sm whitespace-pre-wrap">{entry.content}</p>

                                                            {/* Mood Badge */}
                                                            {entry.mood && (
                                                                <div className="mt-2">
                                                                    {(() => {
                                                                        const mood = moodOptions.find(m => m.value === entry.mood)
                                                                        if (!mood) return null
                                                                        return (
                                                                            <span className={`inline-flex items-center gap-1 text-xs ${mood.color}`}>
                                                                                <mood.icon className="w-3 h-3" />
                                                                                {mood.label}
                                                                            </span>
                                                                        )
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {/* Converted Badge */}
                                                            {entry.convertedTo && (
                                                                <div className="mt-2 text-xs text-muted-foreground">
                                                                    Converted to {entry.convertedTo.split(":")[0]}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {!entry.convertedTo && (
                                                                <>
                                                                    <button
                                                                        onClick={() => convertEntry(entry.id, "task")}
                                                                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                                                        title="Convert to Task"
                                                                    >
                                                                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => convertEntry(entry.id, "note")}
                                                                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                                                        title="Convert to Note"
                                                                    >
                                                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => deleteEntry(entry.id)}
                                                                className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                                            </button>
                                                        </div>
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
