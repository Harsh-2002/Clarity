"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface AudioVisualizerProps {
  frequencyData: Uint8Array | null
  isRecording: boolean
}

export function AudioVisualizer({ frequencyData, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const peaksRef = useRef<number[]>([])
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!canvasRef.current || !frequencyData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize peaks array if needed
    if (peaksRef.current.length !== frequencyData.length) {
      peaksRef.current = new Array(frequencyData.length).fill(0)
    }

    const bgColor = theme === "dark" ? "rgb(20, 20, 20)" : "rgb(245, 245, 245)"
    const barColor = theme === "dark" ? "rgb(59, 130, 246)" : "rgb(59, 130, 246)"
    const peakColor = theme === "dark" ? "rgb(239, 68, 68)" : "rgb(239, 68, 68)"

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const barWidth = canvas.width / frequencyData.length
    ctx.shadowBlur = 4

    for (let i = 0; i < frequencyData.length; i++) {
      const normalizedFreq = frequencyData[i] / 255
      const barHeight = normalizedFreq * canvas.height * 0.95

      // Update peak hold
      if (barHeight > peaksRef.current[i]) {
        peaksRef.current[i] = barHeight
      } else {
        // Decay peaks slowly
        peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1)
      }

      // Draw main bar
      ctx.fillStyle = barColor
      ctx.shadowColor = theme === "dark" ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.3)"
      ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1.5, barHeight)

      // Draw peak indicator
      if (peaksRef.current[i] > 5) {
        ctx.fillStyle = peakColor
        ctx.shadowColor = "transparent"
        ctx.fillRect(
          i * barWidth,
          canvas.height - peaksRef.current[i] - 2,
          barWidth - 1.5,
          2
        )
      }
    }

    ctx.shadowColor = "transparent"
  }, [frequencyData, isRecording, theme])

  return (
    <canvas ref={canvasRef} width={400} height={80} className="w-full border border-border rounded-lg bg-secondary" />
  )
}
