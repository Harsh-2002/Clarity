"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mic, History, Settings, BookMarked, ListTodo, Columns3, Home, Calendar, PenTool, BookOpen, ChevronLeft, ChevronRight, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SidebarSection, SidebarItem } from "@/components/ui/sidebar-section"

export function Sidebar() {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = React.useState(false)

    // Persist collapse state
    React.useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed")
        if (stored) setIsCollapsed(JSON.parse(stored))
    }, [])

    const toggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
        // Dispatch event for layout transition
        window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: newState }))
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
        <aside
            className={cn(
                "fixed left-0 top-0 h-full z-40 bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header / Logo */}
            <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border">
                {!isCollapsed && (
                    <span className="font-semibold text-lg tracking-tight px-2">Clarity</span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapse}
                    className={cn("h-8 w-8", isCollapsed && "mx-auto")}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
            </div>

            {/* Navigation */}
            <div id="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
                {isCollapsed ? (
                    // Icon only mode
                    <div className="flex flex-col items-center space-y-2">
                        {navGroups.flatMap(g => g.items).map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "p-2 rounded-lg transition-colors relative group",
                                    pathname === item.href
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                {item.icon}
                                <span className="sr-only">{item.label}</span>
                                {/* Tooltip */}
                                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-border shadow-sm">
                                    {item.label}
                                </div>
                            </Link>
                        ))}
                        <div className="h-px w-8 bg-border my-2" />
                        <Link
                            id="settings-btn"
                            href="/settings"
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                pathname === "/settings"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                            aria-label="Settings"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="sr-only">Settings</span>
                        </Link>
                    </div>
                ) : (
                    // Expanded mode
                    <>
                        {/* Favorites Section (Dummy for now) */}
                        <SidebarSection title="Favorites" icon={<Star className="w-4 h-4" />}>
                            <SidebarItem href="/dashboard" title="Dashboard" icon={<Home className="w-4 h-4" />} active={pathname === "/dashboard"} />
                            <SidebarItem href="/notes" title="All Notes" icon={<BookMarked className="w-4 h-4" />} active={pathname === "/notes"} />
                        </SidebarSection>

                        {navGroups.map((group, idx) => (
                            <SidebarSection key={group.title} title={group.title} icon={group.icon}>
                                {group.items.map(item => (
                                    <SidebarItem
                                        key={item.href}
                                        href={item.href}
                                        title={item.label}
                                        icon={item.icon}
                                        active={pathname === item.href}
                                    />
                                ))}
                            </SidebarSection>
                        ))}

                        <div className="pt-4 mt-4 border-t border-sidebar-border">
                            <SidebarItem id="settings-btn" href="/settings" title="Settings" icon={<Settings className="w-4 h-4" />} active={pathname === "/settings"} />
                        </div>
                    </>
                )}
            </div>
        </aside>
    )
}
