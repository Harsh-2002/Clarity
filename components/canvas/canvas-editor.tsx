"use client"

import { useRef, useEffect, useCallback } from "react"
import { Tldraw, Editor, getSnapshot, loadSnapshot, TLStoreSnapshot } from "tldraw"
import "tldraw/tldraw.css"
import { useTheme } from "next-themes"

interface CanvasEditorProps {
    initialData: string
    onSave: (data: string) => void
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

export default function CanvasEditor({ initialData, onSave }: CanvasEditorProps) {
    const editorRef = useRef<Editor | null>(null)
    const { resolvedTheme } = useTheme()

    // Load initial data when editor mounts
    const handleMount = useCallback((editor: Editor) => {
        editorRef.current = editor

        // Load saved data if exists
        if (initialData && initialData !== "{}") {
            try {
                const snapshot = JSON.parse(initialData) as TLStoreSnapshot
                loadSnapshot(editor.store, snapshot)
            } catch (e) {
                console.error("Failed to load canvas data:", e)
            }
        }
    }, [initialData])

    // Auto-save on changes (debounced)
    useEffect(() => {
        const editor = editorRef.current
        if (!editor) return

        const debouncedSave = debounce(() => {
            const snapshot = getSnapshot(editor.store)
            onSave(JSON.stringify(snapshot))
        }, 2000)

        // Listen to store changes
        const unsubscribe = editor.store.listen(
            () => debouncedSave(),
            { source: "user", scope: "document" }
        )

        return () => unsubscribe()
    }, [onSave])

    return (
        <div className="w-full h-full tldraw-container">
            <style jsx global>{`
                .tldraw-container {
                    --tl-font-draw: 'Inter', sans-serif;
                }
                
                /* Hide elements we don't need */
                .tlui-menu-zone__controls > .tlui-menu-zone__share-zone,
                .tlui-debug-panel {
                    display: none !important;
                }

                /* Theme overrides for dark mode */
                .tl-theme__dark {
                    --color-background: hsl(var(--background));
                    --color-panel: hsl(var(--card));
                    --color-muted-1: hsl(var(--muted));
                }

                /* Rounded corners on panels */
                .tlui-style-panel,
                .tlui-toolbar__inner,
                .tlui-popover__content {
                    border-radius: 1rem !important;
                }
            `}</style>
            <Tldraw
                onMount={handleMount}
                forceMobile={false}
            />
        </div>
    )
}
