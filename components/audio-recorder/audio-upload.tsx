"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { PROVIDER_CONFIGS } from "@/lib/providers"
import { getSettings } from "@/lib/storage"

interface AudioUploadProps {
  onFileSelected: (blob: Blob, fileName: string) => void
}

export function AudioUpload({ onFileSelected }: AudioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = event.target.files?.[0]

    if (!file) return

    const settings = getSettings()
    const provider = settings.selectedProvider
    const providerConfig = provider ? PROVIDER_CONFIGS[provider] : null

    if (!providerConfig) {
      setError("Provider not configured")
      return
    }

    // Validate file size
    if (file.size > providerConfig.limits.maxFileSize) {
      setError(`File too large. Maximum size is ${(providerConfig.limits.maxFileSize / 1024 / 1024).toFixed(0)} MB`)
      return
    }

    // Validate file type
    const fileType = file.type.split("/")[1]
    if (!providerConfig.limits.supportedFormats.includes(fileType)) {
      setError(`Unsupported format. Supported formats: ${providerConfig.limits.supportedFormats.join(", ")}`)
      return
    }

    onFileSelected(file, file.name)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />

      <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg" className="w-full">
        Upload Audio File
      </Button>

      {error && <div className="text-sm text-destructive text-center">{error}</div>}
    </div>
  )
}
