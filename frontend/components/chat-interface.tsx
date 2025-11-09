"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Mic, Send, VolumeX } from "lucide-react"
import { VoiceAgentDialog } from "@/components/voice-agent"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null)
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSynthesis(window.speechSynthesis)
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Speak the last assistant message
  useEffect(() => {
    if (synthesis && messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        console.log("Speaking assistant message:", lastMessage.content.substring(0, 50))
        speakText(lastMessage.content)
      }
    }
  }, [messages, isLoading, synthesis])

  const openVoiceAgent = () => {
    setIsVoiceAgentOpen(true)
  }

  const speakText = (text: string) => {
    if (!synthesis) return

    // Cancel any ongoing speech
    synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthesis) {
      synthesis.cancel()
      setIsSpeaking(false)
    }
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Guru</h1>
          <p className="text-sm text-muted-foreground">
            Here to answer your questions and help you navigate the healthcare system
          </p>
        </div>
        {isSpeaking && (
          <Button
            variant="outline"
            size="icon"
            onClick={stopSpeaking}
            className="rounded-full bg-transparent"
          >
            <VolumeX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 bg-card text-center max-w-md">
              <h2 className="text-md mb-2 text-card-foreground">Welcome to Guru</h2>
              <p className="text-muted-foreground">
                Start a conversation by typing a message or using the voice button
              </p>
            </Card>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground"
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-accent-foreground">AI</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-card">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-xs font-semibold text-accent-foreground">AI</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex gap-2 pb-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openVoiceAgent}
          className="flex-shrink-0 rounded-full"
          disabled={isLoading}
        >
          <Mic className="h-5 w-5" />
        </Button>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1"
        />

        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 rounded-full"
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>

      {/* Voice Agent Dialog */}
      <VoiceAgentDialog
        open={isVoiceAgentOpen}
        onOpenChange={setIsVoiceAgentOpen}
        prompt={`You are a compassionate healthcare advisor helping immigrants understand:
- How to find affordable healthcare options
- Understanding health insurance in the US
- Finding community health centers
- Emergency healthcare procedures
- Preventive care and vaccinations
- Medical bill negotiation and financial assistance
Always provide clear, actionable advice in simple language.`}
      />
    </div>
  )
}
