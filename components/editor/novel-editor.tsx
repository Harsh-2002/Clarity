"use client"

import {
    EditorRoot,
    EditorContent,
    EditorCommand,
    EditorCommandItem,
    EditorCommandEmpty,
    EditorCommandList,
    EditorBubble,
    EditorBubbleItem,
    type JSONContent,
    type SuggestionItem,
    StarterKit,
    TiptapLink,
    TiptapImage,
    TiptapUnderline,
    TextStyle,
    Color,
    TaskList,
    TaskItem,
    Placeholder,
    HighlightExtension,
    Command,
    createSuggestionItems,
    handleCommandNavigation,
    renderItems,
    createImageUpload,
    handleImageDrop,
    handleImagePaste,
    type ImageUploadOptions,
    GlobalDragHandle
} from "novel"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Typography } from "@tiptap/extension-typography"
import { Youtube } from "@tiptap/extension-youtube"
import { TextAlign } from "@tiptap/extension-text-align"
import { cn } from "@/lib/utils"
import { useEffect, useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    CheckSquare,
    Minus,
    Image as ImageIcon,
    Youtube as YoutubeIcon,
    GitBranch,
    type LucideIcon
} from "lucide-react"
import { Markdown } from "tiptap-markdown"
import MermaidExtension from "./mermaid-extension"
import { LinkExtension } from "./link-extension"

interface NovelEditorProps {
    content: string
    onChange: (content: string) => void
    className?: string
    editable?: boolean
}

// Image upload helper for browser-side storage (Base64)
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
    })
}

// Image upload config
const imageUpload = createImageUpload({
    validateFn: (file) => {
        if (!file.type.includes("image/")) {
            toast.error("File type not supported.")
            return false
        }
        if (file.size / 1024 / 1024 > 20) {
            toast.error("File size too big (max 20MB).")
            return false
        }
        return true
    },
    onUpload: (file) => {
        // Return the Base64 string directly - stored in the doc
        return fileToBase64(file)
    }
})

export default function NovelEditor({
    content,
    onChange,
    className,
    editable = true
}: NovelEditorProps) {
    const [initialContent, setInitialContent] = useState<JSONContent | string | undefined>(undefined)
    const [mounted, setMounted] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Memoize slash commands to include the editor instance dependent commands like Image
    const suggestionItems = createSuggestionItems([
        {
            title: "Heading 1",
            description: "Large section heading",
            searchTerms: ["title", "big", "h1"],
            icon: <Heading1 className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run()
            }
        },
        {
            title: "Heading 2",
            description: "Medium section heading",
            searchTerms: ["subtitle", "h2"],
            icon: <Heading2 className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run()
            }
        },
        {
            title: "Heading 3",
            description: "Small section heading",
            searchTerms: ["small", "h3"],
            icon: <Heading3 className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run()
            }
        },
        {
            title: "Bullet List",
            description: "Create an unordered list",
            searchTerms: ["unordered", "bullets", "points"],
            icon: <List className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run()
            }
        },
        {
            title: "Numbered List",
            description: "Create an ordered list",
            searchTerms: ["ordered", "numbers"],
            icon: <ListOrdered className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run()
            }
        },
        {
            title: "Task List",
            description: "Create a to-do checklist",
            searchTerms: ["todo", "checkbox", "check"],
            icon: <CheckSquare className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run()
            }
        },
        {
            title: "Quote",
            description: "Add a blockquote",
            searchTerms: ["blockquote", "cite"],
            icon: <Quote className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run()
            }
        },
        {
            title: "Divider",
            description: "Insert a horizontal divider",
            searchTerms: ["line", "separator", "hr"],
            icon: <Minus className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run()
            }
        },
        {
            title: "Code Block",
            description: "Add a code snippet",
            searchTerms: ["codeblock", "programming"],
            icon: <Code className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
            }
        },
        {
            title: "Image",
            description: "Upload an image from your computer",
            searchTerms: ["photo", "picture", "media"],
            icon: <ImageIcon className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).run()
                // Trigger file input click
                fileInputRef.current?.click()
            }
        },
        {
            title: "Youtube",
            description: "Embed a Youtube video",
            searchTerms: ["video", "youtube", "embed"],
            icon: <YoutubeIcon className="w-5 h-5" />,
            command: ({ editor, range }) => {
                const url = prompt("Enter Youtube URL")
                if (url) {
                    editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run()
                }
            }
        },
        {
            title: "Mermaid Diagram",
            description: "Create a flowchart or diagram",
            searchTerms: ["diagram", "flowchart", "mermaid", "chart", "graph"],
            icon: <GitBranch className="w-5 h-5" />,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).insertContent({ type: "mermaid", attrs: { content: "" } }).run()
            }
        }
    ])

    // Configure Tiptap extensions
    const extensions = [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            bulletList: { keepMarks: true, keepAttributes: false },
            orderedList: { keepMarks: true, keepAttributes: false },
            codeBlock: { HTMLAttributes: { class: "bg-muted rounded-2xl p-4 font-mono text-sm" } },
            blockquote: { HTMLAttributes: { class: "border-l-4 border-primary pl-4 italic" } }
        }),
        Placeholder.configure({
            placeholder: ({ node }) => {
                if (node.type.name === "heading") {
                    return `Heading ${node.attrs.level}`
                }
                return "Press '/' for commands..."
            }
        }),
        Command.configure({
            suggestion: {
                items: () => suggestionItems,
                render: renderItems
            }
        }),
        TiptapLink.configure({
            openOnClick: false,
            HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" }
        }),
        TiptapImage.configure({
            HTMLAttributes: {
                class: "rounded-3xl border border-border"
            },
            allowBase64: true
        }),
        TiptapUnderline,
        TextStyle,
        Color,
        HighlightExtension.configure({ multicolor: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Markdown.configure({
            html: true,
            transformPastedText: true,
            transformCopiedText: true
        }),
        GlobalDragHandle.configure({
            dragHandleWidth: 20,
            scrollTreshold: 100,
            dragHandleSelector: "#drag-handle-element",
        }),
        Table.configure({
            resizable: true,
            HTMLAttributes: {
                class: "border-collapse table-auto w-full my-4",
            },
        }),
        TableRow,
        TableHeader.configure({
            HTMLAttributes: {
                class: "border border-border bg-muted px-4 py-2 text-left font-bold",
            },
        }),
        TableCell.configure({
            HTMLAttributes: {
                class: "border border-border px-4 py-2",
            },
        }),
        Subscript,
        Superscript,
        Typography,
        Youtube.configure({
            controls: false,
            nocookie: true,
            HTMLAttributes: {
                class: "w-full rounded-3xl border border-border overflow-hidden m-0",
            },
        }),
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        MermaidExtension,
        LinkExtension.configure({
            onLinkClick: (title) => {
                window.location.href = `/notes?q=${encodeURIComponent(title)}`
            }
        }) as any
    ]

    useEffect(() => {
        setMounted(true)
        if (content) {
            try {
                setInitialContent(JSON.parse(content))
            } catch {
                // Parse error - treat as raw markdown/string
                setInitialContent(content)
            }
        } else {
            setInitialContent({
                type: "doc",
                content: [{ type: "paragraph" }]
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleUpdate = (editor: any) => {
        if (editor) {
            const json = editor.getJSON()
            onChange(JSON.stringify(json))
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const base64 = await fileToBase64(file)
            // We need to access the editor instance. Since we don't have a ref to the editor instance 
            // in this scope easily (novel hides it), we can't easily insert here without context.
            // Actually, we do need the editor instance to insert content.
            // A trick is to use state or context, but Novel doesn't export context easily.
            // HOWEVER, the slash command gives us 'editor'. But the file change happens later.
            // Let's use a simpler approach: 
            // Since I can't easily pass 'editor' to this handler from the ref...
            // I will rely on the slash command just opening the dialog, but I need to know WHERE to insert.
            // Wait, 'imageUpload' helper handles insertion if I use it.

            // Let's just use the 'imageUpload' function directly if I can invoke it? No.
            // 'imageUpload' creates a handler.

            // Pivot: I will assume the slash command 'Image' is good, but connecting the file input back to the editor is tricky without the editor instance.
            // I will stash the editor instance in a ref when updating? No.

            // Better approach: Use the standard way - drag/drop works with `imageUpload`. 
            // For the slash command, I'll assume users will figure out they can just copy-paste or drag-drop.
            // OR, I can use the `editor` passed to `onUpdate` to store a `currentEditorRef`.
        }
    }

    // Stash editor instance
    const [editorInstance, setEditorInstance] = useState<any>(null)

    const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && editorInstance) {
            const base64 = await fileToBase64(file)
            editorInstance.chain().focus().setImage({ src: base64 }).run()
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    if (!mounted || !initialContent) {
        return <div className="h-[300px] animate-pulse bg-secondary/20 rounded-3xl" />
    }

    return (
        <div className={cn("novel-editor-wrapper relative", className)}>
            <div id="drag-handle-element" className="drag-handle" />
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept="image/*"
                onChange={onUploadFile}
            />

            <EditorRoot>
                <EditorContent
                    immediatelyRender={false}
                    initialContent={initialContent as any}
                    extensions={extensions}
                    editable={editable}
                    onUpdate={({ editor }) => {
                        handleUpdate(editor)
                        setEditorInstance(editor)
                    }}
                    onCreate={({ editor }) => {
                        setEditorInstance(editor)
                    }}
                    editorProps={{
                        handleDrop: (view, event, _slice, moved) =>
                            handleImageDrop(view, event, moved, imageUpload),
                        handlePaste: (view, event, _slice) =>
                            handleImagePaste(view, event, imageUpload),
                        handleDOMEvents: {
                            keydown: (_view, event) => handleCommandNavigation(event)
                        }
                    }}
                    className={cn(
                        // Base prose styling
                        "prose prose-stone dark:prose-invert max-w-none font-sans",
                        "min-h-[300px] w-full border-0 shadow-none",

                        // ProseMirror container
                        "[&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none",
                        "[&_.ProseMirror]:px-4 [&_.ProseMirror]:py-6",

                        // Paragraph typography - comfortable line height, clear paragraph separation
                        "[&_.ProseMirror_p]:leading-7 [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:mt-0",

                        // Headings - larger top margin for visual separation, tighter bottom margin
                        "[&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold",
                        "[&_.ProseMirror_h1]:mt-8 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:leading-tight",
                        "[&_.ProseMirror_h1:first-child]:mt-0",

                        "[&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold",
                        "[&_.ProseMirror_h2]:mt-7 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:leading-tight",
                        "[&_.ProseMirror_h2:first-child]:mt-0",

                        "[&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-medium",
                        "[&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:leading-snug",
                        "[&_.ProseMirror_h3:first-child]:mt-0",

                        // Lists - proper spacing and nesting
                        "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-4",
                        "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-4",
                        "[&_.ProseMirror_li]:my-1 [&_.ProseMirror_li]:leading-7",
                        "[&_.ProseMirror_li_p]:mb-0 [&_.ProseMirror_li_p]:mt-0", // No extra spacing in list items

                        // Task lists
                        "[&_.ProseMirror_ul[data-type='taskList']]:list-none [&_.ProseMirror_ul[data-type='taskList']]:pl-0",
                        "[&_.ProseMirror_ul[data-type='taskList']]:my-4",
                        "[&_.ProseMirror_li[data-type='taskItem']]:flex [&_.ProseMirror_li[data-type='taskItem']]:gap-2",

                        // Blockquotes - clear visual distinction
                        "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/40",
                        "[&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:py-1",
                        "[&_.ProseMirror_blockquote]:my-5 [&_.ProseMirror_blockquote]:italic",
                        "[&_.ProseMirror_blockquote]:text-muted-foreground",
                        "[&_.ProseMirror_blockquote_p]:mb-0", // No extra margin in blockquote paragraphs

                        // Code blocks - distinct separation
                        "[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:rounded-2xl",
                        "[&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:my-5",
                        "[&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:leading-relaxed",
                        "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0",

                        // Inline code
                        "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5",
                        "[&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded-md",
                        "[&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono",

                        // Horizontal rule
                        "[&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:border-border",

                        // Links
                        "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline",
                        "[&_.ProseMirror_a]:underline-offset-4 [&_.ProseMirror_a]:decoration-primary/50",

                        // Images
                        "[&_.ProseMirror_img]:rounded-3xl [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-border [&_.ProseMirror_img]:my-6",

                        // Placeholder styling
                        "[&_.ProseMirror_.is-empty::before]:text-muted-foreground",
                        "[&_.ProseMirror_.is-empty::before]:content-[attr(data-placeholder)]",
                        "[&_.ProseMirror_.is-empty::before]:float-left [&_.ProseMirror_.is-empty::before]:h-0",
                        "[&_.ProseMirror_.is-empty::before]:pointer-events-none",

                        // Read-only state
                        !editable && "pointer-events-none opacity-80"
                    )}
                >
                    {/* Slash Command Menu */}
                    <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-3xl border border-border bg-popover p-2 shadow-xl transition-all">
                        <EditorCommandEmpty className="px-2 py-3 text-center text-sm text-muted-foreground">
                            No commands found
                        </EditorCommandEmpty>
                        <EditorCommandList>
                            {suggestionItems.map((item: SuggestionItem) => (
                                <EditorCommandItem
                                    key={item.title}
                                    value={item.title}
                                    onCommand={(val) => item.command?.(val)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer hover:bg-accent aria-selected:bg-accent transition-colors"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                    </div>
                                </EditorCommandItem>
                            ))}
                        </EditorCommandList>
                    </EditorCommand>

                    {/* Bubble Menu - appears on text selection */}
                    <EditorBubble
                        tippyOptions={{
                            placement: "top",
                            animation: "shift-away"
                        }}
                        className="flex items-center gap-0.5 rounded-full border border-border bg-popover/95 backdrop-blur-sm px-1.5 py-1 shadow-xl"
                    >
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleBold().run()}
                            className="p-1.5 rounded-full hover:bg-accent transition-colors"
                        >
                            <Bold className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
                            className="p-1.5 rounded-full hover:bg-accent transition-colors"
                        >
                            <Italic className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
                            className="p-1.5 rounded-full hover:bg-accent transition-colors"
                        >
                            <Underline className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
                            className="p-1.5 rounded-full hover:bg-accent transition-colors"
                        >
                            <Strikethrough className="w-4 h-4" />
                        </EditorBubbleItem>
                        <div className="w-px h-5 bg-border mx-1" />
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleCode().run()}
                            className="p-1.5 rounded-full hover:bg-accent transition-colors"
                        >
                            <Code className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleHighlight().run()}
                            className="p-1.5 rounded-full hover:bg-accent transition-colors"
                        >
                            <span className="w-4 h-4 bg-yellow-300 dark:bg-yellow-500 rounded text-[10px] font-bold flex items-center justify-center text-black">H</span>
                        </EditorBubbleItem>
                    </EditorBubble>
                </EditorContent>
            </EditorRoot>
        </div>
    )
}
