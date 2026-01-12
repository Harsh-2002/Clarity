"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bookmark, Link2, Loader2 } from "lucide-react"
import { BookmarkCard, BookmarkCardSkeleton } from "@/components/bookmarks/bookmark-card"
import { AddBookmarkInput } from "@/components/bookmarks/add-bookmark-input"

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

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<BookmarkData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        fetchBookmarks()
    }, [])

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
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <motion.div {...fadeIn} className="space-y-2">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Bookmark className="h-6 w-6 text-primary" />
                        </div>
                        Bookmarks
                    </h1>
                    <p className="text-muted-foreground">
                        Save links with rich previews. Paste a URL below to get started.
                    </p>
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
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-full bg-secondary/50 mb-4">
                                <Link2 className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-medium text-muted-foreground">No bookmarks yet</h3>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                Paste a link above to save your first bookmark
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
