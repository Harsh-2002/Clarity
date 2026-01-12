"use client"

import { Drawer } from "vaul"
import { Plus, PenTool, Mic, BookOpen, ListTodo, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function MobileDrawer() {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const handleNavigate = (path: string) => {
        router.push(path)
        setOpen(false)
    }

    return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>
                <Button
                    id="quick-create-btn"
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:scale-105 transition-transform"
                >
                    <Plus className="w-6 h-6" />
                </Button>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[45%] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-border outline-none">
                    <div className="p-4 bg-background rounded-t-[10px] flex-1">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />
                        <div className="max-w-md mx-auto">
                            <Drawer.Title className="font-medium text-lg mb-4 text-center">Quick Create</Drawer.Title>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2 hover:bg-secondary/50 border-border/50"
                                    onClick={() => handleNavigate('/notes?new=true')}
                                >
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <span>New Note</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2 hover:bg-secondary/50 border-border/50"
                                    onClick={() => handleNavigate('/transcribe')}
                                >
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                        <Mic className="w-6 h-6" />
                                    </div>
                                    <span>Record</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2 hover:bg-secondary/50 border-border/50"
                                    onClick={() => handleNavigate('/tasks')}
                                >
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                        <ListTodo className="w-6 h-6" />
                                    </div>
                                    <span>New Task</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2 hover:bg-secondary/50 border-border/50"
                                    onClick={() => handleNavigate('/canvas?new=true')}
                                >
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                                        <PenTool className="w-6 h-6" />
                                    </div>
                                    <span>New Canvas</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
