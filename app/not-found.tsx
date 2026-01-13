"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Animated Icon */}
                <div className="relative inline-flex">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                    <div className="relative bg-secondary/50 backdrop-blur-sm p-8 rounded-full border border-border/50">
                        <FileQuestion className="w-16 h-16 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Error Code */}
                <div className="space-y-2">
                    <h1 className="text-8xl font-light tracking-tighter bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        404
                    </h1>
                    <p className="text-2xl font-light text-foreground/90">
                        Page Not Found
                    </p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Button
                        asChild
                        variant="default"
                        className="rounded-full gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                        <Link href="/dashboard">
                            <Home className="w-4 h-4" />
                            Go Home
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full gap-2"
                        onClick={() => window.history.back()}
                    >
                        <button>
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </button>
                    </Button>
                </div>

                {/* Helpful Links */}
                <div className="pt-8 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-3">Quick links</p>
                    <div className="flex flex-wrap gap-2 justify-center text-xs">
                        <Link href="/notes" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
                            Notes
                        </Link>
                        <span className="text-muted-foreground/30">•</span>
                        <Link href="/journal" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
                            Journal
                        </Link>
                        <span className="text-muted-foreground/30">•</span>
                        <Link href="/tasks" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
                            Tasks
                        </Link>
                        <span className="text-muted-foreground/30">•</span>
                        <Link href="/transcribe" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
                            Transcribe
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
