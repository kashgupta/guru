import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// API endpoint to create ephemeral token for OpenAI Realtime API
// This proxies to the backend server for security (keeps API key server-side)
export async function GET() {
  try {
    console.log('📥 Received voice agent session token request (proxying to backend)')

    // Get backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    console.log('🔀 Proxying to backend:', `${backendUrl}/api/voice-agent/session`)

    // Proxy request to backend
    const response = await fetch(`${backendUrl}/api/voice-agent/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Backend error:', error)
      return NextResponse.json(
        {
          error: error.error || 'Failed to create session',
          details: error
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    console.log('✅ Ephemeral session created successfully via backend')
    console.log('Session ID:', data.session?.id)
    console.log('Token preview:', data.client_secret?.substring(0, 20) + '...')

    // Return the session data
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
