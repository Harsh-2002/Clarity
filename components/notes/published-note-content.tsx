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
import { CalendarDays, Clock } from "lucide-react"
interface Note {
    id: string
    title: string
    content: string
    createdAt: Date
    updatedAt: Date
}

interface TocHeading {
    id: string
    text: string
    level: number
}

interface Props {
    note: Note
}

/**
 * Extract headings from generated HTML and inject IDs in one pass.
 * Returns both the heading list and the modified HTML with id attributes.
 */
function extractHeadingsFromHtml(html: string): { headings: TocHeading[]; html: string } {
    const headings: TocHeading[] = []
    const usedIds = new Set<string>()

    const modified = html.replace(/<h([123])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
        // Strip HTML tags to get plain text
        const text = inner.replace(/<[^>]*>/g, "").trim()
        if (!text) return match

        let id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")
        // Deduplicate IDs
        if (usedIds.has(id)) {
            let i = 2
            while (usedIds.has(`${id}-${i}`)) i++
            id = `${id}-${i}`
        }
        usedIds.add(id)

        headings.push({ id, text, level: parseInt(level) })
        return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`
    })

    return { headings, html: modified }
}

function TableOfContents({ headings, activeId }: { headings: TocHeading[]; activeId: string }) {
    if (headings.length === 0) return null

    return (
        <nav aria-label="Table of contents">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em] mb-4">
                On this page
            </p>
            <div className="relative border-l border-border/40">
                {headings.map((h) => {
                    const isActive = activeId === h.id
                    return (
                        <a
                            key={h.id}
                            href={`#${h.id}`}
                            onClick={(e) => {
                                e.preventDefault()
                                document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                            }}
                            className={cn(
                                "block relative transition-colors duration-150",
                                h.level === 1 && "py-1.5 pl-4 text-[13px] font-medium",
                                h.level === 2 && "py-1 pl-4 text-[13px]",
                                h.level === 3 && "py-1 pl-7 text-[12px]",
                                isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground/70 hover:text-foreground/90"
                            )}
                        >
                            {/* Active indicator bar */}
                            {isActive && (
                                <span className="absolute left-[-1px] top-1 bottom-1 w-[2px] bg-primary rounded-full" />
                            )}
                            <span className="line-clamp-1">{h.text}</span>
                        </a>
                    )
                })}
            </div>
        </nav>
    )
}

export function PublishedNoteContent({ note }: Props) {
    const [readingTime, setReadingTime] = useState(0)
    const [formattedDate, setFormattedDate] = useState<string | null>(null)
    const [activeHeadingId, setActiveHeadingId] = useState("")

    // Generate HTML and extract headings — must come before effects that use `headings`
    const { htmlContent, headings } = useMemo(() => {
        try {
            const json = JSON.parse(note.content)
            const lowlight = createLowlight(common)

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

            let html = generateHTML(json, [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3] },
                    codeBlock: false,
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

            // Apply syntax highlighting to code blocks
            const codeBlockRegex = /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi
            html = html.replace(codeBlockRegex, (match, language, code) => {
                try {
                    const decodedCode = code
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")

                    let highlighted
                    if (language && lowlight.registered(language)) {
                        highlighted = lowlight.highlight(language, decodedCode)
                    } else {
                        highlighted = lowlight.highlightAuto(decodedCode)
                    }

                    const highlightedHtml = toHtml(highlighted)
                    const langClass = language ? ` language-${language}` : ''
                    return `<pre class="bg-muted rounded-2xl p-4 font-mono text-sm overflow-x-auto" data-language="${language || 'auto'}"><code class="hljs${langClass}">${highlightedHtml}</code></pre>`
                } catch (e) {
                    return match
                }
            })

            // Remove the first H1 since title is shown separately
            html = html.replace(/^(\s*)<h1[^>]*>.*?<\/h1>/i, '')

            // Extract headings from final HTML and inject IDs in one pass
            const result = extractHeadingsFromHtml(html)

            return { htmlContent: result.html, headings: result.headings }
        } catch (e) {
            console.error("Failed to generate HTML from note content:", e)
            return { htmlContent: `<p>${note.content}</p>`, headings: [] }
        }
    }, [note.content])

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
            const extractText = (content: any[]) => {
                content.forEach(node => {
                    if (node.text) text += node.text + " "
                    if (node.content) extractText(node.content)
                })
            }
            if (json.content) extractText(json.content)
            const words = text.trim().split(/\s+/).length
            setReadingTime(Math.ceil(words / 200))
        } catch (e) {
            setReadingTime(1)
        }
    }, [note.updatedAt, note.content])

    // Track active heading via scroll position — more reliable than IntersectionObserver
    useEffect(() => {
        if (headings.length === 0) return

        const OFFSET = 100 // px from top to consider "active"

        const onScroll = () => {
            let current = ""
            for (const h of headings) {
                const el = document.getElementById(h.id)
                if (!el) continue
                const top = el.getBoundingClientRect().top
                if (top <= OFFSET) {
                    current = h.id
                } else {
                    break // headings are in document order, so once we pass the offset, stop
                }
            }
            // If nothing matched (scrolled above first heading), use first heading
            if (!current && headings.length > 0) {
                current = headings[0].id
            }
            setActiveHeadingId(current)
        }

        // Initial check after DOM renders
        const timer = setTimeout(onScroll, 150)
        window.addEventListener("scroll", onScroll, { passive: true })

        return () => {
            clearTimeout(timer)
            window.removeEventListener("scroll", onScroll)
        }
    }, [headings])

    const editorStyles = cn(
        "prose prose-stone dark:prose-invert max-w-none font-sans",
        "[&_p]:leading-7 [&_p]:mb-4 [&_p]:mt-0",
        "[&_h1]:text-3xl [&_h1]:font-bold",
        "[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-tight",
        "[&_h1:first-child]:mt-0",
        "[&_h2]:text-2xl [&_h2]:font-semibold",
        "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:leading-tight",
        "[&_h2:first-child]:mt-0",
        "[&_h3]:text-xl [&_h3]:font-medium",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:leading-snug",
        "[&_h3:first-child]:mt-0",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4",
        "[&_li]:my-1 [&_li]:leading-7",
        "[&_li_p]:mb-0 [&_li_p]:mt-0",
        "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0",
        "[&_ul[data-type='taskList']]:my-4",
        "[&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:gap-2",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40",
        "[&_blockquote]:pl-4 [&_blockquote]:py-1",
        "[&_blockquote]:my-5 [&_blockquote]:italic",
        "[&_blockquote]:text-muted-foreground",
        "[&_blockquote_p]:mb-0",
        "[&_pre]:bg-muted [&_pre]:rounded-2xl",
        "[&_pre]:p-4 [&_pre]:my-5",
        "[&_pre]:overflow-x-auto [&_pre]:leading-relaxed",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_code]:bg-muted [&_code]:px-1.5",
        "[&_code]:py-0.5 [&_code]:rounded-md",
        "[&_code]:text-sm [&_code]:font-mono",
        "[&_hr]:my-6 [&_hr]:border-border",
        "[&_a]:text-primary [&_a]:underline",
        "[&_a]:underline-offset-4 [&_a]:decoration-primary/50",
        "[&_img]:rounded-3xl [&_img]:border [&_img]:border-border [&_img]:my-6",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold",
        "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2",
    )

    const hasToc = headings.length > 0

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20">
            <div className="max-w-[1100px] mx-auto px-5 py-12 md:py-16">
                <div className={cn(
                    hasToc
                        ? "lg:grid lg:grid-cols-[180px_minmax(0,780px)] lg:gap-16 lg:justify-center"
                        : "max-w-3xl mx-auto"
                )}>
                    {/* Table of Contents — sticky left sidebar on desktop */}
                    {hasToc && (
                        <aside className="hidden lg:block relative">
                            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide">
                                <TableOfContents headings={headings} activeId={activeHeadingId} />
                            </div>
                        </aside>
                    )}

                    {/* Main content */}
                    <div className="min-w-0">
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
            </div>
        </div>
    )
}
