"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, ArrowLeft, Phone, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"
import { VoiceAgentDialog } from "@/components/voice-agent"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import "highlight.js/styles/github-dark.css"

interface FileAttachment {
  name: string
  type: string
  size: number
  url: string // Data URL or uploaded URL
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  attachments?: FileAttachment[]
}

// Agent system prompts matching backend
const AGENT_PROMPTS = {
  healthcare: `You are a compassionate healthcare advisor helping immigrants understand:
- How to find affordable healthcare options
- Understanding health insurance in the US
- Finding community health centers
- Emergency healthcare procedures
- Preventive care and vaccinations
- Medical bill negotiation and financial assistance
Always provide clear, actionable advice in simple language.`,
  financial: `You are a financial advisor specializing in helping immigrants:
- Open bank accounts
- Build credit history
- Understand taxes
- Save money and budget
- Access financial resources
Provide practical, step-by-step guidance.`,
  legal: `You are a legal advisor helping immigrants with:
- Immigration paperwork and processes
- Understanding legal rights
- Finding legal resources
- Document requirements
- Important deadlines
Always clarify that you provide general information, not legal advice, and recommend consulting an attorney for specific cases.`,
} as const

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<keyof typeof AGENT_PROMPTS>('healthcare')
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Show initial greeting on first load
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: Message = {
        id: 'initial-greeting',
        role: 'assistant',
        content: 'Hi! I can help you with anything medical, legal, or financial. What language do you prefer to talk in?'
      }
      setMessages([initialGreeting])
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const openVoiceAgent = () => {
    console.log('🎤 Opening Voice Agent')
    console.log('- Messages count:', messages.length)
    console.log('- Has conversation history:', messages.length > 0)
    if (messages.length > 0) {
      console.log('- First message:', messages[0].content.substring(0, 50) + '...')
      console.log('- Last message:', messages[messages.length - 1].content.substring(0, 50) + '...')
    }
    setIsVoiceAgentOpen(true)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newAttachments: FileAttachment[] = []

    for (const file of Array.from(files)) {
      // Validate file type (images and common documents)
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]

      if (!validTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported. Please upload images or documents (PDF, Word, Text).`)
        continue
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        continue
      }

      // Convert to data URL for preview and sending
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      newAttachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url: dataUrl
      })
    }

    setAttachedFiles(prev => [...prev, ...newAttachments])
  }

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return

    const userMessage = input.trim() || "Please analyze these files"
    console.log("=== User sent message ===")
    console.log("Message:", userMessage)
    console.log("Attachments:", attachedFiles.length)

    // Add user message to UI with attachments
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    const currentAttachments = [...attachedFiles]
    setAttachedFiles([])
    setIsLoading(true)

    try {
      console.log("Calling /api/chat endpoint...")

      // Prepare form data for file upload
      const formData = new FormData()

      // Add conversation history
      const conversationHistory = [
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ]

      formData.append('messages', JSON.stringify(conversationHistory))

      // Add files if any
      if (currentAttachments.length > 0) {
        currentAttachments.forEach((attachment, index) => {
          // Convert data URL back to blob for upload
          const arr = attachment.url.split(',')
          const mime = arr[0].match(/:(.*?);/)?.[1] || ''
          const bstr = atob(arr[1])
          let n = bstr.length
          const u8arr = new Uint8Array(n)
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
          }
          const blob = new Blob([u8arr], { type: mime })
          formData.append('files', blob, attachment.name)
        })
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData, // Send as FormData instead of JSON
      })

      console.log("API Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error:", errorData)
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()
      console.log("API Response received:")
      console.log("- Success:", data.success)
      console.log("- Message length:", data.message?.length || 0)
      console.log("- Agent:", data.agent)

      // Update current agent if backend selected a different one
      if (data.agent && AGENT_PROMPTS[data.agent as keyof typeof AGENT_PROMPTS]) {
        setCurrentAgent(data.agent as keyof typeof AGENT_PROMPTS)
        console.log("- Updated current agent to:", data.agent)
      }

      // Add assistant message to UI
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "No response received",
      }
      setMessages((prev) => [...prev, assistantMsg])
      console.log("Message added to UI")
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      console.log("=== Request complete ===")
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between py-6 px-4 border-b border-border/50 bg-card/30 backdrop-blur-sm rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/70 rounded-xl">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Guru</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Your trusted guide for healthcare, finance, and legal matters
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4 px-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Card className="p-10 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-border/50 text-center max-w-lg shadow-lg">
              <div className="inline-flex p-4 bg-primary/10 rounded-2xl mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-3 text-card-foreground">How can I help you today?</h2>
              <p className="text-muted-foreground mb-6">
                Ask me anything about healthcare, finance, legal matters, or life in the US
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setInput("How do I find affordable health insurance?")}
                >
                  How do I find affordable health insurance?
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setInput("How can I build credit as a new immigrant?")}
                >
                  How can I build credit as a new immigrant?
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setInput("What are my rights as a tenant?")}
                >
                  What are my rights as a tenant?
                </Button>
              </div>
            </Card>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-4 duration-500`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Card
              className={`max-w-[85%] p-5 shadow-md ${
                message.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20"
                  : "bg-card/80 backdrop-blur text-card-foreground border-border/50"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  {/* Show attachments if present */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {message.attachments.map((attachment, idx) => (
                        <div key={idx} className={`rounded-lg overflow-hidden border ${
                          message.role === "user"
                            ? "border-primary-foreground/20 bg-primary-foreground/10"
                            : "border-border bg-muted/30"
                        }`}>
                          {attachment.type.startsWith('image/') ? (
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="max-w-full h-auto rounded-lg"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3">
                              <FileText className="h-8 w-8 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">{attachment.name}</p>
                                <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      components={{
                        // Customize code blocks
                        code: ({ className, children, ...props }: any) => {
                          const isInline = !className
                          return isInline ? (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        },
                        // Customize links
                        a: ({ children, ...props }: any) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {children}
                          </a>
                        ),
                        // Customize paragraphs
                        p: ({ children, ...props }: any) => (
                          <p className="mb-2 last:mb-0" {...props}>
                            {children}
                          </p>
                        ),
                        // Customize lists
                        ul: ({ children, ...props }: any) => (
                          <ul className="list-disc list-inside mb-2" {...props}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children, ...props }: any) => (
                          <ol className="list-decimal list-inside mb-2" {...props}>
                            {children}
                          </ol>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in slide-in-from-bottom-4">
            <Card className="max-w-[85%] p-5 bg-card/80 backdrop-blur shadow-md border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative pb-4 px-2">
        {/* Call button hovering above search bar */}
        <div className="absolute left-6 -top-36 z-10">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={openVoiceAgent}
            className="flex-shrink-0 rounded-full h-28 w-28 hover:bg-primary/10 hover:border-primary/50 transition-all hover:scale-105 shadow-lg bg-card/95 backdrop-blur"
            disabled={isLoading}
          >
            <Phone className="h-14 w-14" />
          </Button>
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="relative group flex items-center gap-2 bg-card/80 backdrop-blur border border-border/50 rounded-lg p-2 pr-8 shadow-sm"
              >
                {file.type.startsWith('image/') ? (
                  <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  className="absolute right-1 top-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedFiles.length > 0 ? "Add a message (optional)..." : "Ask me anything..."}
              disabled={isLoading}
              className="h-12 pl-12 pr-4 rounded-full bg-card/50 backdrop-blur border-border/50 focus:border-primary/50 shadow-sm"
            />
            {/* File upload button inside input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-primary/10"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
            className="flex-shrink-0 rounded-full h-12 w-12 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all hover:scale-105 shadow-sm"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* Voice Agent Dialog */}
      {isVoiceAgentOpen && (
        <VoiceAgentDialog
          key={`voice-agent-${messages.length}`}
          open={isVoiceAgentOpen}
          onOpenChange={setIsVoiceAgentOpen}
          prompt={`${AGENT_PROMPTS[currentAgent]}

GREETING INSTRUCTIONS:
When you first connect, you MUST:
1. Acknowledge the user is switching from text to voice chat
2. Reference specific details from what you already discussed
3. Ask how you can continue helping them

Remember: You have access to the full conversation history, so reference specific topics, concerns, or advice you previously provided.`}
          conversationHistory={messages.length > 0 ? messages : undefined}
        />
      )}
    </div>
  )
}
