'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import type { VoiceAgentProps, TranscriptItem, ConnectionStatus } from './types'

export function useVoiceAgent(props: VoiceAgentProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [audioIntensity, setAudioIntensity] = useState(0.3)

  const sessionRef = useRef<RealtimeSession | null>(null)
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Merge prompt with context
  const instructions = props.context
    ? `${props.prompt}\n\nAdditional Context:\n${props.context}`
    : props.prompt

  // Add transcript item
  const addTranscript = useCallback((speaker: 'user' | 'assistant', message: string) => {
    const item: TranscriptItem = {
      speaker,
      message,
      timestamp: new Date()
    }
    setTranscript(prev => [...prev, item])

    // Call callback if provided
    props.onTranscript?.(speaker, message)
  }, [props])

  // Connect to OpenAI Realtime API
  const connect = useCallback(async () => {
    try {
      setStatus('connecting')
      console.log('🟢 Step 1: Fetching ephemeral token from server...')

      // Fetch ephemeral token from API
      const response = await fetch('/api/voice-agent')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Server error:', errorText)
        throw new Error(`Failed to get session token: ${response.status} ${errorText}`)
      }
      const data = await response.json()
      const apiKey = data.client_secret || data.apiKey

      console.log('🟢 Step 2: Ephemeral token received')
      console.log('Token starts with "ek_":', apiKey?.startsWith('ek_'))
      console.log('Token length:', apiKey?.length)
      console.log('Token preview:', apiKey?.substring(0, 20) + '...')

      if (!apiKey || !apiKey.startsWith('ek_')) {
        console.error('❌ Invalid token format! Expected token starting with "ek_"')
        throw new Error('Invalid ephemeral token format')
      }

      console.log('🟢 Step 3: Creating RealtimeAgent...')

      // Create RealtimeAgent
      const agent = new RealtimeAgent({
        name: 'Assistant',
        instructions,
      })

      console.log('🟢 Step 4: Creating RealtimeSession...')

      // Create RealtimeSession
      const session = new RealtimeSession(agent)
      sessionRef.current = session

      console.log('🟢 Step 5: Connecting session with ephemeral token...')
      console.log('⚠️ Overriding URL to use /v1/realtime instead of /v1/realtime/calls (SDK bug workaround)')

      // Connect using the ephemeral token
      // CRITICAL: URL override to fix known bug in @openai/agents 0.1.x
      await session.connect({
        apiKey,
        url: 'https://api.openai.com/v1/realtime'
      })

      setStatus('connected')
      props.onConnected?.()

      // Start wave animation
      setAudioIntensity(0.3)

      // Listen for conversation updates
      // Type assertion to handle event listeners
      const sessionAny = session as any

      sessionAny.on?.('input_audio_buffer.speech_started', () => {
        console.log('User started speaking')
        setAudioIntensity(0.8)
      })

      sessionAny.on?.('input_audio_buffer.speech_stopped', () => {
        console.log('User stopped speaking')
        setAudioIntensity(0.3)
      })

      sessionAny.on?.('conversation.item.created', (event: any) => {
        const item = event.item
        if (item.role === 'user' && item.type === 'message') {
          console.log('User message:', item)
        }
      })

      sessionAny.on?.('response.audio_transcript.done', (event: any) => {
        // Assistant's response transcript
        const transcript = event?.transcript || event?.response?.transcript
        if (transcript && transcript.trim()) {
          addTranscript('assistant', transcript)
        }
      })

      sessionAny.on?.('conversation.item.input_audio_transcription.completed', (event: any) => {
        // User's speech transcript
        const transcript = event?.transcript || event?.item?.transcript
        if (transcript && transcript.trim()) {
          addTranscript('user', transcript)
        }
      })

      sessionAny.on?.('response.audio.delta', () => {
        // Assistant is speaking
        setAudioIntensity(0.9)
      })

      sessionAny.on?.('response.audio.done', () => {
        // Assistant finished speaking
        setAudioIntensity(0.3)
      })

      sessionAny.on?.('error', (error: any) => {
        // Ignore empty error objects or errors without meaningful messages (common SDK bug)
        if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
          console.warn('⚠️ Received empty error event from SDK - ignoring (this is a known SDK bug)')
          return
        }

        console.error('❌ Session error:', error)
        const errorMessage = error?.message || error?.error?.message || ''

        // Only show error in transcript if there's a meaningful message
        if (errorMessage && errorMessage.trim()) {
          addTranscript('assistant', `Error: ${errorMessage}`)
          props.onError?.(error)
        } else {
          console.warn('⚠️ Received error without message - ignoring')
        }
      })

      console.log('🟢 Step 6: Connection successful!')

      // Add initial message if provided
      if (props.initialMessage) {
        addTranscript('assistant', props.initialMessage)
      }

    } catch (error) {
      console.error('❌ Connection error:', error)
      console.error('Error name:', (error as Error).name)
      console.error('Error message:', (error as Error).message)
      console.error('Error stack:', (error as Error).stack)

      setStatus('disconnected')

      let errorMsg = (error as Error).message
      if (errorMsg.includes('setRemoteDescription')) {
        errorMsg = 'WebRTC connection failed. Check console for details.'
        console.error('⚠️ This error usually means:')
        console.error('1. The ephemeral token might be expired (60 second validity)')
        console.error('2. The SDP response from OpenAI is malformed')
        console.error('3. There may be a network/CORS issue')
        console.error('4. Your API key may not have Realtime API access')
      }

      props.onError?.(new Error(errorMsg))
    }
  }, [instructions, props, addTranscript])

  // Disconnect from session
  const disconnect = useCallback(async () => {
    try {
      console.log('🔴 Disconnecting session...')

      if (sessionRef.current) {
        try {
          // Try to close the transport layer
          const transport = (sessionRef.current as any).transport
          if (transport && typeof transport.close === 'function') {
            await transport.close()
          } else if (typeof (sessionRef.current as any).close === 'function') {
            await (sessionRef.current as any).close()
          } else {
            console.warn('No close method found on session or transport')
          }
        } catch (error) {
          console.error('Error during session disconnect:', error)
          // Continue with cleanup even if disconnect fails
        }
        sessionRef.current = null
      }

      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current)
        waveIntervalRef.current = null
      }

      setAudioIntensity(0)
      setStatus('disconnected')
      props.onDisconnected?.()

      console.log('🔴 Disconnected successfully')
    } catch (error) {
      console.error('❌ Error during disconnect:', error)
      // Still update UI state even if there's an error
      setAudioIntensity(0)
      setStatus('disconnected')
      props.onDisconnected?.()
    }
  }, [props])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try {
          const transport = (sessionRef.current as any).transport
          if (transport && typeof transport.close === 'function') {
            transport.close()
          } else if (typeof (sessionRef.current as any).close === 'function') {
            (sessionRef.current as any).close()
          }
        } catch (error) {
          console.error('Error cleaning up session:', error)
        }
      }
      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current)
      }
    }
  }, [])

  return {
    status,
    transcript,
    audioIntensity,
    connect,
    disconnect,
  }
}
