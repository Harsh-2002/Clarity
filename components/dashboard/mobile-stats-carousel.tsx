"use client"

import { BookMarked, Calendar, FileText, CheckCircle2, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Stats {
    notes: number
    pendingTasks: number
    completedTasks: number
    journals?: number
    bookmarks?: number
}

export function MobileStatsCarousel({ stats }: { stats: Stats }) {
    const items = [
        {
            label: "Pending",
            value: stats.pendingTasks,
            icon: Clock,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10"
        },
        {
            label: "Notes",
            value: stats.notes,
            icon: BookMarked,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            label: "Done",
            value: stats.completedTasks,
            icon: CheckCircle2,
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            label: "Journal",
            value: stats.journals ?? 0,
            icon: Calendar,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            label: "Bookmarks",
            value: stats.bookmarks ?? 0,
            icon: FileText,
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        }
    ]

    return (
        <div className="flex overflow-x-auto gap-3 pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
            {items.map((item) => (
                <div key={item.label} className="snap-start shrink-0">
                    <Card className="rounded-2xl border-border/50 bg-secondary/20 w-32">
                        <CardContent className="p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", item.bg, item.color)}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className={cn("text-xl font-bold", item.color)}>{item.value}</span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
    )
}
