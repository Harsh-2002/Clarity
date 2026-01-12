"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarDays, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface HistoryEvent {
    text: string
    html: string
    links: Record<string, Record<string, string>>
}

interface HistoryData {
    info: string
    date: string
    data: {
        Events: HistoryEvent[]
        Births: HistoryEvent[]
        Deaths: HistoryEvent[]
    }
}

export function OnThisDayWidget() {
    const [history, setHistory] = useState<HistoryData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const today = new Date()
                const month = today.getMonth() + 1
                const day = today.getDate()

                const res = await fetch(`/api/external/zen/history?month=${month}&day=${day}`)
                if (!res.ok) throw new Error("Failed to fetch history")

                const data = await res.json()
                setHistory(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchHistory()
    }, [])

    const renderEventList = (events: HistoryEvent[]) => {
        if (!events || events.length === 0) return <p className="text-sm text-muted-foreground">No events found.</p>

        // Show top 20 events, let card expand naturally
        return (
            <div className="space-y-4 px-1">
                {events.slice(0, 20).map((item, idx) => (
                    <div key={idx} className="text-sm border-l-2 border-primary/20 pl-4 py-2 hover:bg-secondary/30 rounded-r-lg transition-colors">
                        <div dangerouslySetInnerHTML={{ __html: item.html }} className="prose prose-sm dark:prose-invert text-muted-foreground [&>a]:text-primary [&>a]:no-underline [&>a]:hover:underline [&>a]:font-medium" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    On This Day
                </CardTitle>
                <div className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : history && history.data ? (
                    <Tabs defaultValue="events" className="w-full flex flex-col items-center">
                        <TabsList className="h-auto p-1 bg-muted/50 rounded-full gap-1 mb-6">
                            <TabsTrigger value="events" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Events</TabsTrigger>
                            <TabsTrigger value="births" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Births</TabsTrigger>
                            <TabsTrigger value="deaths" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Deaths</TabsTrigger>
                        </TabsList>

                        <TabsContent value="events" className="w-full mt-0">
                            {renderEventList(history.data.Events)}
                        </TabsContent>
                        <TabsContent value="births" className="w-full mt-0">
                            {renderEventList(history.data.Births)}
                        </TabsContent>
                        <TabsContent value="deaths" className="w-full mt-0">
                            {renderEventList(history.data.Deaths)}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="text-center text-muted-foreground text-sm py-12 flex items-center justify-center">
                        Unable to load history.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
