"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Tag, Search, FileText, CheckSquare, PenTool, BookOpen, Mic, X, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface TagInfo {
    name: string
    count: number
    sources: string[]
}

interface SearchResult {
    type: string
    id: string
    title: string
    preview: string
    tags: string[]
    updatedAt: string
}

const typeIcons: Record<string, typeof FileText> = {
    note: FileText,
    task: CheckSquare,
    canvas: PenTool,
    journal: BookOpen,
    transcript: Mic,
}

const typeLinks: Record<string, (id: string) => string> = {
    note: (id) => `/notes?id=${id}`,
    task: () => `/tasks`,
    canvas: (id) => `/canvas/${id}`,
    journal: () => `/journal`,
    transcript: () => `/transcripts`,
}

export default function TagsPage() {
    const [tags, setTags] = useState<TagInfo[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(true)
    const [searching, setSearching] = useState(false)

    // Fetch all tags
    const fetchTags = useCallback(async () => {
        try {
            const res = await fetch("/api/tags")
            if (res.ok) {
                const data = await res.json()
                setTags(data)
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchTags()
    }, [fetchTags])

    // Search when query or tag changes
    useEffect(() => {
        const search = async () => {
            if (!searchQuery && !selectedTag) {
                setSearchResults([])
                return
            }

            setSearching(true)
            try {
                const params = new URLSearchParams()
                if (searchQuery) params.set("q", searchQuery)
                if (selectedTag) params.set("tag", selectedTag)
                params.set("limit", "30")

                const res = await fetch(`/api/search?${params}`)
                if (res.ok) {
                    const data = await res.json()
                    setSearchResults(data)
                }
            } catch (error) {
                console.error("Search failed:", error)
            } finally {
                setSearching(false)
            }
        }

        const debounce = setTimeout(search, 300)
        return () => clearTimeout(debounce)
    }, [searchQuery, selectedTag])

    const clearFilters = () => {
        setSearchQuery("")
        setSelectedTag(null)
        setSearchResults([])
    }

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Tag className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold">Tags & Search</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Browse all tags and search across your content
                    </p>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notes, tasks, canvases..."
                            className="pl-12 pr-12 h-12 rounded-full bg-secondary/50"
                        />
                        {(searchQuery || selectedTag) && (
                            <button
                                onClick={clearFilters}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Active Tag Filter */}
                    {selectedTag && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Filtering by:</span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                                #{selectedTag}
                                <button onClick={() => setSelectedTag(null)} className="ml-1">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        </div>
                    )}
                </motion.div>

                {/* Tags Cloud */}
                {!searchQuery && !selectedTag && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <h2 className="text-lg font-semibold mb-4">All Tags</h2>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : tags.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">
                                <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No tags found.</p>
                                <p className="text-sm">Add tags to your notes, tasks, or canvases to organize your content.</p>
                            </Card>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, i) => (
                                    <motion.button
                                        key={tag.name}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.02 }}
                                        onClick={() => setSelectedTag(tag.name)}
                                        className="group px-4 py-2 bg-secondary/50 hover:bg-primary/10 rounded-full transition-all flex items-center gap-2"
                                    >
                                        <span className="text-primary">#</span>
                                        <span>{tag.name}</span>
                                        <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                                            {tag.count}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Search Results */}
                {(searchQuery || selectedTag) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <h2 className="text-lg font-semibold mb-4">
                            {searching ? "Searching..." : `${searchResults.length} results`}
                        </h2>

                        {searching ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : searchResults.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No results found.</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {searchResults.map((result, i) => {
                                        const Icon = typeIcons[result.type] || FileText
                                        const href = typeLinks[result.type]?.(result.id) || "#"

                                        return (
                                            <motion.div
                                                key={`${result.type}-${result.id}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                            >
                                                <Link href={href}>
                                                    <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-secondary rounded-lg">
                                                                <Icon className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="font-medium truncate">{result.title}</h3>
                                                                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <p className="text-sm text-muted-foreground truncate">
                                                                    {result.preview}
                                                                </p>
                                                                {result.tags.length > 0 && (
                                                                    <div className="flex gap-1 mt-2 flex-wrap">
                                                                        {result.tags.slice(0, 3).map(tag => (
                                                                            <span
                                                                                key={tag}
                                                                                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                                                                            >
                                                                                #{tag}
                                                                            </span>
                                                                        ))}
                                                                        {result.tags.length > 3 && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                +{result.tags.length - 3} more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground capitalize">
                                                                {result.type}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                </Link>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
