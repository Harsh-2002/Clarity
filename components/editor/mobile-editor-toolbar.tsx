"use client"

import { Editor } from "@tiptap/core"
import { Bold, Italic, Heading2, ListTodo, Image as ImageIcon, Check, Heading1 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface MobileEditorToolbarProps {
    editor: Editor | null
    onImageUpload: () => void
}

export function MobileEditorToolbar({ editor, onImageUpload }: MobileEditorToolbarProps) {
    if (!editor) return null

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe">
            <div className="flex items-center justify-between p-2 gap-1 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn("h-10 w-10 p-0 rounded-xl", editor.isActive("bold") ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                    >
                        <Bold className="w-5 h-5" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={cn("h-10 w-10 p-0 rounded-xl", editor.isActive("italic") ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                    >
                        <Italic className="w-5 h-5" />
                    </Button>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn("h-10 w-10 p-0 rounded-xl", editor.isActive("heading", { level: 1 }) ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                    >
                        <Heading1 className="w-5 h-5" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={cn("h-10 w-10 p-0 rounded-xl", editor.isActive("heading", { level: 2 }) ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                    >
                        <Heading2 className="w-5 h-5" />
                    </Button>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        className={cn("h-10 w-10 p-0 rounded-xl", editor.isActive("taskList") ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                    >
                        <ListTodo className="w-5 h-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onImageUpload}
                        className="h-10 w-10 rounded-xl hover:bg-secondary"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex items-center ml-2">
                    <Button
                        size="sm"
                        onClick={() => editor.commands.blur()}
                        className="h-9 px-4 rounded-full bg-primary text-primary-foreground shadow-sm"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    )
}
