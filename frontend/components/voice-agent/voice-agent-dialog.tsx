'use client'

import { useVoiceAgent } from './use-voice-agent'
import { AudioVisualizer } from './audio-visualizer'
import type { VoiceAgentProps } from './types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Mic, Phone, PhoneOff, Sparkles } from 'lucide-react'

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
      <DialogContent className="sm:max-w-[650px] bg-gradient-to-br from-card/95 to-card/90 backdrop-blur">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Voice Assistant</DialogTitle>
              <DialogDescription className="text-base">
                Have a natural voice conversation with Guru
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status indicator */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`h-4 w-4 rounded-full ${
                    status === 'connected'
                      ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50'
                      : status === 'connecting'
                      ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50'
                      : 'bg-muted-foreground/40'
                  }`}
                />
                {status === 'connected' && (
                  <div className="absolute inset-0 h-4 w-4 rounded-full bg-green-500 animate-ping opacity-75" />
                )}
              </div>
              <div>
                <span className="text-sm font-semibold">
                  {status === 'connected'
                    ? 'Connected'
                    : status === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
                </span>
                <p className="text-xs text-muted-foreground">
                  {status === 'connected'
                    ? 'Start speaking anytime'
                    : status === 'connecting'
                    ? 'Establishing connection...'
                    : 'Ready to connect'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {status === 'disconnected' ? (
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleConnect}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all hover:scale-105 gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Connect
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleDisconnect}
                  disabled={status === 'connecting'}
                  className="hover:shadow-lg transition-all hover:scale-105 gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </Button>
              )}
            </div>
          </div>

          {/* Audio visualization */}
          {voiceAgentProps.showVisualizer !== false && (
            <div className="border border-border/50 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-inner">
              <AudioVisualizer intensity={audioIntensity} />
            </div>
          )}

          {/* Help text */}
          {status === 'disconnected' && (
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30">
              <Mic className="h-10 w-10 mx-auto mb-3 text-primary opacity-70" />
              <p className="text-sm text-foreground font-medium mb-2">
                Ready to help with healthcare, finance, and legal questions
              </p>
              <p className="text-xs text-muted-foreground">
                Click &quot;Connect&quot; to start a voice conversation. Make sure to allow microphone access when prompted.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
