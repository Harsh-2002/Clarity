"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Trash2, BookMarked, BookOpen, Pen, Search, Download, Copy, Check, MoreVertical, Upload, FileJson, Palette, Printer, Code } from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle")

  // Removed unused fileInputRef




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

  const saveNotes = useCallback((updatedNotes: Note[]) => {
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
  }, [])

  const createNewNote = useCallback(() => {
    const initialContent = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph" }]
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
  }, [notes, saveNotes])

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
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createNewNote])

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
            if (!node.content) return "\n"
            return node.content.map((c: any) => {
              if (c.type === "image") {
                return `![${c.attrs?.alt || "image"}](${c.attrs?.src})`
              }
              if (c.type === "text") {
                return c.text || ""
              }
              return ""
            }).join("") + "\n\n"
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
          case "taskList":
            return node.content?.map((item: any) => {
              const checked = item.attrs?.checked ? "x" : " "
              const itemText = item.content?.[0]?.content?.map((c: any) => c.text || "").join("") || ""
              return `- [${checked}] ${itemText}\n`
            }).join("") + "\n"
          case "blockquote":
            const quoteText = node.content?.map((c: any) => processNode(c)).join("") || ""
            return `> ${quoteText.trim()}\n\n`
          case "codeBlock":
            const code = node.content?.map((c: any) => c.text || "").join("") || ""
            return `\`\`\`\n${code}\n\`\`\`\n\n`
          case "image":
            return `![${node.attrs?.alt || "image"}](${node.attrs?.src})\n\n`
          case "horizontalRule":
            return "---\n\n"
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

  const exportNoteAsJSON = (note: Note) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(note.content)
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `${note.title || "note"}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const exportNoteAsPDF = async (note: Note) => {
    // Select note if not already selected
    if (selectedNote?.id !== note.id) {
      setSelectedNote(note)
      try {
        setContent(note.content)
      } catch { }
    }

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 200))

    // Get the editor content element
    const editorElement = document.querySelector('.ProseMirror')
    if (!editorElement) {
      console.error('Editor element not found')
      return
    }

    // Create a clone for PDF generation
    const clone = editorElement.cloneNode(true) as HTMLElement

    // Base styling for the document
    clone.style.cssText = `
      background: white !important;
      color: #1a1a1a !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 10pt !important;
      line-height: 1.5 !important;
      max-width: 100% !important;
      width: 100% !important;
    `

    // ===== HEADINGS =====
    clone.querySelectorAll('h1').forEach(el => {
      (el as HTMLElement).style.cssText = `
        font-size: 18pt !important;
        font-weight: 600 !important;
        margin: 0 0 8pt 0 !important;
        color: #111 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `
    })
    clone.querySelectorAll('h2').forEach(el => {
      (el as HTMLElement).style.cssText = `
        font-size: 14pt !important;
        font-weight: 600 !important;
        margin: 12pt 0 6pt 0 !important;
        color: #222 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `
    })
    clone.querySelectorAll('h3').forEach(el => {
      (el as HTMLElement).style.cssText = `
        font-size: 12pt !important;
        font-weight: 600 !important;
        margin: 10pt 0 4pt 0 !important;
        color: #333 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `
    })
    clone.querySelectorAll('h4, h5, h6').forEach(el => {
      (el as HTMLElement).style.cssText = `
        font-size: 10pt !important;
        font-weight: 600 !important;
        margin: 8pt 0 4pt 0 !important;
        color: #444 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `
    })

    // ===== PARAGRAPHS =====
    clone.querySelectorAll('p').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 0 0 6pt 0 !important;
        color: #1a1a1a !important;
      `
    })

    // ===== LISTS (Ordered & Unordered) =====
    clone.querySelectorAll('ul').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 4pt 0 4pt 16pt !important;
        padding-left: 0 !important;
        list-style-type: disc !important;
      `
    })
    clone.querySelectorAll('ol').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 4pt 0 4pt 16pt !important;
        padding-left: 0 !important;
        list-style-type: decimal !important;
      `
    })
    clone.querySelectorAll('li').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin-bottom: 2pt !important;
        color: #1a1a1a !important;
      `
    })

    // ===== TASK LISTS =====
    clone.querySelectorAll('ul[data-type="taskList"]').forEach(el => {
      (el as HTMLElement).style.cssText = `
        margin: 12pt 0 !important;
        padding-left: 0 !important;
        list-style: none !important;
      `
    })
    clone.querySelectorAll('li[data-type="taskItem"]').forEach(el => {
      (el as HTMLElement).style.cssText = `
        display: flex !important;
        align-items: flex-start !important;
        gap: 8pt !important;
        margin-bottom: 6pt !important;
      `
    })
    clone.querySelectorAll('input[type="checkbox"]').forEach(el => {
      (el as HTMLElement).style.cssText = `
        width: 12pt !important;
        height: 12pt !important;
        margin-top: 2pt !important;
      `
    })

    // ===== CODE BLOCKS =====
    clone.querySelectorAll('pre').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: #f4f4f4 !important;
        border: 1pt solid #ddd !important;
        padding: 12pt !important;
        border-radius: 4pt !important;
        font-family: 'Courier New', monospace !important;
        font-size: 9pt !important;
        line-height: 1.5 !important;
        overflow-wrap: break-word !important;
        white-space: pre-wrap !important;
        margin: 12pt 0 !important;
      `
    })
    clone.querySelectorAll('pre code').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: transparent !important;
        padding: 0 !important;
        font-size: inherit !important;
      `
    })

    // ===== INLINE CODE =====
    clone.querySelectorAll('code:not(pre code)').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: #f0f0f0 !important;
        padding: 2pt 4pt !important;
        border-radius: 3pt !important;
        font-family: 'Courier New', monospace !important;
        font-size: 10pt !important;
        color: #c7254e !important;
      `
    })

    // ===== BLOCKQUOTES =====
    clone.querySelectorAll('blockquote').forEach(el => {
      (el as HTMLElement).style.cssText = `
        border-left: 2pt solid #ccc !important;
        padding-left: 10pt !important;
        margin: 6pt 0 !important;
        color: #555 !important;
        font-style: italic !important;
      `
    })

    // ===== TABLES =====
    clone.querySelectorAll('table').forEach(el => {
      (el as HTMLElement).style.cssText = `
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 6pt 0 !important;
        font-size: 9pt !important;
      `
    })
    clone.querySelectorAll('th').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: #f5f5f5 !important;
        border: 1pt solid #ddd !important;
        padding: 8pt 12pt !important;
        text-align: left !important;
        font-weight: bold !important;
        color: #333 !important;
      `
    })
    clone.querySelectorAll('td').forEach(el => {
      (el as HTMLElement).style.cssText = `
        border: 1pt solid #ddd !important;
        padding: 8pt 12pt !important;
        color: #1a1a1a !important;
      `
    })

    // ===== HORIZONTAL RULES =====
    clone.querySelectorAll('hr').forEach(el => {
      (el as HTMLElement).style.cssText = `
        border: none !important;
        border-top: 1pt solid #ccc !important;
        margin: 24pt 0 !important;
      `
    })

    // ===== LINKS =====
    clone.querySelectorAll('a').forEach(el => {
      (el as HTMLElement).style.cssText = `
        color: #0066cc !important;
        text-decoration: underline !important;
      `
    })

    // ===== IMAGES =====
    clone.querySelectorAll('img').forEach(el => {
      (el as HTMLElement).style.cssText = `
        max-width: 100% !important;
        height: auto !important;
        border-radius: 6pt !important;
        margin: 12pt 0 !important;
        display: block !important;
      `
    })

    // ===== BOLD, ITALIC, STRIKETHROUGH =====
    clone.querySelectorAll('strong, b').forEach(el => {
      (el as HTMLElement).style.cssText = `
        font-weight: bold !important;
        color: inherit !important;
      `
    })
    clone.querySelectorAll('em, i').forEach(el => {
      (el as HTMLElement).style.cssText = `
        font-style: italic !important;
        color: inherit !important;
      `
    })
    clone.querySelectorAll('s, del, strike').forEach(el => {
      (el as HTMLElement).style.cssText = `
        text-decoration: line-through !important;
        color: inherit !important;
      `
    })

    // ===== HIGHLIGHT/MARK =====
    clone.querySelectorAll('mark').forEach(el => {
      (el as HTMLElement).style.cssText = `
        background: #ffeb3b !important;
        padding: 1pt 2pt !important;
        color: #000 !important;
      `
    })

    // Create wrapper div with white background
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'background: white !important; padding: 0 !important;'
    wrapper.appendChild(clone)

    // Dynamic import html2pdf
    const html2pdf = (await import('html2pdf.js')).default

    // Generate PDF with optimized settings
    const opt = {
      margin: [10, 12, 10, 12],
      filename: `${note.title || 'note'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }

    html2pdf().set(opt).from(wrapper).save()
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

  const handleImport = async (file: File) => {
    const text = await file.text()

    let newNote: Note;

    if (file.name.endsWith('.json')) {
      try {
        const imported = JSON.parse(text)
        if (!imported.content) throw new Error("Invalid JSON note")
        newNote = {
          id: Date.now().toString(),
          title: imported.title || file.name.replace('.json', ''),
          content: imported.content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      } catch (e) {
        alert("Failed to parse JSON note")
        return
      }
    } else if (file.name.endsWith('.md')) {
      newNote = {
        id: Date.now().toString(),
        title: file.name.replace('.md', ''),
        content: text, // Store raw markdown - editor will parse it
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    } else {
      alert("Unsupported file type")
      return
    }

    const updatedNotes = [newNote, ...notes]
    saveNotes(updatedNotes)
    setSelectedNote(newNote)
    setContent(newNote.content)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.md'))) {
      await handleImport(file)
    }
  }

  // Filter and sort notes
  const filteredAndSortedNotes = notes
    .filter(note => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const wordCount = (() => {
    if (!content) return 0
    try {
      const data = JSON.parse(content)
      let text = ""
      const traverse = (nodes: any[]) => {
        if (!nodes) return
        nodes.forEach(node => {
          if (node.type === "text" && node.text) {
            text += node.text + " "
          }
          if (node.content) {
            traverse(node.content)
          }
        })
      }
      traverse(data.content || [])
      return text.trim().split(/\s+/).filter(w => w).length
    } catch {
      return 0
    }
  })()

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col md:flex-row h-screen overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>&quot;{noteToDelete?.title}&quot;</strong>? This action cannot be undone.
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
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-border/50 flex flex-col bg-secondary/10 max-h-[35vh] md:max-h-full print:hidden">
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex gap-2">
            <Button onClick={createNewNote} className="flex-1" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>

            <div className="relative">
              <input
                type="file"
                id="import-note"
                className="hidden"
                accept=".json,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                  e.target.value = ""
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                title="Import Note (JSON/MD)"
                onClick={() => document.getElementById('import-note')?.click()}
              >
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>

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
                  <p className="text-xs">Press Ctrl+N or click &quot;New Note&quot; to get started</p>
                </>
              )}
            </div>
          ) : (
            filteredAndSortedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note)
                  setSelectedNote(note)
                  try {
                    setContent(note.content)
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
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {note.content.includes('"text":')
                        ? JSON.parse(note.content).content?.[0]?.content?.[0]?.text || "No content"
                        : "text-muted-foreground"
                      }
                    </div>
                  </div>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmDelete(note)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-all"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formatRelativeTime(note.updatedAt)}
                  </span>
                  {selectedNote?.id === note.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {selectedNote ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10 print:hidden">
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
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 bg-secondary/50 rounded-full print:hidden">
                    <span>{wordCount} words</span>
                  </div>
                  {/* Export Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full print:hidden"
                        title="Export options"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Export As</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportNoteAsPDF(selectedNote)}>
                        <Printer className="w-4 h-4 mr-2" />
                        PDF Document
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportNoteAsMarkdown(selectedNote)}>
                        <FileJson className="w-4 h-4 mr-2" />
                        Markdown File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportNoteAsJSON(selectedNote)}>
                        <Code className="w-4 h-4 mr-2" />
                        JSON Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-background print:overflow-visible">
              <div className="h-full p-4 sm:p-6 container mx-auto max-w-4xl print:max-w-none print:p-8">
                {/* Key forces re-render when switching notes to ensure clean editor state */}
                <NovelEditor
                  key={`editor-${selectedNote.id}`}
                  content={content}
                  onChange={updateNote}
                  editable={true}
                />
              </div>
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
