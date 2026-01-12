"use client"

import { useRef, useCallback, useState, useEffect, useMemo } from "react"
import "@excalidraw/excalidraw/index.css"

interface CanvasEditorProps {
    initialData: string
    onSave: (data: string) => void
}

type ExcalidrawComponent = React.ComponentType<any>
type ExcalidrawElements = readonly any[]
type ExcalidrawAppState = any

function debounce(fn: (elements: ExcalidrawElements) => void, delay: number) {
    let timeoutId: NodeJS.Timeout
    return (elements: ExcalidrawElements) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(elements), delay)
    }
}

export default function CanvasEditor({ initialData, onSave }: CanvasEditorProps) {
    const onSaveRef = useRef(onSave)
    onSaveRef.current = onSave

    const [Excalidraw, setExcalidraw] = useState<ExcalidrawComponent | null>(null)

    // Dynamically import Excalidraw (client-side only)
    useEffect(() => {
        import("@excalidraw/excalidraw").then((mod) => {
            setExcalidraw(() => mod.Excalidraw)
        })
    }, [])

    // Parse initial data - only load elements, not appState (appState contains non-serializable data like Maps)
    const parsedInitialData = useMemo(() => {
        if (initialData && initialData !== "{}") {
            try {
                const parsed = JSON.parse(initialData)
                // Only return elements, let Excalidraw handle its own appState
                return {
                    elements: parsed.elements || [],
                    appState: {
                        viewBackgroundColor: parsed.appState?.viewBackgroundColor || "#ffffff"
                    }
                }
            } catch (e) {
                console.error("Failed to parse canvas data:", e)
            }
        }
        return { elements: [] }
    }, [initialData])

    // Debounced save function - only save elements (serializable)
    const debouncedSave = useMemo(
        () => debounce((elements: ExcalidrawElements) => {
            // Only save elements, exclude non-serializable appState
            const data = JSON.stringify({ elements })
            onSaveRef.current(data)
        }, 2000),
        []
    )

    // Handle changes - only pass elements to save
    const handleChange = useCallback(
        (elements: ExcalidrawElements, _appState: ExcalidrawAppState) => {
            debouncedSave(elements)
        },
        [debouncedSave]
    )

    // Get theme from system
    const [theme, setTheme] = useState<"light" | "dark">("light")
    useEffect(() => {
        const isDark = document.documentElement.classList.contains("dark")
        setTheme(isDark ? "dark" : "light")

        const observer = new MutationObserver(() => {
            const isDarkNow = document.documentElement.classList.contains("dark")
            setTheme(isDarkNow ? "dark" : "light")
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])

    if (!Excalidraw) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="w-full h-full excalidraw-wrapper">
            <style jsx global>{`
                /* Excalidraw Theme Overrides for Clarity */
                .excalidraw-wrapper {
                    --color-primary: hsl(var(--primary));
                    --color-primary-light: hsl(var(--primary) / 0.1);
                    position: relative;
                    overflow: hidden;
                }

                /* Prevent Excalidraw from causing horizontal scroll */
                .excalidraw,
                .excalidraw-container {
                    max-width: 100% !important;
                    overflow: hidden !important;
                }

                /* Toolbar - pill-shaped with glassmorphism */
                .excalidraw .Island {
                    border-radius: 1.5rem !important;
                    background: hsl(var(--card) / 0.8) !important;
                    backdrop-filter: blur(12px) !important;
                    border: 1px solid hsl(var(--border) / 0.5) !important;
                    box-shadow: 0 4px 20px hsl(0 0% 0% / 0.1) !important;
                }

                /* Tool buttons - rounded */
                .excalidraw .ToolIcon_type_button,
                .excalidraw .ToolIcon_type_floating {
                    border-radius: 0.75rem !important;
                }

                .excalidraw .ToolIcon_type_button:hover,
                .excalidraw .ToolIcon_type_floating:hover {
                    background: hsl(var(--accent)) !important;
                }

                .excalidraw .ToolIcon_type_button.ToolIcon--selected {
                    background: hsl(var(--primary)) !important;
                    color: hsl(var(--primary-foreground)) !important;
                }

                /* Popover panels - glassmorphism */
                .excalidraw .popover,
                .excalidraw-popover {
                    border-radius: 1rem !important;
                    background: hsl(var(--card) / 0.95) !important;
                    backdrop-filter: blur(12px) !important;
                    border: 1px solid hsl(var(--border) / 0.5) !important;
                }

                /* Color picker and sliders */
                .excalidraw .color-picker-content {
                    border-radius: 1rem !important;
                }

                /* Buttons in dialogs */
                .excalidraw button.excalidraw-button {
                    border-radius: 9999px !important;
                }

                /* Context menu */
                .excalidraw .context-menu {
                    border-radius: 1rem !important;
                    background: hsl(var(--card) / 0.95) !important;
                    backdrop-filter: blur(12px) !important;
                }

                /* Side panel */
                .excalidraw .layer-ui__wrapper__top-right {
                    top: 1rem !important;
                    right: 1rem !important;
                }

                /* Hide Excalidraw logo/branding */
                .excalidraw .main-menu-trigger,
                .excalidraw .help-icon {
                    opacity: 0.6;
                }

                .excalidraw .main-menu-trigger:hover,
                .excalidraw .help-icon:hover {
                    opacity: 1;
                }

                /* Dark mode specific overrides */
                .dark .excalidraw .Island {
                    background: hsl(var(--card) / 0.7) !important;
                }

                .dark .excalidraw .ToolIcon_type_button:hover {
                    background: hsl(var(--accent) / 0.8) !important;
                }

                /* Canvas background - match theme */
                .excalidraw .excalidraw__canvas {
                    background: hsl(var(--background)) !important;
                }
            `}</style>
            <Excalidraw
                initialData={parsedInitialData}
                onChange={handleChange}
                theme={theme}
            />
        </div>
    )
}
