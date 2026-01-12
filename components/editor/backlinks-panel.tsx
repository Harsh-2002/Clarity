"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Backlink {
    id: string
    title: string
    updatedAt: string
}

interface BacklinksPanelProps {
    noteId: string
    className?: string
}

export function BacklinksPanel({ noteId, className }: BacklinksPanelProps) {
    const [backlinks, setBacklinks] = useState<Backlink[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBacklinks = async () => {
            try {
                const res = await fetch(`/api/notes/${noteId}/backlinks`)
                if (res.ok) {
                    const data = await res.json()
                    setBacklinks(data.backlinks)
                }
            } catch (error) {
                console.error("Failed to fetch backlinks:", error)
            } finally {
                setLoading(false)
            }
        }

        if (noteId) {
            fetchBacklinks()
        }
    }, [noteId])

    if (loading) return null
    if (backlinks.length === 0) return null

    return (
        <div className={cn("mt-12 pt-8 border-t border-border", className)}>
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <Link2 className="w-4 h-4" />
                <h3 className="text-sm font-medium">Linked to this note</h3>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                    {backlinks.length}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {backlinks.map((link) => (
                    <Link
                        key={link.id}
                        href={`/notes?id=${link.id}`}
                        className="group flex flex-col p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/20 transition-all"
                    >
                        <span className="text-sm font-medium truncate mb-1 group-hover:text-primary transition-colors">
                            {link.title}
                        </span>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {new Date(link.updatedAt).toLocaleDateString()}
                            </span>
                            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
