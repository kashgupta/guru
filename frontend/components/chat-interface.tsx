"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, ArrowLeft, Phone } from "lucide-react"
import { VoiceAgentDialog } from "@/components/voice-agent"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import "highlight.js/styles/github-dark.css"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    console.log("=== User sent message ===")
    console.log("Message:", userMessage)

    // Add user message to UI
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      console.log("Calling /api/chat endpoint...")

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "user",
              content: userMessage,
            },
          ],
        }),
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
                <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
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

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="h-12 pr-12 rounded-full bg-card/50 backdrop-blur border-border/50 focus:border-primary/50 shadow-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
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
