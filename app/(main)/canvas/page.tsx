"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Plus, Trash2, PenTool, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Canvas {
    id: string
    name: string
    thumbnail: string | null
    createdAt: string
    updatedAt: string
}

const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
const slideUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

export default function CanvasListPage() {
    const [canvases, setCanvases] = useState<Canvas[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [canvasToDelete, setCanvasToDelete] = useState<Canvas | null>(null)
    const router = useRouter()

    const fetchCanvases = async () => {
        try {
            const res = await fetch("/api/canvas")
            if (res.ok) {
                setCanvases(await res.json())
            }
        } catch (error) {
            console.error("Failed to fetch canvases:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCanvases()
    }, [])

    const createNewCanvas = async () => {
        const id = crypto.randomUUID()
        try {
            const res = await fetch("/api/canvas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name: "Untitled Canvas", data: "{}" })
            })
            if (res.ok) {
                router.push(`/canvas/${id}`)
            }
        } catch (error) {
            toast.error("Failed to create canvas")
        }
    }

    const deleteCanvas = async () => {
        if (!canvasToDelete) return
        try {
            await fetch(`/api/canvas/${canvasToDelete.id}`, { method: "DELETE" })
            setCanvases(prev => prev.filter(c => c.id !== canvasToDelete.id))
            toast.success("Canvas deleted")
        } catch (error) {
            toast.error("Failed to delete canvas")
        } finally {
            setDeleteDialogOpen(false)
            setCanvasToDelete(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
    }

    return (
        <div className="min-h-screen p-6 md:pl-24 pt-10 md:pt-20">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <motion.div {...fadeIn} className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Canvas</h1>
                        <p className="text-muted-foreground">
                            Create diagrams, sketches, and visual notes
                        </p>
                    </div>
                    <Button onClick={createNewCanvas} className="rounded-full gap-2">
                        <Plus className="w-4 h-4" />
                        New Canvas
                    </Button>
                </motion.div>

                {/* Canvas Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-3xl bg-secondary/50 animate-pulse" />
                        ))}
                    </div>
                ) : canvases.length === 0 ? (
                    <motion.div {...slideUp} className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                            <PenTool className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No canvases yet</h2>
                        <p className="text-muted-foreground mb-6">Create your first canvas to start drawing</p>
                        <Button onClick={createNewCanvas} className="rounded-full gap-2">
                            <Plus className="w-4 h-4" />
                            Create Canvas
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div {...slideUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {canvases.map((canvas, idx) => (
                            <motion.div
                                key={canvas.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="group rounded-3xl border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
                                    <Link href={`/canvas/${canvas.id}`}>
                                        <div className="h-32 bg-secondary/30 flex items-center justify-center">
                                            {canvas.thumbnail ? (
                                                <Image
                                                    src={canvas.thumbnail}
                                                    alt={canvas.name}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <PenTool className="w-10 h-10 text-muted-foreground/30" />
                                            )}
                                        </div>
                                    </Link>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <Link href={`/canvas/${canvas.id}`} className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                                                {canvas.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(canvas.updatedAt)}
                                            </p>
                                        </Link>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => {
                                                        setCanvasToDelete(canvas)
                                                        setDeleteDialogOpen(true)
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Canvas</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{canvasToDelete?.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteCanvas} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
