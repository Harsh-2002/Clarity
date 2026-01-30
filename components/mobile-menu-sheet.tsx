"use client"

import { Drawer } from "vaul"
import { Menu, Home, Calendar, ListTodo, Columns3, BookOpen, BookMarked, PenTool, Mic, History, Settings, User, Star, ChevronDown, ChevronRight, LogOut } from "lucide-react"
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

    const handleNavigate = (path: string) => {
        router.push(path)
        setOpen(false)
    }

    const navGroups = [
        {
            title: "Workspace",
            icon: <Home className="w-4 h-4" />,
            items: [
                { href: "/dashboard", icon: <Home className="w-4 h-4" />, label: "Home" },
                { href: "/calendar", icon: <Calendar className="w-4 h-4" />, label: "Calendar" },
                { href: "/tasks", icon: <ListTodo className="w-4 h-4" />, label: "Tasks" },
                { href: "/kanban", icon: <Columns3 className="w-4 h-4" />, label: "Kanban" },
            ]
        },
        {
            title: "Knowledge",
            icon: <BookOpen className="w-4 h-4" />,
            items: [
                { href: "/journal", icon: <BookOpen className="w-4 h-4" />, label: "Journal" },
                { href: "/notes", icon: <BookMarked className="w-4 h-4" />, label: "Notes" },
                { href: "/canvas", icon: <PenTool className="w-4 h-4" />, label: "Canvas" },
            ]
        },
        {
            title: "Capture",
            icon: <Mic className="w-4 h-4" />,
            items: [
                { href: "/transcribe", icon: <Mic className="w-4 h-4" />, label: "Transcribe" },
                { href: "/transcripts", icon: <History className="w-4 h-4" />, label: "Transcripts" },
            ]
        }
    ]

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
                <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[85%] fixed bottom-0 left-0 right-0 z-50 border-t border-border outline-none">
                    <div className="p-4 bg-background rounded-t-[20px] flex-1 overflow-y-auto">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />

                        <Drawer.Title className="sr-only">Mobile Menu</Drawer.Title>

                        <div className="max-w-md mx-auto space-y-6 pb-20">
                            {/* Profile Header */}
                            <div className="flex items-center justify-between px-2 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{username}</span>
                                        <span className="text-xs text-muted-foreground">Free Plan</span>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleNavigate('/settings')} aria-label="Go to settings">
                                    <Settings className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>

                            {/* Favorites Section */}
                            <div className="mb-6">
                                <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Favorites
                                </h3>
                                <div className="space-y-1">
                                    <MenuLink
                                        href="/dashboard"
                                        icon={<Home className="w-4 h-4" />}
                                        label="Dashboard"
                                        active={pathname === "/dashboard"}
                                        onClick={() => setOpen(false)}
                                    />
                                    <MenuLink
                                        href="/notes"
                                        icon={<BookMarked className="w-4 h-4" />}
                                        label="All Notes"
                                        active={pathname === "/notes"}
                                        onClick={() => setOpen(false)}
                                    />
                                </div>
                            </div>

                            {/* Navigation Groups */}
                            {navGroups.map((group) => (
                                <div key={group.title} className="mb-6">
                                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                        {group.icon} {group.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.items.map((item) => (
                                            <MenuLink
                                                key={item.href}
                                                href={item.href}
                                                icon={item.icon}
                                                label={item.label}
                                                active={pathname === item.href}
                                                onClick={() => setOpen(false)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Footer Actions */}
                            <div className="pt-4 border-t border-border mt-4">
                                <MenuLink
                                    href="/settings"
                                    icon={<Settings className="w-4 h-4" />}
                                    label="Settings"
                                    active={pathname === "/settings"}
                                    onClick={() => setOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}

function MenuLink({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <Link href={href} onClick={onClick} className="block">
            <Button
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                    "w-full justify-start h-10 px-4 font-normal text-sm",
                    active && "bg-secondary font-medium text-foreground"
                )}
            >
                <span className="mr-3 text-muted-foreground">{icon}</span>
                {label}
            </Button>
        </Link>
    )
}
