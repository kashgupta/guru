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

  // Get instructions (just the prompt, no context merging)
  const getInstructions = useCallback(() => {
    console.log('📋 Voice Agent Instructions:')
    console.log('- Has conversation history:', !!props.conversationHistory)
    console.log('- History length:', props.conversationHistory?.length || 0)
    console.log('\n==================== INSTRUCTIONS ====================')
    console.log(props.prompt)
    console.log('======================================================\n')

    return props.prompt
  }, [props.prompt, props.conversationHistory])

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

      // Create RealtimeAgent with latest instructions
      const agent = new RealtimeAgent({
        name: 'Assistant',
        instructions: getInstructions(),
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

      console.log('🟢 Step 5.5: Connection established, checking transport...')

      // Wait a moment for transport to be fully ready
      const sessionAny = session as any
      console.log('- Session object keys:', Object.keys(sessionAny))
      console.log('- Transport exists:', !!sessionAny.transport)
      console.log('- Transport type:', typeof sessionAny.transport)

      if (sessionAny.transport) {
        console.log('- Transport keys:', Object.keys(sessionAny.transport))
        console.log('- Transport.send exists:', !!sessionAny.transport.send)
        console.log('- Transport.sendEvent exists:', !!sessionAny.transport.sendEvent)
      }

      // Poll for transport to be ready (max 3 seconds)
      let transportReady = !!(sessionAny.transport?.sendEvent || sessionAny.transport?.send)
      let attempts = 0
      const maxAttempts = 6 // 3 seconds total (6 * 500ms)

      while (!transportReady && attempts < maxAttempts) {
        attempts++
        console.log(`⚠️ Transport not ready, waiting... (attempt ${attempts}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 500))
        transportReady = !!(sessionAny.transport?.sendEvent || sessionAny.transport?.send)
        console.log(`- Transport ready (attempt ${attempts}):`, transportReady)
      }

      if (!transportReady) {
        console.error('❌ Transport failed to initialize after 3 seconds')
        console.log('Available session methods:', Object.keys(sessionAny).filter(k => typeof sessionAny[k] === 'function'))
        console.log('Available session properties:', Object.keys(sessionAny).filter(k => typeof sessionAny[k] !== 'function'))
      }

      // Inject conversation history using the Conversation Items API
      if (props.conversationHistory && props.conversationHistory.length > 0) {
        console.log('🟢 Step 5.6: Injecting conversation history via Conversation Items API...')
        console.log(`- Injecting ${props.conversationHistory.length} messages as system context`)

        try {
          const sendMethod = sessionAny.transport?.sendEvent || sessionAny.transport?.send

          if (sendMethod) {
            console.log('✅ Using transport method:', sessionAny.transport?.sendEvent ? 'sendEvent' : 'send')

            // Format conversation history as a readable text summary
            // CRITICAL: Use role: "system" instead of "user"/"assistant" to prevent
            // the model from switching from audio to text responses
            // (per OpenAI Realtime API cookbook best practices)
            const conversationText = props.conversationHistory
              .map((msg) => {
                const speaker = msg.role === 'user' ? 'User' : 'Assistant'
                return `${speaker}: ${msg.content}`
              })
              .join('\n\n')

            const contextMessage = `PREVIOUS CONVERSATION CONTEXT:

The user just had a text conversation with you. Here's the complete conversation history:

${conversationText}

---
You are now switching to voice mode. Reference specific details from this conversation when greeting the user.`

            console.log('  - Adding conversation history as system message')
            console.log('\n==================== FULL CONTEXT MESSAGE ====================')
            console.log(contextMessage)
            console.log('==============================================================\n')

            const itemCreatePayload = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'system',  // Use 'system' role per OpenAI best practices
                content: [
                  {
                    type: 'input_text',
                    text: contextMessage
                  }
                ]
              }
            }

            console.log('📤 Sending conversation.item.create:', JSON.stringify(itemCreatePayload, null, 2))
            await sendMethod.call(sessionAny.transport, itemCreatePayload)

            console.log('✅ Conversation history injected successfully as system message')

            // Trigger an initial greeting that acknowledges the conversation history
            console.log('🟢 Step 5.7: Triggering initial greeting...')

            const responseCreatePayload = {
              type: 'response.create',
              response: {
                modalities: ['text', 'audio']
              }
            }

            console.log('📤 Sending response.create:', JSON.stringify(responseCreatePayload, null, 2))
            await sendMethod.call(sessionAny.transport, responseCreatePayload)

            console.log('✅ Successfully triggered initial response with conversation history')
          } else {
            console.warn('⚠️ Transport send method not available')
            console.warn('Available transport methods:', sessionAny.transport ? Object.keys(sessionAny.transport).filter(k => typeof sessionAny.transport[k] === 'function') : 'no transport')
          }
        } catch (historyError) {
          console.error('⚠️ Error injecting conversation history:', historyError)
          console.warn('Continuing without conversation history...')
        }
      } else {
        console.log('🟢 Step 5.6: No conversation history to inject')
      }

      console.log('🟢 Step 6: Setting up event listeners...')

      setStatus('connected')
      props.onConnected?.()

      // Start wave animation
      setAudioIntensity(0.3)

      // Listen for conversation updates (sessionAny already declared above)
      sessionAny.on?.('input_audio_buffer.speech_started', () => {
        console.log('User started speaking')
        setAudioIntensity(0.8)
      })

      sessionAny.on?.('input_audio_buffer.speech_stopped', () => {
        console.log('User stopped speaking')
        setAudioIntensity(0.3)
      })

      sessionAny.on?.('conversation.item.created', (event: any) => {
        console.log('📥 conversation.item.created event:', JSON.stringify(event, null, 2))
        const item = event.item
        if (item.role === 'user' && item.type === 'message') {
          console.log('User message:', item)
        } else if (item.role === 'system' && item.type === 'message') {
          console.log('✅ System message added to conversation:', item.id)
        } else if (item.role === 'assistant' && item.type === 'message') {
          console.log('Assistant message:', item)
        }
      })

      sessionAny.on?.('response.created', (event: any) => {
        console.log('📥 response.created event:', JSON.stringify(event, null, 2))
      })

      sessionAny.on?.('response.done', (event: any) => {
        console.log('📥 response.done event:', JSON.stringify(event, null, 2))
      })

      sessionAny.on?.('response.audio_transcript.done', (event: any) => {
        console.log('📥 response.audio_transcript.done event:', {
          transcript: event?.transcript,
          response: event?.response
        })
        // Assistant's response transcript
        const transcript = event?.transcript || event?.response?.transcript
        if (transcript && transcript.trim()) {
          addTranscript('assistant', transcript)
        }
      })

      sessionAny.on?.('conversation.item.input_audio_transcription.completed', (event: any) => {
        console.log('📥 transcription completed:', event?.transcript?.substring(0, 50))
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

      console.log('🟢 Step 7: Connection fully established!')
      console.log('✅ Voice agent is ready to use')

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
  }, [getInstructions, props, addTranscript])

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
