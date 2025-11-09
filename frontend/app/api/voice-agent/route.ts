import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// API endpoint to create ephemeral token for OpenAI Realtime API
export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    console.log('📥 Received voice agent session token request')

    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured.' },
        { status: 500 }
      )
    }

    console.log('🔑 API key found, creating ephemeral session...')

    // Create ephemeral token for WebRTC
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
        // Enable input audio transcription
        input_audio_transcription: {
          model: 'whisper-1'
        },
        // Configure turn detection
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ OpenAI API error:', JSON.stringify(error, null, 2))
      console.error('Status:', response.status)
      console.error('Status text:', response.statusText)
      return NextResponse.json(
        {
          error: error.error?.message || 'Failed to create session',
          details: error
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    console.log('✅ Ephemeral session created successfully')
    console.log('Session ID:', data.id)
    console.log('Model:', data.model)
    console.log('Expires at:', data.client_secret?.expires_at)
    console.log('Token preview:', data.client_secret?.value?.substring(0, 20) + '...')

    // Validate token format
    if (!data.client_secret?.value?.startsWith('ek_')) {
      console.error('❌ WARNING: Token does not start with "ek_"')
      console.error('Token value:', data.client_secret?.value)
    }

    // Return the client secret for WebRTC connection
    // Using both naming conventions for compatibility
    return NextResponse.json({
      apiKey: data.client_secret.value,
      client_secret: data.client_secret.value,
      session: {
        id: data.id,
        model: data.model,
        expires_at: data.client_secret.expires_at
      }
    })

  } catch (error) {
    console.error('❌ Session creation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
