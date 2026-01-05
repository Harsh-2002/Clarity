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
  const animationRef = useRef<number | undefined>(undefined)
  const smoothedDataRef = useRef<number[]>([])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!frequencyData || !isRecording) {
        // Draw idle center line
        const centerY = canvas.height / 2
        ctx.strokeStyle = theme === "dark" ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.3)"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, centerY)
        ctx.lineTo(canvas.width, centerY)
        ctx.stroke()
        return
      }

      const centerY = canvas.height / 2
      const sliceWidth = canvas.width / frequencyData.length
      
      // Initialize smoothed data array if needed
      if (smoothedDataRef.current.length !== frequencyData.length) {
        smoothedDataRef.current = Array.from(frequencyData)
      }
      
      // Apply smoothing to reduce jitter but keep responsiveness
      const smoothingFactor = 0.18
      for (let i = 0; i < frequencyData.length; i++) {
        smoothedDataRef.current[i] = smoothedDataRef.current[i] * (1 - smoothingFactor) + frequencyData[i] * smoothingFactor
      }
      
      // Draw smooth waveform using time-domain data
      ctx.lineWidth = 3
      ctx.strokeStyle = theme === "dark" ? "rgb(59, 130, 246)" : "rgb(59, 130, 246)"
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      
      ctx.beginPath()
      
      const amplitudeScale = canvas.height * 0.5 // Use 50% of canvas height for strong reaction
      
      for (let i = 0; i < frequencyData.length; i++) {
        const x = i * sliceWidth
        
        // Use smoothed data and scale up the height
        const normalizedValue = (smoothedDataRef.current[i] - 128) / 128.0
        const y = centerY + (normalizedValue * amplitudeScale)
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [frequencyData, isRecording, theme])

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={120} 
      className="w-full rounded-2xl" 
      style={{ background: 'transparent' }}
    />
  )
}
