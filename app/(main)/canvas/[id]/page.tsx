"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"

// Dynamically import Tldraw to avoid SSR issues
const TldrawEditor = dynamic(() => import("@/components/canvas/canvas-editor"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
    )
})

interface Canvas {
    id: string
    name: string
    data: string
    updatedAt: string
}

export default function CanvasEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const [canvas, setCanvas] = useState<Canvas | null>(null)
    const [name, setName] = useState("")
    const [isEditingName, setIsEditingName] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const resolvedParams = useRef<{ id: string } | null>(null)
    const router = useRouter()

    const fetchCanvas = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/canvas/${id}`)
            if (res.ok) {
                const data = await res.json()
                setCanvas(data)
                setName(data.name)
            } else {
                toast.error("Canvas not found")
                router.push("/canvas")
            }
        } catch (error) {
            toast.error("Failed to load canvas")
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => {
        params.then(p => {
            resolvedParams.current = p
            fetchCanvas(p.id)
        })
    }, [params, fetchCanvas])

    const saveName = async () => {
        if (!resolvedParams.current || !name.trim()) return
        setIsEditingName(false)
        try {
            await fetch(`/api/canvas/${resolvedParams.current.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() })
            })
        } catch (error) {
            toast.error("Failed to save name")
        }
    }

    const handleSave = useCallback(async (data: string) => {
        if (!resolvedParams.current) return
        setSaving(true)
        try {
            await fetch(`/api/canvas/${resolvedParams.current.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data })
            })
        } catch (error) {
            console.error("Failed to save canvas:", error)
        } finally {
            setSaving(false)
        }
    }, [])

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full" asChild>
                        <Link href="/canvas">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    {isEditingName ? (
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={(e) => e.key === "Enter" && saveName()}
                            className="w-48 h-8 text-sm"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditingName(true)}
                            className="font-medium hover:text-primary transition-colors"
                        >
                            {name || "Untitled Canvas"}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {saving ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-3 h-3" />
                            <span>Saved</span>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
                {canvas && (
                    <TldrawEditor
                        initialData={canvas.data}
                        onSave={handleSave}
                    />
                )}
            </div>
        </div>
    )
}
