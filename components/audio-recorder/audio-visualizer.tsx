"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface AudioVisualizerProps {
  frequencyData: Uint8Array | null
  isRecording: boolean
}

export function AudioVisualizer({ frequencyData, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!canvasRef.current || !frequencyData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bgColor = theme === "dark" ? "rgb(20, 20, 20)" : "rgb(245, 245, 245)"
    const barColor = theme === "dark" ? "rgb(59, 130, 246)" : "rgb(59, 130, 246)"
    const accentColor = theme === "dark" ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.1)"

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const barWidth = canvas.width / frequencyData.length
    ctx.fillStyle = barColor
    ctx.shadowColor = theme === "dark" ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.3)"
    ctx.shadowBlur = 4

    for (let i = 0; i < frequencyData.length; i++) {
      const normalizedFreq = frequencyData[i] / 255
      const barHeight = normalizedFreq * canvas.height * 0.95
      ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1.5, barHeight)
    }

    ctx.shadowColor = "transparent"
  }, [frequencyData, isRecording, theme])

  return (
    <canvas ref={canvasRef} width={400} height={80} className="w-full border border-border rounded-lg bg-secondary" />
  )
}
