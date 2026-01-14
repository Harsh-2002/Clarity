"use client"

import { Drawer } from "vaul"
import { Plus, PenTool, Mic, BookOpen, ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function CaptureSheet() {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const handleNavigate = (path: string) => {
        router.push(path)
        setOpen(false)
    }

    return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>
                <div className="relative -top-5">
                    <Button
                        id="capture-hub-btn"
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-xl bg-primary text-primary-foreground hover:scale-105 transition-transform border-4 border-background"
                    >
                        <Plus className="w-7 h-7" />
                    </Button>
                </div>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[45%] fixed bottom-0 left-0 right-0 z-50 border-t border-border outline-none">
                    <div className="p-4 bg-background rounded-t-[20px] flex-1">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />
                        <div className="max-w-md mx-auto">
                            <Drawer.Title className="font-medium text-lg mb-6 text-center">Create New</Drawer.Title>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-28 flex flex-col gap-3 hover:bg-secondary/50 border-border/50 rounded-2xl"
                                    onClick={() => handleNavigate('/notes?new=true')}
                                >
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <span className="font-medium">Note</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-28 flex flex-col gap-3 hover:bg-secondary/50 border-border/50 rounded-2xl"
                                    onClick={() => handleNavigate('/transcribe')}
                                >
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                        <Mic className="w-6 h-6" />
                                    </div>
                                    <span className="font-medium">Voice Memo</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-28 flex flex-col gap-3 hover:bg-secondary/50 border-border/50 rounded-2xl"
                                    onClick={() => handleNavigate('/tasks')}
                                >
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                        <ListTodo className="w-6 h-6" />
                                    </div>
                                    <span className="font-medium">Task</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-28 flex flex-col gap-3 hover:bg-secondary/50 border-border/50 rounded-2xl"
                                    onClick={() => handleNavigate('/canvas?new=true')}
                                >
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                                        <PenTool className="w-6 h-6" />
                                    </div>
                                    <span className="font-medium">Canvas</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
