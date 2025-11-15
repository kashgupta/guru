import { cookies } from 'next/headers';

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  console.log("=== API Route: POST /api/chat ===")

  try {
    // Get user phone from cookie
    const cookieStore = await cookies();
    const userPhone = cookieStore.get('user_phone')?.value;
    // Check if request is multipart/form-data
    const contentType = req.headers.get('content-type') || ''
    const isFormData = contentType.includes('multipart/form-data')

    let messages: any[] = []
    let files: File[] = []

    if (isFormData) {
      // Handle file upload
      const formData = await req.formData()
      const messagesJson = formData.get('messages')

      if (messagesJson && typeof messagesJson === 'string') {
        messages = JSON.parse(messagesJson)
      }

      // Extract files
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter((entry): entry is File => entry instanceof File)

      console.log("Received request with", messages?.length || 0, "messages and", files.length, "files")
    } else {
      // Handle regular JSON request
      const body = await req.json()
      messages = body.messages || []
      console.log("Received request with", messages?.length || 0, "messages")
    }

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

    if (!userPrompt && files.length === 0) {
      console.log("No user prompt or files found")
      return Response.json(
        { error: "No user message or files found" },
        { status: 400 }
      )
    }

    console.log("User prompt:", userPrompt)
    console.log("Files to upload:", files.length)

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"
    // const backendUrl = "https://guru-2.onrender.com" // Use this for production
    console.log("Calling backend:", backendUrl)

    // Prepare request to backend
    let backendRes: Response

    if (files.length > 0) {
      // Forward files to backend as multipart/form-data
      const backendFormData = new FormData()
      backendFormData.append('prompt', userPrompt)

      // Add phone number if available
      if (userPhone) {
        backendFormData.append('phoneNumber', decodeURIComponent(userPhone))
        console.log("Added phone number to request:", decodeURIComponent(userPhone))
      }

      // Add conversation history
      const conversationHistory = messages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      if (conversationHistory.length > 0) {
        backendFormData.append('conversationHistory', JSON.stringify(conversationHistory))
      }

      // Add files
      files.forEach((file, index) => {
        backendFormData.append('files', file, file.name)
      })

      backendRes = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        body: backendFormData,
      })
    } else {
      // Send as JSON
      const requestBody: any = { prompt: userPrompt }
      if (userPhone) {
        requestBody.phoneNumber = decodeURIComponent(userPhone)
        console.log("Added phone number to request:", decodeURIComponent(userPhone))
      }

      backendRes = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
    }

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
