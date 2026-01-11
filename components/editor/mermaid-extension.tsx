"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react"
import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    fontFamily: "inherit"
})

interface MermaidNodeProps {
    node: { attrs: { content: string } }
    updateAttributes: (attrs: { content: string }) => void
}

function MermaidNodeView({ node, updateAttributes }: MermaidNodeProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [svg, setSvg] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [isEditing, setIsEditing] = useState(!node.attrs.content)

    useEffect(() => {
        if (!node.attrs.content || isEditing) return

        const renderDiagram = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).slice(2)}`
                const { svg } = await mermaid.render(id, node.attrs.content)
                setSvg(svg)
                setError("")
            } catch (e: any) {
                setError(e?.message || "Invalid Mermaid syntax")
                setSvg("")
            }
        }

        renderDiagram()
    }, [node.attrs.content, isEditing])

    if (isEditing) {
        return (
            <NodeViewWrapper className="my-4">
                <div className="bg-muted rounded-2xl p-4 border border-border">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                        <span className="font-mono bg-background px-2 py-0.5 rounded">mermaid</span>
                        <span>Diagram</span>
                    </div>
                    <textarea
                        value={node.attrs.content}
                        onChange={(e) => updateAttributes({ content: e.target.value })}
                        onBlur={() => node.attrs.content && setIsEditing(false)}
                        placeholder={`graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]`}
                        className="w-full min-h-[150px] bg-background rounded-xl p-3 font-mono text-sm outline-none resize-none border border-border focus:ring-2 focus:ring-primary/20"
                        autoFocus
                    />
                    <button
                        onClick={() => setIsEditing(false)}
                        disabled={!node.attrs.content}
                        className="mt-2 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50"
                    >
                        Render Diagram
                    </button>
                </div>
            </NodeViewWrapper>
        )
    }

    return (
        <NodeViewWrapper className="my-4">
            <div
                ref={containerRef}
                className="bg-muted/50 rounded-2xl p-4 border border-border cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setIsEditing(true)}
            >
                {error ? (
                    <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-xl">
                        <strong>Mermaid Error:</strong> {error}
                    </div>
                ) : svg ? (
                    <div
                        className="flex justify-center overflow-x-auto [&_svg]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: svg }}
                    />
                ) : (
                    <div className="text-muted-foreground text-sm">Loading diagram...</div>
                )}
                <div className="text-xs text-muted-foreground mt-2 text-center">
                    Click to edit
                </div>
            </div>
        </NodeViewWrapper>
    )
}

export const MermaidExtension = Node.create({
    name: "mermaid",
    group: "block",
    atom: true,

    addAttributes() {
        return {
            content: {
                default: ""
            }
        }
    },

    parseHTML() {
        return [{ tag: 'div[data-type="mermaid"]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ["div", mergeAttributes(HTMLAttributes, { "data-type": "mermaid" })]
    },

    addNodeView() {
        return ReactNodeViewRenderer(MermaidNodeView)
    }
})

export default MermaidExtension
