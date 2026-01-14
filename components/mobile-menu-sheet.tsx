"use client"

import { Drawer } from "vaul"
import { Menu, Calendar, Columns3, PenTool, BookOpen, Bookmark, History, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getAccessToken } from "@/lib/storage"

export function MobileMenuSheet() {
    const [open, setOpen] = useState(false)
    const [username, setUsername] = useState("User")
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = getAccessToken()
                if (!token) return

                const res = await fetch('/api/v1/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (res.ok) {
                    const data = await res.json()
                    if (data.username) {
                        setUsername(data.username)
                    }
                }
            } catch (err) {
                console.error('Failed to fetch user:', err)
            }
        }

        fetchUser()
    }, [])

    const menuItems = [
        { href: "/calendar", icon: Calendar, label: "Calendar", color: "text-orange-500 bg-orange-500/10" },
        { href: "/kanban", icon: Columns3, label: "Kanban", color: "text-blue-500 bg-blue-500/10" },
        { href: "/canvas", icon: PenTool, label: "Canvas", color: "text-pink-500 bg-pink-500/10" },
        { href: "/journal", icon: BookOpen, label: "Journal", color: "text-emerald-500 bg-emerald-500/10" },
        { href: "/bookmarks", icon: Bookmark, label: "Bookmarks", color: "text-yellow-500 bg-yellow-500/10" },
        { href: "/transcripts", icon: History, label: "History", color: "text-purple-500 bg-purple-500/10" },
    ]

    const handleNavigate = (path: string) => {
        router.push(path)
        setOpen(false)
    }

    return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>
                <div className={cn(
                    "flex flex-col items-center justify-center w-16 h-full gap-1 cursor-pointer group",
                    open ? "text-primary" : "text-muted-foreground"
                )}>
                    <Menu className="w-6 h-6 group-active:scale-90 transition-transform" />
                    <span className="text-[10px] font-medium">Menu</span>
                </div>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[60%] fixed bottom-0 left-0 right-0 z-50 border-t border-border outline-none">
                    <div className="p-4 bg-background rounded-t-[20px] flex-1 overflow-y-auto">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />

                        <Drawer.Title className="sr-only">Mobile Menu</Drawer.Title>

                        <div className="max-w-md mx-auto space-y-8">
                            {/* Profile / Settings Header */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{username}</span>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleNavigate('/settings')}>
                                    <Settings className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>

                            {/* Apps Grid */}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-4 px-2">Apps</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {menuItems.map((item) => (
                                        <button
                                            key={item.href}
                                            onClick={() => handleNavigate(item.href)}
                                            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                                        >
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-1", item.color)}>
                                                <item.icon className="w-7 h-7" />
                                            </div>
                                            <span className="text-xs font-medium text-center">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
