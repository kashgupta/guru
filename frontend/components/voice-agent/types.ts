export interface VoiceAgentProps {
  // Required props
  prompt: string              // System instructions for agent personality

  // Optional props
  context?: string            // Additional context appended to instructions
  initialMessage?: string     // First message agent says after connecting

  // Configuration
  model?: 'gpt-4o-realtime-preview-2024-12-17'
  voice?: 'alloy' | 'echo' | 'shimmer' | 'verse' | 'ash' | 'ballad' | 'coral' | 'sage'

  // Event callbacks
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
  onTranscript?: (speaker: 'user' | 'assistant', message: string) => void

  // UI customization
  className?: string
  showVisualizer?: boolean    // Default: true
  showTranscript?: boolean    // Default: true
}

export interface TranscriptItem {
  speaker: 'user' | 'assistant'
  message: string
  timestamp: Date
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
