import React, { useState } from "react"
import axios from "axios"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrainingDataTable } from "@/components/DataForm"
import { Chatbot, TrainingData } from "@/types/chatbot"
import { AxiosError } from 'axios';
interface ChatbotCardProps {
  chatbot: Chatbot
  token: string | null
}

interface TrainingDataTable {
  data: TrainingData[] | null
  onDelete: (filename: string) => void
}


export function ChatbotCard({ chatbot, token }: ChatbotCardProps) {
  const [trainingData, setTrainingData] = useState<TrainingData[]|null>(null)
  const [isDataVisible, setIsDataVisible] = useState(false)
  const [testMessage, setTestMessage] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const handleFileUpload = async (file: File) => {
    if (!token) {
      console.error("User is not authenticated.")
      return
    }
  
    const formData = new FormData()
    formData.append("file", file)
  
    try {
      const response = await axios.post(
        `http://localhost:8000/chatbots/${chatbot.chatbotId}/train`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      )
  
      alert(response.data.message)
    } catch (err: unknown) {
      // Type guard to check if err is an AxiosError
      if (axios.isAxiosError(err)) {
        // Log detailed error from Axios
        console.error("Axios Error:", err.response?.data || err.message)
      } else {
        // General error logging for other types of errors
        console.error("Unexpected Error:", err)
      }
    }
  }
  
  const handleShowTrainingData = async () => {
    if (!token) {
      console.error("User is not authenticated.");
      return;
    }
  
    try {
      const response = await axios.get(
        `http://localhost:8000/chatbots/${chatbot.chatbotId}/training-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (Array.isArray(response.data) && response.data.length === 0) {
        console.log("No training data available for this chatbot.");
        setTrainingData(null);
        setIsDataVisible(false);
        return;
      }
  
      setTrainingData(response.data);
      setIsDataVisible(true);
  
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.detail || "An unexpected error occurred.";
        alert(`Error fetching training data: ${errorMessage}`);
      } else {
        alert("Unexpected error occurred. Please try again.");
      }
  
      setTrainingData(null);
      setIsDataVisible(false);
    }
  };
  
  
  

  const handleDeleteTrainingData = async (filename: string) => {
    if (!token) {
      console.error("User is not authenticated.")
      return
    }

    try {
      const response = await axios.delete(`http://localhost:8000/chatbots/${chatbot.chatbotId}/training-data/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      alert(response.data)
      handleShowTrainingData()
    } catch (err) {
      console.error("Failed to delete training data.")
    }
  }

  const handleTestMessage = async () => {
    if (!testMessage) {
      console.error("Message cannot be empty.")
      return
    }

    try {
      const response = await axios.post(
        `http://localhost:8000/chatbot/${chatbot.chatbotId}/test/message`,
        { message: testMessage }
      )

      setAiResponse(response.data.response)
      setTestMessage("")
    } catch (err) {
      console.error("Failed to get AI response.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chatbot.name}</CardTitle>
        <CardDescription>
          생성일: {new Date(chatbot.createdDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="training">
          <TabsList>
            <TabsTrigger value="training">학습</TabsTrigger>
            <TabsTrigger value="testing">테스트</TabsTrigger>
          </TabsList>
          <TabsContent value="training">
            <div className="space-y-4">
              <Input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files[0])
                  }
                }}
              />
              <Button onClick={handleShowTrainingData}>학습 데이터 보기</Button>
              {isDataVisible && <TrainingDataTable data={trainingData} onDelete={handleDeleteTrainingData} />}
            </div>
          </TabsContent>
          <TabsContent value="testing">
            <div className="space-y-4">
              <Input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="학습내용을 테스트 해보세요."
              />
              <Button onClick={handleTestMessage}>테스트 답변</Button>
              {aiResponse && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI 답변</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{aiResponse}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

