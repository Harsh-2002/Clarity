"use client"

import { useEffect, useState } from "react"
import { Monitor, Smartphone, Globe, LogOut, Loader2, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getSessions, revokeSession } from "@/lib/storage"
import type { Session } from "@/lib/types"

export function SessionManager() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchSessions = async () => {
        setIsLoading(true)
        const data = await getSessions()
        setSessions(data)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchSessions()
    }, [])

    const handleRevoke = async (id: string) => {
        try {
            await revokeSession(id)
            setSessions(prev => prev.filter(s => s.id !== id))
            toast.success("Session revoked successfully")
        } catch (error) {
            toast.error("Failed to revoke session")
        }
    }

    const getDeviceIcon = (name: string) => {
        const lower = name.toLowerCase()
        if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) return <Smartphone className="h-4 w-4" />
        if (lower.includes('mac') || lower.includes('windows') || lower.includes('linux')) return <Monitor className="h-4 w-4" />
        return <Globe className="h-4 w-4" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-medium">Active Sessions</CardTitle>
                <CardDescription>
                    Manage devices that are currently logged deeply into your account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-2xl border bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-secondary rounded-full">
                                        {getDeviceIcon(session.deviceName)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate max-w-[200px] sm:max-w-md">
                                                {session.deviceName}
                                            </p>
                                            {session.isCurrent && (
                                                <Badge variant="secondary" className="text-xs">Current Device</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Last active: {formatDistanceToNow(session.createdAt, { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                {!session.isCurrent && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRevoke(session.id)}
                                        title="Revoke Session"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {sessions.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-4">
                                No active sessions found.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
