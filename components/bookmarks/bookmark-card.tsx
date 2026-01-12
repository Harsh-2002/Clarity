"use client"

import { ExternalLink, X, Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Bookmark {
    id: string
    url: string
    title: string | null
    description: string | null
    image: string | null
    favicon: string | null
    createdAt: string
}

interface BookmarkCardProps {
    bookmark: Bookmark
    onDelete: (id: string) => void
}

export function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
    const domain = new URL(bookmark.url).hostname.replace('www.', '')

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/bookmarks?id=${bookmark.id}`, { method: 'DELETE' })
            if (res.ok) {
                onDelete(bookmark.id)
                toast.success("Bookmark removed")
            }
        } catch {
            toast.error("Failed to delete bookmark")
        }
    }

    return (
        <Card className="group relative overflow-hidden border-border/50 bg-background hover:shadow-lg transition-all duration-300">
            {/* Delete Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-7 w-7 opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-all"
                onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                }}
            >
                <X className="h-4 w-4" />
            </Button>

            {/* Clickable Link Wrapper */}
            <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
            >
                {/* Cover Image */}
                {bookmark.image ? (
                    <div className="aspect-video w-full overflow-hidden bg-secondary">
                        <img
                            src={bookmark.image}
                            alt={bookmark.title || 'Bookmark'}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                            }}
                        />
                    </div>
                ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/5 to-secondary/20 flex items-center justify-center">
                        <Globe className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-2">
                    {/* Title */}
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {bookmark.title || bookmark.url}
                    </h3>

                    {/* Description */}
                    {bookmark.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {bookmark.description}
                        </p>
                    )}

                    {/* Footer: Favicon + Domain */}
                    <div className="flex items-center gap-2 pt-2">
                        {bookmark.favicon && (
                            <img
                                src={bookmark.favicon}
                                alt=""
                                className="h-4 w-4 rounded-sm"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                }}
                            />
                        )}
                        <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            {domain}
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                    </div>
                </div>
            </a>
        </Card>
    )
}

// Skeleton for loading state
export function BookmarkCardSkeleton() {
    return (
        <Card className="overflow-hidden border-border/50">
            <div className="aspect-video w-full bg-secondary animate-pulse" />
            <div className="p-4 space-y-3">
                <div className="h-4 bg-secondary rounded animate-pulse w-3/4" />
                <div className="h-3 bg-secondary rounded animate-pulse w-full" />
                <div className="h-3 bg-secondary rounded animate-pulse w-1/2" />
                <div className="flex items-center gap-2 pt-2">
                    <div className="h-4 w-4 bg-secondary rounded animate-pulse" />
                    <div className="h-3 bg-secondary rounded animate-pulse w-24" />
                </div>
            </div>
        </Card>
    )
}
