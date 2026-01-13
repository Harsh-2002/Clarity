"use client"

import { useMemo, useState, useEffect } from "react"
import { generateHTML } from "@tiptap/html"
import { Node } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Link as TiptapLink } from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TextAlign } from "@tiptap/extension-text-align"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Typography } from "@tiptap/extension-typography"
import { Underline } from "@tiptap/extension-underline"
import Image from "@tiptap/extension-image"
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { toHtml } from "hast-util-to-html"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Share2, CalendarDays, Clock } from "lucide-react"
import { toast } from "sonner"

interface Note {
    id: string
    title: string
    content: string
    createdAt: Date
    updatedAt: Date
}

interface Props {
    note: Note
}

export function PublishedNoteContent({ note }: Props) {
    const [readingTime, setReadingTime] = useState(0)
    const [formattedDate, setFormattedDate] = useState<string | null>(null)

    // Format date only on client to avoid hydration mismatch
    useEffect(() => {
        setFormattedDate(
            new Date(note.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        )

        // Calculate reading time
        try {
            const json = JSON.parse(note.content)
            let text = ""
            // Simple recursive function to extract text
            const extractText = (content: any[]) => {
                content.forEach(node => {
                    if (node.text) text += node.text + " "
                    if (node.content) extractText(node.content)
                })
            }
            if (json.content) extractText(json.content)
            const words = text.trim().split(/\s+/).length
            setReadingTime(Math.ceil(words / 200)) // 200 words per minute
        } catch (e) {
            setReadingTime(1)
        }
    }, [note.updatedAt, note.content])

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success("Link copied to clipboard")
    }

    const htmlContent = useMemo(() => {
        try {
            const json = JSON.parse(note.content)
            const lowlight = createLowlight(common)

            // Simple Mermaid node for HTML generation (renders as code block placeholder)
            const MermaidNode = Node.create({
                name: "mermaid",
                group: "block",
                atom: true,
                addAttributes() {
                    return { content: { default: "" } }
                },
                parseHTML() {
                    return [{ tag: 'div[data-type="mermaid"]' }]
                },
                renderHTML({ HTMLAttributes }) {
                    const content = HTMLAttributes.content || ""
                    return ["div", { class: "mermaid-diagram bg-muted rounded-2xl p-4 my-4 border border-border", "data-type": "mermaid" },
                        ["pre", { class: "font-mono text-sm text-muted-foreground whitespace-pre-wrap" }, content || "Mermaid Diagram"]
                    ]
                }
            })

            // Generate base HTML
            let html = generateHTML(json, [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                    codeBlock: false, // Using CodeBlockLowlight instead
                }),
                CodeBlockLowlight.configure({
                    lowlight,
                    HTMLAttributes: {
                        class: "bg-muted rounded-2xl p-4 font-mono text-sm overflow-x-auto"
                    }
                }),
                TiptapLink.configure({
                    openOnClick: true,
                    HTMLAttributes: {
                        class: "text-primary underline underline-offset-4 cursor-pointer"
                    }
                }),
                Highlight.configure({ multicolor: true }),
                TaskList,
                TaskItem.configure({ nested: true }),
                Table.configure({ resizable: true }),
                TableRow,
                TableCell,
                TableHeader,
                TextAlign.configure({ types: ['heading', 'paragraph'] }),
                Subscript,
                Superscript,
                Typography,
                Underline,
                Image.configure({
                    HTMLAttributes: {
                        class: "rounded-3xl border border-border my-6"
                    }
                }),
                MermaidNode,
            ])

            // Post-process: Apply syntax highlighting to code blocks
            // Find all code blocks and apply lowlight highlighting
            const codeBlockRegex = /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi
            html = html.replace(codeBlockRegex, (match, language, code) => {
                try {
                    // Decode HTML entities
                    const decodedCode = code
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")

                    // Apply syntax highlighting
                    let highlighted
                    if (language && lowlight.registered(language)) {
                        highlighted = lowlight.highlight(language, decodedCode)
                    } else {
                        // Auto-detect language
                        highlighted = lowlight.highlightAuto(decodedCode)
                    }

                    // Convert lowlight tree to HTML
                    const highlightedHtml = toHtml(highlighted)
                    const langClass = language ? ` language-${language}` : ''
                    return `<pre class="bg-muted rounded-2xl p-4 font-mono text-sm overflow-x-auto" data-language="${language || 'auto'}"><code class="hljs${langClass}">${highlightedHtml}</code></pre>`
                } catch (e) {
                    // If highlighting fails, return original
                    return match
                }
            })

            // Remove the first H1 from content since title is shown separately in the header
            html = html.replace(/^(\s*)<h1[^>]*>.*?<\/h1>/i, '')

            return html
        } catch (e) {
            console.error("Failed to generate HTML from note content:", e)
            // If content is plain text, return as-is
            return `<p>${note.content}</p>`
        }
    }, [note.content])

    // Same styling as the NovelEditor for WYSIWYG consistency
    const editorStyles = cn(
        // Base prose styling - same as editor
        "prose prose-stone dark:prose-invert max-w-none font-sans",

        // Paragraph typography - comfortable line height, clear paragraph separation
        "[&_p]:leading-7 [&_p]:mb-4 [&_p]:mt-0",

        // Headings - larger top margin for visual separation, tighter bottom margin
        "[&_h1]:text-3xl [&_h1]:font-bold",
        "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-tight",
        "[&_h1:first-child]:mt-0",

        "[&_h2]:text-2xl [&_h2]:font-semibold",
        "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:leading-tight",
        "[&_h2:first-child]:mt-0",

        "[&_h3]:text-xl [&_h3]:font-medium",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:leading-snug",
        "[&_h3:first-child]:mt-0",

        // Lists - proper spacing and nesting
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4",
        "[&_li]:my-1 [&_li]:leading-7",
        "[&_li_p]:mb-0 [&_li_p]:mt-0", // No extra spacing in list items

        // Task lists
        "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0",
        "[&_ul[data-type='taskList']]:my-4",
        "[&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:gap-2",

        // Blockquotes - clear visual distinction
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40",
        "[&_blockquote]:pl-4 [&_blockquote]:py-1",
        "[&_blockquote]:my-5 [&_blockquote]:italic",
        "[&_blockquote]:text-muted-foreground",
        "[&_blockquote_p]:mb-0", // No extra margin in blockquote paragraphs

        // Code blocks - distinct separation
        "[&_pre]:bg-muted [&_pre]:rounded-2xl",
        "[&_pre]:p-4 [&_pre]:my-5",
        "[&_pre]:overflow-x-auto [&_pre]:leading-relaxed",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",

        // Inline code
        "[&_code]:bg-muted [&_code]:px-1.5",
        "[&_code]:py-0.5 [&_code]:rounded-md",
        "[&_code]:text-sm [&_code]:font-mono",

        // Horizontal rule
        "[&_hr]:my-6 [&_hr]:border-border",

        // Links
        "[&_a]:text-primary [&_a]:underline",
        "[&_a]:underline-offset-4 [&_a]:decoration-primary/50",

        // Images
        "[&_img]:rounded-3xl [&_img]:border [&_img]:border-border [&_img]:my-6",

        // Tables - styling for published view
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold",
        "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2",
    )

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20">
            <div className="max-w-2xl mx-auto px-5 py-12 md:py-16">
                {/* Header */}
                <header className="mb-10 space-y-4">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                        {note.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {formattedDate && (
                            <span className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {formattedDate}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {readingTime} min read
                        </span>
                    </div>
                </header>

                <div className="h-px bg-border/50 mb-8" />

                {/* Content */}
                <article
                    className={editorStyles}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

                {/* Footer */}
                <footer className="mt-16 pt-10 border-t border-border/40 flex flex-col items-center text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center">
                        <span className="text-xl font-serif text-primary">C</span>
                    </div>
                    <p className="text-base font-medium">Published with Clarity</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Create, organize, and share your thoughts beautifully.
                    </p>
                    <Link href="/" className="mt-2 text-sm text-primary hover:underline underline-offset-4 font-medium">
                        Create your own note &rarr;
                    </Link>
                </footer>
            </div>
        </div>
    )
}
