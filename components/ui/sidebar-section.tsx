"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Star, Clock, Folder, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarSectionProps {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
}

export function SidebarSection({ title, icon, children, defaultOpen = true }: SidebarSectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    return (
        <div className="mb-4">
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between hover:bg-secondary/50 mb-1 h-8 px-2 font-medium text-muted-foreground"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="flex items-center gap-2">
                    {icon}
                    {title}
                </span>
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
            {isOpen && <div className="pl-4 space-y-1">{children}</div>}
        </div>
    )
}

export function SidebarItem({ href, title, icon, active, id }: { href: string; title: string; icon?: React.ReactNode; active?: boolean; id?: string }) {
    return (
        <Link href={href} id={id}>
            <Button
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn("w-full justify-start h-8 px-2 font-normal", active && "bg-secondary font-medium text-foreground")}
            >
                {icon && <span className="mr-2 text-muted-foreground">{icon}</span>}
                {title}
            </Button>
        </Link>
    )
}
