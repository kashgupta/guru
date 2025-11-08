import type { UIMessage } from "ai"

export const maxDuration = 30

// Extract the last user message from the conversation history
function getLatestUserPrompt(messages: UIMessage[]): string {
  // Find the last message from the user
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const parts = messages[i].parts || []
      const textPart = parts.find(p => p.type === "text")
      if (textPart && textPart.type === "text") {
        return textPart.text
      }
    }
  }
  return ""
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  // Extract the latest user prompt
  const prompt = getLatestUserPrompt(messages)

  if (!prompt) {
    return Response.json(
      { error: "No user message found" },
      { status: 400 }
    )
  }

  try {
    // Call the backend API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"
    const backendResponse = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.json()
      return Response.json(error, { status: backendResponse.status })
    }

    const data = await backendResponse.json()

    // Transform backend response to streaming format compatible with useChat
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the assistant response in chunks
          const responseText = data.response
          const chunkSize = 50

          // Send text chunks
          for (let i = 0; i < responseText.length; i += chunkSize) {
            const chunk = responseText.slice(i, i + chunkSize)
            const event = `data: ${JSON.stringify({
              type: "text-delta",
              text: chunk,
            })}\n\n`

            controller.enqueue(new TextEncoder().encode(event))
            // Small delay for streaming effect
            await new Promise(resolve => setTimeout(resolve, 5))
          }

          // Send message finish event
          const finishEvent = `data: ${JSON.stringify({
            type: "message-finish",
            finishReason: "stop",
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(finishEvent))

          controller.close()
        } catch (error) {
          console.error("Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Error calling backend:", error)
    return Response.json(
      { error: "Failed to reach backend server", details: String(error) },
      { status: 500 }
    )
  }
}
