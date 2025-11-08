'use client'

import { useEffect, useRef } from 'react'
import { TranscriptItem } from './types'
import { ScrollArea } from '../ui/scroll-area'

interface TranscriptViewProps {
  items: TranscriptItem[]
}

export function TranscriptView({ items }: TranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new items are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [items])

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div ref={scrollRef} className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Conversation will appear here...
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className={`flex flex-col gap-1 ${
                item.speaker === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="text-xs font-semibold text-muted-foreground">
                {item.speaker === 'user' ? 'You' : 'Assistant'}
              </div>
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  item.speaker === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.message}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}
