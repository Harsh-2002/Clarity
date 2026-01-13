"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Bookmark, Link2, Loader2 } from "lucide-react"
import { BookmarkCard, BookmarkCardSkeleton } from "@/components/bookmarks/bookmark-card"
import { AddBookmarkInput } from "@/components/bookmarks/add-bookmark-input"
import { toast } from "sonner"

interface BookmarkData {
    id: string
    url: string
    title: string | null
    description: string | null
    image: string | null
    favicon: string | null
    createdAt: string
}

const fadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
}

// URL validation regex
const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<BookmarkData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        fetchBookmarks()
    }, [])

    // Handle direct paste anywhere on the page
    const handlePaste = useCallback(async (e: ClipboardEvent) => {
        // Don't intercept if user is focused on an input
        const activeElement = document.activeElement
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
            return
        }

        const pastedText = e.clipboardData?.getData('text')?.trim()
        if (!pastedText) return

        // Check if it looks like a URL
        let url = pastedText
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Check if it's a valid domain format before prepending https
            if (urlRegex.test(url) || url.includes('.')) {
                url = 'https://' + url
            } else {
                return // Not a URL, ignore
            }
        }

        // Validate URL format
        try {
            new URL(url)
        } catch {
            return // Invalid URL
        }

        e.preventDefault()
        setIsAdding(true)

        try {
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            })

            const data = await res.json()

            if (res.status === 409) {
                toast.info("Bookmark already exists")
                handleAddBookmark(data.bookmark)
            } else if (res.ok) {
                toast.success("Bookmark saved!")
                handleAddBookmark(data)
            } else {
                throw new Error(data.error || 'Failed to save bookmark')
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save bookmark")
        } finally {
            setIsAdding(false)
        }
    }, [])

    useEffect(() => {
        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    }, [handlePaste])

    const fetchBookmarks = async () => {
        try {
            const res = await fetch('/api/bookmarks')
            if (res.ok) {
                const data = await res.json()
                setBookmarks(data)
            }
        } catch (error) {
            console.error('Failed to fetch bookmarks:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddBookmark = (newBookmark: BookmarkData) => {
        setBookmarks(prev => {
            // Check if already exists (for 409 case)
            if (prev.some(b => b.id === newBookmark.id)) {
                return prev
            }
            return [newBookmark, ...prev]
        })
    }

    const handleDeleteBookmark = (id: string) => {
        setBookmarks(prev => prev.filter(b => b.id !== id))
    }

    return (
        <div className="min-h-screen p-6 md:pl-24">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <motion.div {...fadeIn} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
                        <p className="text-muted-foreground">
                            {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </motion.div>

                {/* Add Bookmark Input */}
                <motion.div {...fadeIn} className="max-w-2xl">
                    <AddBookmarkInput
                        onAdd={handleAddBookmark}
                        onLoading={setIsAdding}
                    />
                </motion.div>

                {/* Bookmarks Grid */}
                <motion.div {...fadeIn}>
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <BookmarkCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : bookmarks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/50">
                            <div className="p-3 rounded-full bg-background mb-4">
                                <Bookmark className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-medium">No bookmarks yet</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Paste a URL above to save your first bookmark with a rich preview.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Adding skeleton */}
                            {isAdding && <BookmarkCardSkeleton />}

                            {/* Bookmark Cards */}
                            {bookmarks.map((bookmark) => (
                                <BookmarkCard
                                    key={bookmark.id}
                                    bookmark={bookmark}
                                    onDelete={handleDeleteBookmark}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
