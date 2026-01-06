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
    StarterKit,
    TiptapLink,
    TiptapUnderline,
    TextStyle,
    Color,
    TaskList,
    TaskItem
} from "novel"
import Placeholder from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
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
    Minus
} from "lucide-react"

interface NovelEditorProps {
    content: string
    onChange: (content: string) => void
    className?: string
    editable?: boolean
}

// Slash command suggestions
const slashCommands = [
    {
        title: "Heading 1",
        description: "Large section heading",
        icon: <Heading1 className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run()
        }
    },
    {
        title: "Heading 2",
        description: "Medium section heading",
        icon: <Heading2 className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run()
        }
    },
    {
        title: "Heading 3",
        description: "Small section heading",
        icon: <Heading3 className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run()
        }
    },
    {
        title: "Bullet List",
        description: "Create a bullet list",
        icon: <List className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run()
        }
    },
    {
        title: "Numbered List",
        description: "Create a numbered list",
        icon: <ListOrdered className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        }
    },
    {
        title: "Task List",
        description: "Create a to-do list",
        icon: <CheckSquare className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run()
        }
    },
    {
        title: "Quote",
        description: "Add a blockquote",
        icon: <Quote className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        }
    },
    {
        title: "Divider",
        description: "Add a horizontal divider",
        icon: <Minus className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        }
    },
    {
        title: "Code Block",
        description: "Add a code block",
        icon: <Code className="w-4 h-4" />,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        }
    }
]

// Configure Tiptap extensions
const extensions = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false }
    }),
    Placeholder.configure({
        placeholder: ({ node }) => {
            if (node.type.name === "heading") {
                return `Heading ${node.attrs.level}`
            }
            return "Press '/' for commands..."
        }
    }),
    TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" }
    }),
    TiptapUnderline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true })
]

export default function NovelEditor({
    content,
    onChange,
    className,
    editable = true
}: NovelEditorProps) {
    const [initialContent, setInitialContent] = useState<JSONContent | undefined>(undefined)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (content) {
            try {
                setInitialContent(JSON.parse(content))
            } catch {
                setInitialContent({
                    type: "doc",
                    content: [{ type: "paragraph" }]
                })
            }
        } else {
            setInitialContent({
                type: "doc",
                content: [{ type: "paragraph" }]
            })
        }
    }, [])

    const handleUpdate = (editor: any) => {
        if (editor) {
            const json = editor.getJSON()
            onChange(JSON.stringify(json))
        }
    }

    if (!mounted || !initialContent) {
        return <div className="h-[300px] animate-pulse bg-secondary/20 rounded-lg" />
    }

    return (
        <div className={cn("novel-editor-wrapper relative", className)}>
            <EditorRoot>
                <EditorContent
                    initialContent={initialContent}
                    extensions={extensions}
                    editable={editable}
                    onUpdate={({ editor }) => handleUpdate(editor)}
                    className={cn(
                        "prose prose-stone dark:prose-invert max-w-none font-sans",
                        "min-h-[300px] w-full border-0 shadow-none",
                        "[&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none",
                        "[&_.ProseMirror]:px-4 [&_.ProseMirror]:py-4",
                        "[&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h3]:text-xl",
                        "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:list-decimal",
                        "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic",
                        "[&_.ProseMirror_.is-empty::before]:text-muted-foreground",
                        "[&_.ProseMirror_.is-empty::before]:content-[attr(data-placeholder)]",
                        "[&_.ProseMirror_.is-empty::before]:float-left [&_.ProseMirror_.is-empty::before]:h-0",
                        "[&_.ProseMirror_.is-empty::before]:pointer-events-none",
                        "[&_.ProseMirror_ul[data-type='taskList']]:list-none [&_.ProseMirror_ul[data-type='taskList']]:pl-0",
                        !editable && "pointer-events-none opacity-80"
                    )}
                >
                    {/* Slash Command Menu */}
                    <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-xl transition-all">
                        <EditorCommandEmpty className="px-2 py-3 text-center text-sm text-muted-foreground">
                            No commands found
                        </EditorCommandEmpty>
                        <EditorCommandList>
                            {slashCommands.map((item) => (
                                <EditorCommandItem
                                    key={item.title}
                                    value={item.title}
                                    onCommand={item.command}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent aria-selected:bg-accent transition-colors"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
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

                    {/* Bubble Menu (Formatting Toolbar) */}
                    <EditorBubble
                        tippyOptions={{ placement: "top", animation: "scale-subtle" }}
                        className="flex items-center gap-1 rounded-xl border border-border bg-popover px-2 py-1.5 shadow-xl"
                    >
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleBold().run()}
                            className="p-2 rounded-md hover:bg-accent transition-colors data-[active=true]:bg-accent"
                        >
                            <Bold className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
                            className="p-2 rounded-md hover:bg-accent transition-colors data-[active=true]:bg-accent"
                        >
                            <Italic className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
                            className="p-2 rounded-md hover:bg-accent transition-colors data-[active=true]:bg-accent"
                        >
                            <Underline className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
                            className="p-2 rounded-md hover:bg-accent transition-colors data-[active=true]:bg-accent"
                        >
                            <Strikethrough className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleCode().run()}
                            className="p-2 rounded-md hover:bg-accent transition-colors data-[active=true]:bg-accent"
                        >
                            <Code className="w-4 h-4" />
                        </EditorBubbleItem>
                        <EditorBubbleItem
                            onSelect={(editor) => editor.chain().focus().toggleHighlight().run()}
                            className="p-2 rounded-md hover:bg-accent transition-colors data-[active=true]:bg-accent"
                        >
                            <span className="w-4 h-4 bg-yellow-300 rounded text-xs font-bold flex items-center justify-center">H</span>
                        </EditorBubbleItem>
                    </EditorBubble>
                </EditorContent>
            </EditorRoot>
        </div>
    )
}
