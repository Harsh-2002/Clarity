"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mic, History, Settings, BookMarked } from "lucide-react"
import { cn } from "@/lib/utils"

export function MinimalNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/transcribe", icon: Mic, label: "Transcribe" },
    { href: "/transcripts", icon: History, label: "History" },
    { href: "/notes", icon: BookMarked, label: "Notes" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // Smooth scroll to top on navigation
    if (pathname !== href) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed left-0 top-0 h-full w-16 hidden md:flex flex-col items-center justify-center gap-8 z-50 bg-background/50 backdrop-blur-sm border-r border-border/50">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            className={cn(
              "p-3 rounded-full transition-all duration-300 group relative",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg scale-110"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:scale-105"
            )}
          >
            <item.icon 
              className={cn(
                "w-6 h-6 transition-all duration-300",
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

  const navItems = [
    { href: "/transcribe", icon: Mic, label: "Transcribe" },
    { href: "/transcripts", icon: History, label: "History" },
    { href: "/notes", icon: BookMarked, label: "Notes" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // Smooth scroll to top on navigation
    if (pathname !== href) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden z-50">
      <div className="flex items-center gap-2 p-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={cn(
                "p-3 rounded-full transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive && "scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className="sr-only">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
