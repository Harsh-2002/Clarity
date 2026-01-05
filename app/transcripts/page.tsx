"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TranscriptCard } from "@/components/transcript-list/transcript-card"
import { getSettings, getTranscripts, deleteTranscript, exportAllData } from "@/lib/storage"
import type { Transcript } from "@/lib/types"
import { Trash2, Download, CheckSquare, Square } from "lucide-react"

export default function TranscriptsPage() {
  const router = useRouter()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const settings = getSettings()
    if (!settings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      setIsOnboarded(true)
      setTranscripts(getTranscripts().sort((a, b) => b.createdAt - a.createdAt))
    }
  }, [router])

  // Get all unique tags from transcripts
  const allTags = Array.from(
    new Set(
      transcripts.flatMap(t => t.tags || [])
    )
  ).sort()

  const filteredTranscripts = transcripts.filter((t) => {
    const matchesSearch = t.text.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = !selectedTag || (t.tags && t.tags.includes(selectedTag))
    return matchesSearch && matchesTag
  })

  const handleDelete = (id: string) => {
    deleteTranscript(id)
    setTranscripts((prev) => prev.filter((t) => t.id !== id))
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredTranscripts.map((t) => t.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  const handleBatchDelete = () => {
    if (confirm(`Delete ${selectedIds.size} transcript(s)?`)) {
      selectedIds.forEach((id) => {
        deleteTranscript(id)
      })
      setTranscripts((prev) => prev.filter((t) => !selectedIds.has(t.id)))
      deselectAll()
    }
  }

  const handleBatchExport = () => {
    const selectedTranscripts = transcripts.filter((t) => selectedIds.has(t.id))
    const data = JSON.stringify(selectedTranscripts, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transcripts-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOnboarded) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-tight">History</h1>
            <p className="text-muted-foreground">Your past transcriptions</p>
          </div>
          
          {filteredTranscripts.length > 0 && (
            <Button
              onClick={() => setSelectionMode(!selectionMode)}
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              className="mt-1"
            >
              {selectionMode ? "Done" : "Select"}
            </Button>
          )}
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <Button onClick={selectAll} variant="ghost" size="sm">
              Select All
            </Button>
            <Button onClick={deselectAll} variant="ghost" size="sm">
              Clear
            </Button>
            <Button onClick={handleBatchExport} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button onClick={handleBatchDelete} variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        )}

        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-border/40 space-y-3">
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary/50 border-transparent focus:bg-background transition-all"
          />
          
          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-medium">Filter by tag:</span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  !selectedTag
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    selectedTag === tag
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredTranscripts.length > 0 ? (
            filteredTranscripts.map((transcript) => (
              <TranscriptCard 
                key={transcript.id} 
                transcript={transcript} 
                onDelete={handleDelete}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(transcript.id)}
                onToggleSelect={() => toggleSelection(transcript.id)}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No matching transcripts found" : "No transcripts yet"}
              {!searchQuery && (
                <div className="mt-4">
                  <Button onClick={() => router.push("/transcribe")} variant="outline">
                    Start Recording
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
