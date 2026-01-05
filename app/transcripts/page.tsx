"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TranscriptCard } from "@/components/transcript-list/transcript-card"
import { getSettings, getTranscripts } from "@/lib/storage"
import type { Transcript } from "@/lib/types"

export default function TranscriptsPage() {
  const router = useRouter()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const settings = getSettings()
    if (!settings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      setIsOnboarded(true)
      setTranscripts(getTranscripts().sort((a, b) => b.createdAt - a.createdAt))
    }
  }, [router])

  const filteredTranscripts = transcripts.filter((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleDelete = (id: string) => {
    setTranscripts((prev) => prev.filter((t) => t.id !== id))
  }

  if (!isOnboarded) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight">History</h1>
          <p className="text-muted-foreground">Your past transcriptions</p>
        </div>

        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-border/40">
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary/50 border-transparent focus:bg-background transition-all"
          />
        </div>

        <div className="space-y-4">
          {filteredTranscripts.length > 0 ? (
            filteredTranscripts.map((transcript) => (
              <TranscriptCard key={transcript.id} transcript={transcript} onDelete={handleDelete} />
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
