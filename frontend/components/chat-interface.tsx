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
    <div className="flex flex-col h-screen max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-3 sm:py-6 px-3 sm:px-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            className="rounded-full flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex-shrink-0">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Guru</h1>
            </div>
            <p className="hidden sm:block text-sm text-muted-foreground sm:ml-12">
              Your trusted guide for healthcare, finance, and legal matters
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 px-3 sm:px-4 pt-4 pb-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full px-2">
            <Card className="p-6 sm:p-10 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-border/50 text-center max-w-lg shadow-lg w-full">
              <div className="inline-flex p-3 sm:p-4 bg-primary/10 rounded-2xl mb-3 sm:mb-4">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-card-foreground">How can I help you today?</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Ask me anything about healthcare, finance, legal matters, or life in the US
              </p>
              <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setInput("How do I find affordable health insurance?")}
                >
                  How do I find affordable health insurance?
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setInput("How can I build credit as a new immigrant?")}
                >
                  How can I build credit as a new immigrant?
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-primary/10 hover:border-primary/50"
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
              className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-5 shadow-md ${
                message.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20"
                  : "bg-card/80 backdrop-blur text-card-foreground border-border/50"
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                {message.role === "assistant" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1 shadow-sm">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
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

                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      components={{
                        // Customize code blocks
                        code: ({ className, children, ...props }: any) => {
                          const isInline = !className
                          return isInline ? (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs sm:text-sm" {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className={`${className} text-xs sm:text-sm overflow-x-auto block`} {...props}>
                              {children}
                            </code>
                          )
                        },
                        // Customize links
                        a: ({ children, ...props }: any) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-words">
                            {children}
                          </a>
                        ),
                        // Customize paragraphs
                        p: ({ children, ...props }: any) => (
                          <p className="mb-2 last:mb-0 break-words" {...props}>
                            {children}
                          </p>
                        ),
                        // Customize lists
                        ul: ({ children, ...props }: any) => (
                          <ul className="list-disc list-inside mb-2 space-y-1" {...props}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children, ...props }: any) => (
                          <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>
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
            <Card className="max-w-[90%] sm:max-w-[85%] p-3 sm:p-5 bg-card/80 backdrop-blur shadow-md border-border/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom on mobile */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 px-3 sm:px-4 py-3 sm:py-4">
        {/* Call button and WhatsApp button hovering above search bar */}
        <div className="absolute left-4 sm:left-6 -top-20 sm:-top-36 z-10 flex flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={openVoiceAgent}
            className="flex-shrink-0 rounded-full h-16 w-16 sm:h-28 sm:w-28 hover:bg-primary/10 hover:border-primary/50 transition-all hover:scale-105 shadow-lg bg-card/95 backdrop-blur"
            disabled={isLoading}
          >
            <Phone className="h-8 w-8 sm:h-14 sm:w-14" />
          </Button>

          <Button
            asChild
            variant="outline"
            size="icon"
            className="flex-shrink-0 rounded-full h-16 w-16 sm:h-28 sm:w-28 hover:bg-[#25D366]/10 hover:border-[#25D366]/50 transition-all hover:scale-105 shadow-lg bg-card/95 backdrop-blur"
          >
            <a
              href="https://wa.me/15558572494?text=i%20would%20like%20help%20with"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center"
              title="Chat on WhatsApp"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 sm:h-14 sm:w-14 fill-[#25D366]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </Button>
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="relative group flex items-center gap-2 bg-card/80 backdrop-blur border border-border/50 rounded-lg p-2 pr-8 shadow-sm max-w-full"
              >
                {file.type.startsWith('image/') ? (
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[150px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  className="absolute right-1 top-1 h-6 w-6 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedFiles.length > 0 ? "Add a message..." : "Ask me anything..."}
              disabled={isLoading}
              className="h-11 sm:h-12 pl-10 sm:pl-12 pr-4 rounded-full bg-card/50 backdrop-blur border-border/50 focus:border-primary/50 shadow-sm text-sm sm:text-base"
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
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
            className="flex-shrink-0 rounded-full h-11 w-11 sm:h-12 sm:w-12 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all hover:scale-105 shadow-sm"
            size="icon"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
