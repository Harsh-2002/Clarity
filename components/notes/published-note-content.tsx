"use client"

import { useMemo } from "react"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"

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
    const htmlContent = useMemo(() => {
        try {
            const json = JSON.parse(note.content)
            return generateHTML(json, [
                StarterKit,
                Link.configure({ openOnClick: true }),
                Highlight,
                TaskList,
                TaskItem.configure({ nested: true }),
            ])
        } catch {
            // If content is plain text
            return note.content
        }
    }, [note.content])

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
                {/* Header */}
                <header className="mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight">
                        {note.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <time dateTime={new Date(note.updatedAt).toISOString()}>
                            Last updated {new Date(note.updatedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </time>
                    </div>
                </header>

                {/* Content */}
                <article
                    className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-light prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

                {/* Footer */}
                <footer className="mt-16 pt-8 border-t border-border/40">
                    <p className="text-sm text-muted-foreground text-center">
                        Published with <span className="font-medium">Clarity</span>
                    </p>
                </footer>
            </div>
        </div>
    )
}
