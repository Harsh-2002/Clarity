"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function AppNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/transcribe" className="font-semibold hover:text-primary transition-colors">
            Audio Transcriber
          </Link>
          <div className="hidden sm:flex gap-1">
            <Button asChild variant={isActive("/transcribe") ? "default" : "ghost"} className="h-8">
              <Link href="/transcribe">Transcribe</Link>
            </Button>
            <Button asChild variant={isActive("/transcripts") ? "default" : "ghost"} className="h-8">
              <Link href="/transcripts">Transcripts</Link>
            </Button>
            <Button asChild variant={isActive("/settings") ? "default" : "ghost"} className="h-8">
              <Link href="/settings">Settings</Link>
            </Button>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
