import { MinimalNav, MobileNav } from "@/components/minimal-nav"
import { AuthGuard } from "@/components/auth-guard"
import { CommandPalette } from "@/components/command-palette"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { OnboardingTour } from "@/components/onboarding-tour"
import { cn } from "@/lib/utils"

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <AuthGuard>
            <CommandPalette />
            <KeyboardShortcuts />
            <OnboardingTour />
            <MinimalNav />
            <div
                className={cn(
                    "min-h-screen transition-all duration-300 md:pl-16"
                )}
            >
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </div>
            <MobileNav />
        </AuthGuard>
    )
}
