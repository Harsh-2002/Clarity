"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Globe, RefreshCw, Check, X, Copy, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/storage"
import { toast } from "sonner"

interface SlugEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentSlug: string
    isPublished: boolean
    noteId: string
    onSuccess: (slug: string, isPublished: boolean) => void
}

export function SlugEditorDialog({
    open,
    onOpenChange,
    currentSlug,
    isPublished,
    noteId,
    onSuccess
}: SlugEditorDialogProps) {
    const [slug, setSlug] = useState(currentSlug)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [generatedSlug, setGeneratedSlug] = useState("")

    const generateRandomSlug = () => {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        let result = ""
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setSlug(result)
        setGeneratedSlug(result)
    }

    const handleSave = async () => {
        // Basic validation
        if (!slug || slug.length < 3) {
            setError("Slug must be at least 3 characters")
            return
        }

        const validSlugRegex = /^[a-z0-9-]+$/
        if (!validSlugRegex.test(slug)) {
            setError("Slug can only contain lowercase letters, numbers, and hyphens")
            return
        }

        setLoading(true)
        setError("")

        try {
            const action = isPublished ? 'updateSlug' : 'publish'

            const data = await apiFetch<any>(`/notes/${noteId}/publish`, {
                method: "POST",
                body: JSON.stringify({
                    action,
                    slug
                })
            })

            if (data.success) {
                onSuccess(data.slug, data.isPublished)
                onOpenChange(false)
                toast.success(isPublished ? "URL updated successfully" : "Note published successfully")
            } else {
                setError(data.error || "Failed to save settings")
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    const handleUnpublish = async () => {
        if (!confirm("Are you sure you want to unpublish this note? It will no longer be accessible via the public link.")) return

        setLoading(true)
        try {
            const data = await apiFetch<any>(`/notes/${noteId}/publish`, {
                method: "POST",
                body: JSON.stringify({ action: 'unpublish' })
            })

            if (data.success) {
                onSuccess(data.slug, false)
                onOpenChange(false)
                toast.success("Note unpublished")
            }
        } catch (err: any) {
            console.error(err)
            toast.error("Failed to unpublish note")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Public URL</DialogTitle>
                    <DialogDescription>
                        Customize the URL for your published note.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 flex items-center border rounded-md px-3 h-10 text-muted-foreground text-sm overflow-hidden">
                                <span className="whitespace-nowrap text-muted-foreground">/p/</span>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => {
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                                        setError("")
                                    }}
                                    className="border-0 shadow-none focus-visible:ring-0 px-1 h-auto bg-transparent flex-1 text-foreground"
                                    placeholder="custom-slug"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={generateRandomSlug}
                                title="Generate random slug"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <p className="text-xs text-muted-foreground">
                            Public link: {typeof window !== "undefined" ? window.location.host : ''}/p/{slug || '...'}
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2">
                    {isPublished && (
                        <Button variant="destructive" className="text-destructive hover:bg-destructive/10 border-destructive/20" onClick={handleUnpublish} disabled={loading}>
                            Unpublish
                        </Button>
                    )}

                    <div className="flex gap-2 justify-end flex-1">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
