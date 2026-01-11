import type React from "react"
import { MinimalNav, MobileNav } from "@/components/minimal-nav"
import { AuthGuard } from "@/components/auth-guard"
import { CommandPalette } from "@/components/command-palette"

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <AuthGuard>
            <CommandPalette />
            <MinimalNav />
            <div className="md:pl-16 min-h-screen transition-all duration-300">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </div>
            <MobileNav />
        </AuthGuard>
    )
}
