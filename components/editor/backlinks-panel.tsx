"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
// Import apiFetch from storage
import { apiFetch } from "@/lib/storage"
import { formatRelativeTime } from "@/lib/format-time"
import { BookMarked, ArrowRight } from "lucide-react"

interface Backlink {
    id: string
    title: string
    updatedAt: number
}

interface BacklinksPanelProps {
    noteId: string
    className?: string
}

export function BacklinksPanel({ noteId, className }: BacklinksPanelProps) {
    const [backlinks, setBacklinks] = useState<Backlink[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        const loadBacklinks = async () => {
            try {
                setLoading(true)

                const data = await apiFetch<any>(`/notes/${noteId}/backlinks`)

                if (mounted) {
                    setBacklinks(data.backlinks || [])
                }
            } catch (err) {
                console.error("Failed to load backlinks:", err)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        if (noteId) {
            loadBacklinks()
        }

        return () => {
            mounted = false
        }
    }, [noteId])

    if (loading) {
        return <div className={cn("animate-pulse h-20 bg-secondary/20 rounded-xl", className)} />
    }

    if (backlinks.length === 0) {
        return null
    }

    return (
        <div className={cn("space-y-3", className)}>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Linked to this note
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {backlinks.map((note) => (
                    <div
                        key={note.id}
                        className="p-3 rounded-xl border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer group"
                    >
                        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {note.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <BookMarked className="w-3 h-3" />
                            {formatRelativeTime(note.updatedAt)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
