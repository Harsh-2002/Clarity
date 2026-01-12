"use client"

import { useState, KeyboardEvent } from "react"
import { Link2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface AddBookmarkInputProps {
    onAdd: (bookmark: any) => void
    onLoading: (loading: boolean) => void
}

export function AddBookmarkInput({ onAdd, onLoading }: AddBookmarkInputProps) {
    const [url, setUrl] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        const trimmedUrl = url.trim()
        if (!trimmedUrl) return

        // Basic URL validation
        let finalUrl = trimmedUrl
        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            finalUrl = 'https://' + trimmedUrl
        }

        setIsSubmitting(true)
        onLoading(true)

        try {
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: finalUrl }),
            })

            const data = await res.json()

            if (res.status === 409) {
                toast.info("Bookmark already exists")
                onAdd(data.bookmark)
            } else if (res.ok) {
                toast.success("Bookmark saved!")
                onAdd(data)
            } else {
                throw new Error(data.error || 'Failed to save bookmark')
            }

            setUrl("")
        } catch (error: any) {
            toast.error(error.message || "Failed to save bookmark")
        } finally {
            setIsSubmitting(false)
            onLoading(false)
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isSubmitting) {
            handleSubmit()
        }
    }

    return (
        <div className="relative">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste a link and press Enter..."
                className="pl-12 pr-12 h-12 text-base rounded-full border-border/50 bg-secondary/30 focus:bg-background transition-colors"
                disabled={isSubmitting}
            />
            {isSubmitting && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
        </div>
    )
}
