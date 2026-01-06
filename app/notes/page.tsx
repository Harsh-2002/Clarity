"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, BookMarked, BookOpen, Pen, Search, Download, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

const NovelEditor = dynamic(() => import("@/components/editor/novel-editor"), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse bg-secondary/20 rounded-lg" />
})
import { formatRelativeTime } from "@/lib/format-time"

interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

type SortOption = "newest" | "oldest" | "title-asc" | "title-desc"

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [content, setContent] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle")

  useEffect(() => {
    setMounted(true)
    loadNotes()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 'n') {
          e.preventDefault()
          createNewNote()
        } else if (e.key === 'k') {
          e.preventDefault()
          document.getElementById('search-input')?.focus()
        } else if (e.key === 'e' && selectedNote) {
          e.preventDefault()
          setViewMode(viewMode === "edit" ? "preview" : "edit")
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, selectedNote])

  const loadNotes = () => {
    try {
      const stored = localStorage.getItem("clarity-notes")
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotes(parsed)
        if (parsed.length > 0) {
          setSelectedNote(parsed[0])
          try {
            setContent(parsed[0].content)
          } catch (e) {
            // Migration: wrap plain text in a basic Tiptap doc structure
            setContent(JSON.stringify({
              type: "doc",
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: parsed[0].content.replace(/<[^>]*>/g, '') }]
              }]
            }))
          }
        }
      }
    } catch (err) {
      console.error("Failed to load notes:", err)
    }
  }

  const saveNotes = (updatedNotes: Note[]) => {
    try {
      setSaveStatus("saving")
      localStorage.setItem("clarity-notes", JSON.stringify(updatedNotes))
      setNotes(updatedNotes)
      setTimeout(() => {
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      }, 300)
    } catch (err) {
      console.error("Failed to save notes:", err)
      setSaveStatus("idle")
    }
  }

  const createNewNote = () => {
    const initialContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "New Note" }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Start writing..." }]
        }
      ]
    })
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: initialContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updatedNotes = [newNote, ...notes]
    saveNotes(updatedNotes)
    setSelectedNote(newNote)
    setContent(initialContent)
  }

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id)
    saveNotes(updatedNotes)
    if (selectedNote?.id === id) {
      const next = updatedNotes[0] || null
      setSelectedNote(next)
      if (next) {
        setContent(next.content)
      } else {
        setContent("")
      }
    }
    setDeleteDialogOpen(false)
    setNoteToDelete(null)
  }

  const confirmDelete = (note: Note) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
  }

  const duplicateNote = (note: Note) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: `${note.title} (Copy)`,
      content: note.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updatedNotes = [newNote, ...notes]
    saveNotes(updatedNotes)
    setSelectedNote(newNote)
    setContent(newNote.content)
  }

  const exportNoteAsMarkdown = (note: Note) => {
    try {
      const data = JSON.parse(note.content)
      let markdown = ""

      const processNode = (node: any): string => {
        if (!node) return ""

        switch (node.type) {
          case "heading":
            const level = node.attrs?.level || 1
            const headingText = node.content?.map((c: any) => c.text || "").join("") || ""
            return `${"#".repeat(level)} ${headingText}\n\n`
          case "paragraph":
            const paraText = node.content?.map((c: any) => c.text || "").join("") || ""
            return `${paraText}\n\n`
          case "bulletList":
            return node.content?.map((item: any) => {
              const itemText = item.content?.[0]?.content?.map((c: any) => c.text || "").join("") || ""
              return `- ${itemText}\n`
            }).join("") + "\n"
          case "orderedList":
            return node.content?.map((item: any, i: number) => {
              const itemText = item.content?.[0]?.content?.map((c: any) => c.text || "").join("") || ""
              return `${i + 1}. ${itemText}\n`
            }).join("") + "\n"
          case "blockquote":
            const quoteText = node.content?.map((c: any) => processNode(c)).join("") || ""
            return `> ${quoteText.trim()}\n\n`
          case "codeBlock":
            const code = node.content?.map((c: any) => c.text || "").join("") || ""
            return `\`\`\`\n${code}\n\`\`\`\n\n`
          default:
            return ""
        }
      }

      if (data.content) {
        data.content.forEach((node: any) => {
          markdown += processNode(node)
        })
      }

      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${note.title}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Failed to export note", e)
    }
  }

  const updateNote = (contentString: string) => {
    if (!selectedNote) return

    setContent(contentString)

    // Extract title from Tiptap JSON content
    let title = "Untitled Note"
    try {
      const data = JSON.parse(contentString)
      if (data.content && data.content.length > 0) {
        const firstNode = data.content[0]
        // Get text from first heading or paragraph
        if (firstNode.content && firstNode.content.length > 0) {
          const textNode = firstNode.content[0]
          if (textNode.text) {
            title = textNode.text.replace(/<[^>]*>/g, '').trim()
          }
        }
      }
    } catch (e) {
      // Keep default title on parse error
    }

    // Limit title length
    title = title.substring(0, 100) || "Untitled Note"

    const updatedNote = {
      ...selectedNote,
      title,
      content: contentString,
      updatedAt: Date.now(),
    }

    const updatedNotes = notes.map((n) => (n.id === selectedNote.id ? updatedNote : n))
    saveNotes(updatedNotes)
    setSelectedNote(updatedNote)
  }

  // Filter and sort notes
  const filteredAndSortedNotes = notes
    .filter(note => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.updatedAt - a.updatedAt
        case "oldest":
          return a.updatedAt - b.updatedAt
        case "title-asc":
          return a.title.localeCompare(b.title)
        case "title-desc":
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

  const wordCount = selectedNote ? (content.blocks?.reduce((acc: number, block: any) => acc + (block.data.text?.split(/\s+/).length || 0), 0) || 0) : 0
  const charCount = selectedNote ? (content.blocks?.reduce((acc: number, block: any) => acc + (block.data.text?.length || 0), 0) || 0) : 0

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{noteToDelete?.title}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => noteToDelete && deleteNote(noteToDelete.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border/50 flex flex-col bg-secondary/10 max-h-[35vh] md:max-h-full">
        <div className="p-4 border-b border-border/50 space-y-3">
          <Button onClick={createNewNote} className="w-full" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-input"
              type="text"
              placeholder="Search notes... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === "newest" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("newest")}
              className="flex-1 text-xs"
            >
              Newest
            </Button>
            <Button
              variant={sortBy === "oldest" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("oldest")}
              className="flex-1 text-xs"
            >
              Oldest
            </Button>
            <Button
              variant={sortBy.startsWith("title") ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy(sortBy === "title-asc" ? "title-desc" : "title-asc")}
              className="flex-1 text-xs"
            >
              A-Z
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredAndSortedNotes.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground text-sm">
              <BookMarked className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-30" />
              {searchQuery ? (
                <>
                  <p className="font-medium mb-1">No notes found</p>
                  <p className="text-xs">Try a different search term</p>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">No notes yet</p>
                  <p className="text-xs">Press Ctrl+N or click "New Note" to get started</p>
                </>
              )}
            </div>
          ) : (
            filteredAndSortedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note)
                  try {
                    setContent(JSON.parse(note.content))
                  } catch {
                    setContent({ time: Date.now(), blocks: [] })
                  }
                }}
                className={cn(
                  "group p-3 md:p-4 rounded-2xl cursor-pointer transition-all duration-200 bg-secondary/30 hover:bg-secondary/60",
                  selectedNote?.id === note.id
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-secondary/20 border border-transparent"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">
                      {note.title}
                    </h3>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {formatRelativeTime(note.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        duplicateNote(note)
                      }}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Duplicate note"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        exportNoteAsMarkdown(note)
                      }}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Export as Markdown"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        confirmDelete(note)
                      }}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                {/* Note Preview */}
                <p className="text-xs text-muted-foreground/70 line-clamp-2">
                  {(() => {
                    try {
                      const data = JSON.parse(note.content)
                      // Find first paragraph or text block
                      const block = data.blocks?.find((b: any) => b.data.text)
                      return block ? block.data.text.replace(/<[^>]*>/g, '').substring(0, 100) : "No content"
                    } catch {
                      return "Error loading preview"
                    }
                  })()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* Header */}
            <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm">
              <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <h2 className="font-semibold text-sm md:text-lg truncate">
                    {selectedNote.title}
                  </h2>
                  {/* Save Status */}
                  {saveStatus !== "idle" && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {saveStatus === "saving" ? (
                        <>
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Saved</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Word Count */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 bg-secondary/50 rounded-full">
                    <span>{wordCount} words</span>
                    <span className="text-border">•</span>
                    <span>{charCount} chars</span>
                  </div>
                  <Button
                    onClick={() => setViewMode("edit")}
                    variant={viewMode === "edit" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                    title="Edit mode (Ctrl+E)"
                  >
                    <Pen className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    onClick={() => setViewMode("preview")}
                    variant={viewMode === "preview" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                    title="Preview mode (Ctrl+E)"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Editor/Preview Area */}
            <div className="flex-1 overflow-y-auto bg-background">
              {viewMode === "edit" ? (
                <div className="h-full p-4 sm:p-6 container mx-auto max-w-4xl">
                  {/* Key forces re-render when switching notes to ensure clean editor state */}
                  <NovelEditor
                    key={`editor-${selectedNote.id}`}
                    content={content}
                    onChange={updateNote}
                    editable={true}
                  />
                </div>
              ) : (
                <div className="h-full p-4 sm:p-6 container mx-auto max-w-4xl">
                  <div className="notion-preview">
                    <NovelEditor
                      key={`preview-${selectedNote.id}`}
                      content={content}
                      onChange={() => { }}
                      editable={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
            <div className="text-center max-w-md">
              <BookMarked className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-20" />
              <p className="text-base md:text-lg font-medium mb-2">No note selected</p>
              <p className="text-xs md:text-sm text-muted-foreground">Create or select a note to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div >
  )
}
