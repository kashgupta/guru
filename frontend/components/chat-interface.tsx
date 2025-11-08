"use client"

import type React from "react"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Send, VolumeX } from "lucide-react"

export function ChatInterface() {
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = false
        recognitionInstance.interimResults = false
        recognitionInstance.lang = "en-US"

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
          setIsListening(false)
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }

        recognitionInstance.onend = () => {
          setIsListening(false)
        }

        setRecognition(recognitionInstance)
      }

      // Speech Synthesis
      if (window.speechSynthesis) {
        setSynthesis(window.speechSynthesis)
      }
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Speak the last assistant message
  useEffect(() => {
    if (synthesis && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant" && lastMessage.parts) {
        const textParts = lastMessage.parts.filter((part: any) => part.type === "text")
        if (textParts.length > 0 && status !== "in_progress") {
          const text = textParts.map((part: any) => part.text).join(" ")
          speakText(text)
        }
      }
    }
  }, [messages, status, synthesis])

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser.")
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || status === "in_progress") return

    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Chatbot</h1>
          <p className="text-sm text-muted-foreground">Powered by Claude</p>
        </div>
        {isSpeaking && (
          <Button variant="outline" size="icon" onClick={stopSpeaking} className="rounded-full bg-transparent">
            <VolumeX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 bg-card text-center max-w-md">
              <h2 className="text-xl font-semibold mb-2 text-card-foreground">Welcome to AI Chat</h2>
              <p className="text-muted-foreground">
                Start a conversation by typing a message or using the voice button
              </p>
            </Card>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-accent-foreground">AI</span>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  {message.parts?.map((part: any, index: number) => {
                    if (part.type === "text") {
                      return (
                        <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
                          {part.text}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </Card>
          </div>
        ))}

        {status === "in_progress" && (
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
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          onClick={toggleListening}
          className="flex-shrink-0 rounded-full"
          disabled={status === "in_progress"}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : "Type your message..."}
          disabled={status === "in_progress" || isListening}
          className="flex-1"
        />

        <Button
          type="submit"
          disabled={!input.trim() || status === "in_progress"}
          className="flex-shrink-0 rounded-full"
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  )
}
