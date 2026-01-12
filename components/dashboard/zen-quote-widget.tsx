"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Quote as QuoteIcon, Loader2, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ZenQuote {
    q: string // quote
    a: string // author
    h: string // html
}

export function ZenQuoteWidget() {
    const [quote, setQuote] = useState<ZenQuote | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchQuote = async () => {
        try {
            setRefreshing(true)
            const res = await fetch("/api/external/zen/quote")
            if (!res.ok) throw new Error("Failed to fetch quote")
            const data = await res.json()
            if (Array.isArray(data) && data.length > 0) {
                setQuote(data[0])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const copyToClipboard = () => {
        if (quote) {
            navigator.clipboard.writeText(`"${quote.q}" - ${quote.a}`)
            toast.success("Quote copied to clipboard")
        }
    }

    useEffect(() => {
        fetchQuote()
    }, [])

    return (
        <Card className="border-border/50 shadow-sm bg-background overflow-hidden relative group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-background/20 text-muted-foreground"
                    onClick={copyToClipboard}
                    title="Copy Quote"
                >
                    <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-background/20 text-muted-foreground"
                    onClick={fetchQuote}
                    disabled={refreshing}
                    title="Get New Quote"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                </Button>
            </div>

            <CardContent className="p-6 flex flex-col justify-center min-h-[180px]">
                {loading ? (
                    <div className="flex justify-center items-center h-full py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : quote ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <QuoteIcon className="h-8 w-8 text-primary/20 mb-3" />
                        <blockquote className="space-y-3">
                            <p className="text-lg md:text-xl font-medium leading-relaxed font-serif text-foreground/90 italic">
                                &ldquo;{quote.q}&rdquo;
                            </p>
                            <footer className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <div className="h-px w-8 bg-primary/30" />
                                {quote.a}
                            </footer>
                        </blockquote>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        Failed to load inspiration.
                        <Button variant="link" onClick={fetchQuote} className="h-auto p-0 ml-1">Try again</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
