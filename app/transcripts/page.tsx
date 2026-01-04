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
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Transcripts</h1>
            <p className="text-muted-foreground">View and manage all your transcriptions</p>
          </div>

          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary"
          />

          {filteredTranscripts.length > 0 ? (
            <div className="space-y-3">
              {filteredTranscripts.map((transcript) => (
                <TranscriptCard key={transcript.id} transcript={transcript} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="bg-secondary rounded-lg p-8 text-center space-y-3">
              <p className="text-muted-foreground">{searchQuery ? "No transcripts found" : "No transcripts yet"}</p>
              <Button onClick={() => router.push("/transcribe")}>Create your first transcript</Button>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={() => router.push("/transcribe")} variant="outline" className="flex-1">
              New Transcript
            </Button>
            <Button onClick={() => router.push("/settings")} variant="outline" className="flex-1">
              Settings
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
