"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mic, History, Settings, StickyNote, ListTodo, Columns3, Home, Calendar, PenTool, BookOpen, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
// import { MobileDrawer } from "@/components/mobile-drawer" // Deprecated
import { CaptureSheet } from "@/components/capture-sheet"
import { MobileMenuSheet } from "@/components/mobile-menu-sheet"

export function MinimalNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/journal", icon: BookOpen, label: "Journal" },
    { href: "/transcribe", icon: Mic, label: "Transcribe" },
    { href: "/transcripts", icon: History, label: "History" },
    { href: "/notes", icon: StickyNote, label: "Notes" },
    { href: "/tasks", icon: ListTodo, label: "Tasks" },
    { href: "/kanban", icon: Columns3, label: "Kanban" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
    { href: "/canvas", icon: PenTool, label: "Canvas" },
    { href: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // Smooth scroll to top on navigation
    if (pathname !== href) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav id="sidebar-nav" className="fixed left-0 top-0 h-full w-16 hidden md:flex flex-col items-center justify-center gap-6 z-50 bg-background/50 backdrop-blur-sm border-r border-border/50">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            id={item.href === "/settings" ? "settings-btn" : undefined}
            onClick={(e) => handleNavClick(e, item.href)}
            className={cn(
              "p-3 rounded-full transition-all duration-300 group relative",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg scale-110"
                : "text-muted-foreground bg-secondary/30 hover:text-foreground hover:bg-secondary/60 hover:scale-105"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 transition-all duration-300",
                isActive && "animate-pulse",
                !isActive && "group-hover:scale-110 group-hover:rotate-6"
              )}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className="sr-only">{item.label}</span>

            {/* Tooltip */}
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm border border-border">
              {item.label}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // Smooth scroll to top on navigation
    if (pathname !== href) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-24 md:hidden" />

      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50 pb-safe">
        {/* Glass Background */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-background/80 backdrop-blur-xl border-t border-border/50" />

        <div className="relative flex items-center justify-between px-6 h-16 pointer-events-none">
          {/* Left Items */}
          <Link
            href="/dashboard"
            onClick={(e) => handleNavClick(e, "/dashboard")}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors pointer-events-auto",
              pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Home className={cn("w-6 h-6 transition-transform", pathname === "/dashboard" && "scale-110")} strokeWidth={pathname === "/dashboard" ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            href="/notes"
            onClick={(e) => handleNavClick(e, "/notes")}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors pointer-events-auto",
              pathname.startsWith("/notes") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <StickyNote className={cn("w-6 h-6 transition-transform", pathname.startsWith("/notes") && "scale-110")} strokeWidth={pathname.startsWith("/notes") ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Notes</span>
          </Link>

          {/* Center Action Button */}
          <div className="flex flex-col items-center justify-center w-16 h-full -mt-6 pointer-events-auto">
            <CaptureSheet />
          </div>

          {/* Right Items */}
          <Link
            href="/tasks"
            onClick={(e) => handleNavClick(e, "/tasks")}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors pointer-events-auto",
              pathname === "/tasks" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <ListTodo className={cn("w-6 h-6 transition-transform", pathname === "/tasks" && "scale-110")} strokeWidth={pathname === "/tasks" ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Tasks</span>
          </Link>

          <div className="pointer-events-auto">
            <MobileMenuSheet />
          </div>
        </div>
      </nav>
    </>
  )
}
