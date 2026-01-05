"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, BookMarked, BookOpen, Pen, Download, Upload, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview").then((mod) => mod.default),
  { ssr: false }
)

interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [content, setContent] = useState("")
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit")
  const [showMenu, setShowMenu] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    loadNotes()
  }, [])

  const loadNotes = () => {
    try {
      const stored = localStorage.getItem("clarity-notes")
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotes(parsed)
        if (parsed.length > 0) {
          setSelectedNote(parsed[0])
          setContent(parsed[0].content)
        }
      }
    } catch (err) {
      console.error("Failed to load notes:", err)
    }
  }

  const saveNotes = (updatedNotes: Note[]) => {
    try {
      localStorage.setItem("clarity-notes", JSON.stringify(updatedNotes))
      setNotes(updatedNotes)
    } catch (err) {
      console.error("Failed to save notes:", err)
    }
  }

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "# New Note\n\nStart writing...",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updatedNotes = [newNote, ...notes]
    saveNotes(updatedNotes)
    setSelectedNote(newNote)
    setContent(newNote.content)
  }

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((n) => n.id !== id)
    saveNotes(updatedNotes)
    if (selectedNote?.id === id) {
      const next = updatedNotes[0] || null
      setSelectedNote(next)
      setContent(next?.content || "")
    }
  }

  const updateNote = (value: string | undefined) => {
    if (!selectedNote) return
    
    const newContent = value || ""
    setContent(newContent)
    
    // Extract title from first heading or first line
    const lines = newContent.split("\n")
    const firstLine = lines[0] || "Untitled Note"
    const title = firstLine.replace(/^#+\s*/, "").trim() || "Untitled Note"
    
    const updatedNote = {
      ...selectedNote,
      title,
      content: newContent,
      updatedAt: Date.now(),
    }
    
    const updatedNotes = notes.map((n) => (n.id === selectedNote.id ? updatedNote : n))
    saveNotes(updatedNotes)
    setSelectedNote(updatedNote)
  }

  const exportNotes = () => {
    try {
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        notes: notes,
        count: notes.length
      }
      
      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `clarity-notes-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setFeedback({ type: "success", message: `Exported ${notes.length} notes successfully` })
      setShowMenu(false)
    } catch (err) {
      console.error("Export failed:", err)
      setFeedback({ type: "error", message: "Failed to export notes" })
    }
  }

  const importNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importData = JSON.parse(content)
        
        // Validate schema
        if (!importData.notes || !Array.isArray(importData.notes)) {
          throw new Error("Invalid notes data format")
        }
        
        // Validate each note has required fields
        const validNotes = importData.notes.filter((note: any) => 
          note.id && note.title && note.content && note.createdAt && note.updatedAt
        )
        
        if (validNotes.length === 0) {
          throw new Error("No valid notes found in import file")
        }
        
        // Merge with existing notes (avoid duplicates)
        const existingIds = new Set(notes.map(n => n.id))
        const newNotes = validNotes.filter((note: Note) => !existingIds.has(note.id))
        
        const merged = [...notes, ...newNotes]
        saveNotes(merged)
        
        setFeedback({ type: "success", message: `Imported ${newNotes.length} new notes` })
        setShowMenu(false)
      } catch (err) {
        console.error("Import failed:", err)
        setFeedback({ type: "error", message: "Failed to import notes. Invalid file format." })
      }
    }
    
    reader.readAsText(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border/50 flex flex-col bg-secondary/10 max-h-[35vh] md:max-h-full">
        <div className="p-3 md:p-4 border-b border-border/50 space-y-2">
          <div className="flex gap-2">
            <Button onClick={createNewNote} className="flex-1" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
            <div className="relative">
              <Button 
                onClick={() => setShowMenu(!showMenu)} 
                variant="outline" 
                size="lg"
                className="px-3"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={exportNotes}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export Notes
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 text-sm border-t border-border"
                  >
                    <Upload className="w-4 h-4" />
                    Import Notes
                  </button>
                </div>
              )}
            </div>
          </div>
          {feedback && (
            <div className={cn(
              "text-xs px-3 py-2 rounded-full animate-in fade-in slide-in-from-top-2",
              feedback.type === "success" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive"
            )}>
              {feedback.message}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {notes.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground text-sm">
              <BookMarked className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">No notes yet</p>
              <p className="text-xs">Create your first note to get started</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note)
                  setContent(note.content)
                }}
                className={cn(
                  "group p-3 md:p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-secondary/40",
                  selectedNote?.id === note.id
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-secondary/20 border border-transparent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">
                      {note.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation()
                      deleteNote(note.id)
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-border/50 px-3 md:px-6 py-2 md:py-3 flex items-center justify-between bg-background/50 backdrop-blur-sm">
              <h2 className="font-medium text-xs md:text-base truncate max-w-[120px] sm:max-w-[200px] md:max-w-md text-foreground/90">
                {selectedNote.title}
              </h2>
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  onClick={() => setViewMode("edit")}
                  variant={viewMode === "edit" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 md:gap-2 h-8 md:h-9"
                >
                  <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline text-xs md:text-sm">Edit</span>
                </Button>
                <Button
                  onClick={() => setViewMode("preview")}
                  variant={viewMode === "preview" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1 md:gap-2 h-8 md:h-9"
                >
                  <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline text-xs md:text-sm">Preview</span>
                </Button>
              </div>
            </div>
            
            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importNotes}
              className="hidden"
            />

            {/* Editor/Preview Area */}
            <div className="flex-1 overflow-hidden">
              {viewMode === "edit" ? (
                <div className="h-full p-4 sm:p-6 md:p-8 lg:p-12">
                  <textarea
                    value={content}
                    onChange={(e) => updateNote(e.target.value)}
                    placeholder="Start writing... (Markdown supported)"
                    className="w-full h-full resize-none bg-transparent border-0 focus:outline-none text-sm sm:text-base md:text-lg leading-relaxed font-light placeholder:text-muted-foreground/50"
                    style={{
                      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  />
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-4 sm:p-6 md:p-12 bg-secondary/5" data-color-mode="auto">
                  <div className="max-w-4xl mx-auto">
                    <MarkdownPreview 
                      source={content || "*No content yet. Switch to edit mode to start writing.*"} 
                      className="bg-transparent"
                      style={{
                        padding: 0,
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        fontSize: 'clamp(0.9rem, 2vw, 1.125rem)',
                        lineHeight: '1.75'
                      }}
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
    </div>
  )
}
