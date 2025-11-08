'use client'

import { useEffect, useState } from 'react'

interface AudioVisualizerProps {
  intensity: number  // 0.0 - 1.0
}

export function AudioVisualizer({ intensity }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(20).fill(10))

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(Array.from({ length: 20 }, () =>
        Math.random() * 80 * intensity + 10
      ))
    }, intensity > 0.5 ? 50 : 100)

    return () => clearInterval(interval)
  }, [intensity])

  return (
    <div className="flex items-center justify-center gap-1 h-24 p-4">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-1.5 bg-gradient-to-t from-primary/80 to-primary rounded-full transition-all duration-100"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  )
}
