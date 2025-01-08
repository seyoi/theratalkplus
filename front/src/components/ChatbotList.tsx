'use client'

import React, { useState, useEffect } from "react"
import axios from "axios"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/app/firebase"
import { Button } from "@/components/ui/button"
import { ChatbotCard } from "@/components/ChatbotCard"
import { AddChatbotForm } from "@/components/CreateChatbot"
import { Chatbot, TrainingData } from "@/types/chatbot"

export default function ChatbotList() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAddingChatbot, setIsAddingChatbot] = useState(false)

  useEffect(() => {
    const authListener = onAuthStateChanged(auth, (user) => {
      if (user) {
        user.getIdToken().then(setToken).catch((error) => {
          console.error("Error fetching ID token:", error)
          setToken(null)
        })
      } else {
        setToken(null)
      }
    })

    return authListener
  }, [])

  useEffect(() => {
    if (token) {
      fetchChatbots()
    }
  }, [token])

  const fetchChatbots = async () => {
    if (!token) {
      setError("User is not authenticated.")
      return
    }

    try {
      const response = await axios.get("https://theratalkplus.com/chatbots", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setChatbots(response.data.chatbots)
    } catch (err) {
      setError("Failed to fetch chatbots")
    }
  }

  const handleAddChatbot = async (name: string) => {
    if (!name) {
      setError("Chatbot name is required.")
      return
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/chatbots",
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setChatbots((prevChatbots) => [...prevChatbots, response.data.chatbot])
      setIsAddingChatbot(false)
      setError(null)
    } catch (err) {
      setError("Failed to add chatbot.")
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* <h2 className="text-3xl font-bold mb-6">dChatbot ㅇList</h2> */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="space-y-6">
        {chatbots.map((chatbot) => (
          <ChatbotCard key={chatbot.chatbotId} chatbot={chatbot} token={token} />
        ))}
      </div>

      {isAddingChatbot ? (
        <AddChatbotForm onSubmit={handleAddChatbot} onCancel={() => setIsAddingChatbot(false)} />
      ) : (
        <Button onClick={() => setIsAddingChatbot(true)} className="mt-6">
          새로운 AI 생성하기
        </Button>
      )}
    </div>
  )
}

