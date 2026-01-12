"use client"

import { useEffect, useState } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { getSettings, saveSettings } from "@/lib/storage"

export function OnboardingTour() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const checkOnboarding = async () => {
            const settings = await getSettings()
            if (!settings.onboardingComplete) {
                // Initialize driver
                const driverObj = driver({
                    showProgress: true,
                    animate: true,
                    steps: [
                        { element: '#sidebar-nav', popover: { title: 'Navigation', description: 'Access all your tools here: Journal, Notes, Transcriptions, and more.' } },
                        { element: '#quick-create-btn', popover: { title: 'Quick Actions', description: 'Create a new note, task, or recording instantly.' } },
                        { element: '#settings-btn', popover: { title: 'Settings', description: 'Customize your theme (try the new Accent Colors!) and configure AI models.' } },
                        { element: '#command-palette-trigger', popover: { title: 'Command Palette', description: 'Press Cmd+K to quickly search or perform actions.' } },
                    ],
                    onDestroyStarted: async () => {
                        if (!driverObj.hasNextStep() || confirm("Skip tour?")) {
                            driverObj.destroy()
                            // Mark as complete
                            await saveSettings({ ...settings, onboardingComplete: true })
                        }
                    },
                })

                // Slight delay to ensure UI is ready
                setTimeout(() => {
                    driverObj.drive()
                }, 1000)
            }
        }

        checkOnboarding()
    }, [])

    if (!mounted) return null
    return null
}
