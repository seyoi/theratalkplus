export interface Chatbot {
    chatbotId: string
    name: string
    status: string
    createdDate: string
  }
  
  export interface TrainingDataItem {
    [key: string]: string | number | null
  }
  
  export interface TrainingData {
    chatbotId: string
    data: TrainingDataItem[]
    filename: string
    status: string
    user_id: string
  }
  
  