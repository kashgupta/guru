'use client'

import { useVoiceAgent } from './use-voice-agent'
import { AudioVisualizer } from './audio-visualizer'
import { TranscriptView } from './transcript-view'
import type { VoiceAgentProps } from './types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Mic, MicOff, Power } from 'lucide-react'

interface VoiceAgentDialogProps extends VoiceAgentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VoiceAgentDialog({
  open,
  onOpenChange,
  ...voiceAgentProps
}: VoiceAgentDialogProps) {
  const {
    status,
    transcript,
    audioIntensity,
    connect,
    disconnect,
  } = useVoiceAgent(voiceAgentProps)

  const handleConnect = async () => {
    await connect()
  }

  const handleDisconnect = async () => {
    await disconnect()
  }

  const handleClose = () => {
    if (status === 'connected') {
      disconnect()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Voice Agent</DialogTitle>
          <DialogDescription>
            Have a voice conversation with the AI assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  status === 'connected'
                    ? 'bg-green-500 animate-pulse'
                    : status === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-sm font-medium">
                {status === 'connected'
                  ? 'Connected - Start speaking!'
                  : status === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'}
              </span>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant={status === 'connected' ? 'outline' : 'default'}
                size="sm"
                onClick={handleConnect}
                disabled={status !== 'disconnected'}
              >
                <Mic className="h-4 w-4 mr-2" />
                Connect
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={status !== 'connected'}
              >
                <Power className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>

          {/* Audio visualization */}
          {voiceAgentProps.showVisualizer !== false && (
            <div className="border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
              <AudioVisualizer intensity={audioIntensity} />
            </div>
          )}

          {/* Transcript */}
          {voiceAgentProps.showTranscript !== false && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Conversation</h3>
              <TranscriptView items={transcript} />
            </div>
          )}

          {/* Help text */}
          {status === 'disconnected' && (
            <p className="text-xs text-muted-foreground text-center">
              Click &quot;Connect&quot; to start a voice conversation. Make sure to allow microphone access when prompted.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
