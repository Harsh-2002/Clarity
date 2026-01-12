"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Command } from "lucide-react"

interface Shortcut {
    keys: string[]
    description: string
    category: string
}

const shortcuts: Shortcut[] = [
    // Navigation
    { keys: ["⌘", "K"], description: "Open command palette", category: "Navigation" },
    { keys: ["⌘", "/"], description: "Toggle shortcuts help", category: "Navigation" },
    { keys: ["⌘", "J"], description: "Open journal", category: "Navigation" },

    // Editing
    { keys: ["⌘", "B"], description: "Bold text", category: "Editing" },
    { keys: ["⌘", "I"], description: "Italic text", category: "Editing" },
    { keys: ["⌘", "U"], description: "Underline text", category: "Editing" },
    { keys: ["⌘", "S"], description: "Save (auto-saves)", category: "Editing" },
    { keys: ["⌘", "Z"], description: "Undo", category: "Editing" },
    { keys: ["⌘", "⇧", "Z"], description: "Redo", category: "Editing" },

    // Quick Actions
    { keys: ["⌘", "N"], description: "New note", category: "Quick Actions" },
    { keys: ["⌘", "⏎"], description: "Save journal entry", category: "Quick Actions" },
    { keys: ["Esc"], description: "Close modal/panel", category: "Quick Actions" },
]

export function KeyboardShortcuts() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+/ or Ctrl+/ to toggle
            if ((e.metaKey || e.ctrlKey) && e.key === "/") {
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
            // Escape to close
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isOpen])

    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) acc[shortcut.category] = []
        acc[shortcut.category].push(shortcut)
        return acc
    }, {} as Record<string, Shortcut[]>)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Command className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-secondary rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                                <div key={category} className="mb-6 last:mb-0">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                        {category}
                                    </h3>
                                    <div className="space-y-2">
                                        {categoryShortcuts.map((shortcut, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-xl"
                                            >
                                                <span className="text-sm">{shortcut.description}</span>
                                                <div className="flex items-center gap-1">
                                                    {shortcut.keys.map((key, j) => (
                                                        <kbd
                                                            key={j}
                                                            className="px-2 py-1 text-xs font-mono bg-background border border-border rounded-lg shadow-sm"
                                                        >
                                                            {key}
                                                        </kbd>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border bg-secondary/20">
                            <p className="text-xs text-muted-foreground text-center">
                                Press <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">/</kbd> to toggle this panel
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
