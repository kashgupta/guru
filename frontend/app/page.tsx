"use client"

import { ChatInterface } from "@/components/chat-interface"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Scale, DollarSign, Stethoscope } from "lucide-react"

export default function Home() {
  const [showChat, setShowChat] = useState(false)

  if (showChat) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <ChatInterface />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center space-y-8 max-w-4xl">
          {/* Logo/Badge */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-2xl p-6 shadow-xl">
                <Heart className="h-12 w-12 md:h-16 md:w-16" />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Guru
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Your compassionate AI companion, helping immigrants navigate healthcare, finance, and legal matters with confidence
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Healthcare Guidance</h3>
                <p className="text-sm text-muted-foreground">
                  Navigate insurance, find affordable care, and understand medical billing
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Financial Support</h3>
                <p className="text-sm text-muted-foreground">
                  Get help with budgeting, banking, credit, and financial planning
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Legal Assistance</h3>
                <p className="text-sm text-muted-foreground">
                  Understand your rights, immigration processes, and legal resources
                </p>
              </div>
            </Card>
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => setShowChat(true)}
            size="lg"
            className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
          >
            Start Conversation
          </Button>

          {/* Additional Info */}
          <p className="text-sm text-muted-foreground mt-8">
            Free to use • No sign-up required • Your privacy matters
          </p>
        </div>
      </div>
    </main>
  )
}
