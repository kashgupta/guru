export const maxDuration = 30

export async function POST(req: Request) {
  console.log("=== API Route: POST /api/chat ===")

  try {
    const body = await req.json()
    const { messages } = body

    console.log("Received request with", messages?.length || 0, "messages")

    // Extract the last user message
    let userPrompt = ""
    if (messages && Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          if (typeof messages[i].content === "string") {
            userPrompt = messages[i].content
          }
          break
        }
      }
    }

    if (!userPrompt) {
      console.log("No user prompt found")
      return Response.json(
        { error: "No user message found" },
        { status: 400 }
      )
    }

    console.log("User prompt:", userPrompt)

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"
    console.log("Calling backend:", backendUrl)

    const backendRes = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt }),
    })

    console.log("Backend status:", backendRes.status)

    if (!backendRes.ok) {
      const error = await backendRes.json().catch(() => ({}))
      console.log("Backend error:", error)
      return Response.json(
        { error: "Backend error", details: error },
        { status: backendRes.status }
      )
    }

    const backendData = await backendRes.json()
    console.log("Backend response received, response length:", backendData.response?.length || 0)

    // Return response directly as JSON
    return Response.json({
      success: true,
      message: backendData.response,
      agent: backendData.agent,
    })
  } catch (error) {
    console.error("API Error:", error)
    return Response.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
