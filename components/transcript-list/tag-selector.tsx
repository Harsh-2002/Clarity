"use client"

import { useState } from "react"
import { X, Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TagSelectorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}

const COMMON_TAGS = ["meeting", "idea", "reminder", "note", "todo", "project", "personal"]

export function TagSelector({ tags, onChange, suggestions = [] }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newTag, setNewTag] = useState("")

  const allSuggestions = [...new Set([...COMMON_TAGS, ...suggestions])]
  const availableTags = allSuggestions.filter((tag) => !tags.includes(tag))

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag.toLowerCase().trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="relative space-y-2">
      {/* Existing Tags */}
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-xs"
        >
          <Plus className="w-3 h-3" />
          Add tag
        </button>
      </div>

      {/* Tag Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-xs bg-background border border-border rounded-2xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag(newTag)
                } else if (e.key === "Escape") {
                  setIsOpen(false)
                }
              }}
              placeholder="Type or select..."
              className="flex-1 px-2 py-1 text-sm border-b border-border bg-transparent outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleAddTag(newTag)}
              disabled={!newTag.trim()}
              className="h-7 px-2"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  handleAddTag(tag)
                  setIsOpen(false)
                }}
                className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              >
                {tag}
              </button>
            ))}
            {availableTags.length === 0 && !newTag && (
              <p className="text-xs text-muted-foreground px-2 py-1">All tags used</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
