import logging
from typing import Any, Dict, List, Optional
from fastapi import  requests
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth, firestore
from pydantic import BaseModel
from dotenv import load_dotenv
import ably
import uuid
import openai
from fastapi import Header
from firebase_admin import auth
from pydantic import BaseModel
from datetime import datetime
import os
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
import pandas as pd
from io import BytesIO
from datetime import datetime
from ably import AblyRealtime
import ably
import requests

load_dotenv()



app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Firebase 초기화
cred = credentials.Certificate("carbide-legend-438206-a6-firebase-adminsdk-1kpny-e0b99a3cb9.json")
firebase_admin.initialize_app(cred)
# Firestore 클라이언트
db = firestore.client()



openai.api_key = os.getenv('OPENAI_API_KEY')
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY environment variable is missing")


ably_api_key= os.getenv('ABLY_API_KEY')
ably_client = ably.AblyRest(ably_api_key)



class User(BaseModel):
    email: str
    password: str
    name: str
    

# 챗봇에 대한 메시지 요청 모델
class MessageRequest(BaseModel):
    conversation_id: str
    message: str

  
# 챗봇 모델
class Chatbot(BaseModel):
    name: str
    status: str = "inactive"  # 챗봇 상태 (inactive, active 등)
    createdDate: datetime = datetime.now()  # 챗봇 생성일
    userId: str

# 챗봇 응답 모델
class ChatResponse(BaseModel):
    response: str

 
def verify_firebase_token(authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=400, detail="Authorization header is required")
    
    # Token is expected to be in the format "Bearer <token>"
    token_parts = authorization.split(" ")
    if len(token_parts) != 2 or token_parts[0].lower() != "bearer":
        raise HTTPException(status_code=400, detail="Invalid authorization header format")

    token = token_parts[1]  # Extract token after "Bearer"
    
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(token)  
        return decoded_token  # Return decoded token if successful
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired Firebase ID token. Please refresh your token.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying token: {str(e)}")
    
       
    
@app.get("/profile")
async def get_profile(token: str = Depends(verify_firebase_token)):
    """
    인증된 사용자 정보 반환
    """
    user_id = token["uid"]
    return {"message": f"Hello, user {user_id}", "uid": user_id}



@app.post("/signup")
async def signup(user: User):
    try:
        # Firebase Authentication에 사용자 생성
        user_record = auth.create_user(email=user.email, password=user.password)

        # Firestore에 사용자 정보 저장 (선택사항)
        user_data = {"name": user.name, "email": user.email, "created_at": datetime.utcnow()}
        db.collection("users").document(user_record.uid).set(user_data)

        return {"uid": user_record.uid, "email": user_record.email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/user-data")
async def get_user_data(token: str = Depends(verify_firebase_token)):
    user_id = token["uid"]
    
    # Firestore에서 사용자 정보 가져오기
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_doc.to_dict()
    return {
        "uid": user_id,
        "name": user_data["name"],
        "email": user_data["email"]
    }


@app.get("/chatbots")
async def get_chatbots(token: dict = Depends(verify_firebase_token)):
    """
    사용자가 만든 챗봇 리스트 조회
    """
    try:
        user_id = token["uid"]  # Firebase 인증에서 가져온 UID 사용
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is missing from the token")
        
        # Firestore에서 챗봇 정보 조회
        chatbots_ref = db.collection("chatbots").where("userId", "==", user_id).stream()
        chatbots = [chatbot.to_dict() for chatbot in chatbots_ref]
        
        if not chatbots:
            raise HTTPException(status_code=404, detail="No chatbots found")
        
        return {"chatbots": chatbots}
    
    except Exception as e:
        # 에러 로그를 출력하고 500 오류를 반환
        print(f"Error occurred while fetching chatbots: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching chatbots: {str(e)}")


@app.post("/create_chatbot")
async def create_chatbot(chatbot: Chatbot, token: dict = Depends(verify_firebase_token)):
    """
    새로운 챗봇 생성 (UUID로 고유한 챗봇 아이디 생성)
    """
    user_id = chatbot.userId or token["uid"]  # Use the user ID from the token if it's not provided by the client

    # UUID 생성 (챗봇 고유 아이디로 사용)
    chatbot_id = str(uuid.uuid4())  # 고유한 챗봇 아이디 생성

    # Firestore에 새로운 챗봇 저장
    try:
        chatbot_data = {
            "name": chatbot.name,
            "status": chatbot.status,
            "createdDate": datetime.now(),  # 현재 시간
            "userId": user_id,  # 상담원 ID와 함께 챗봇 데이터 저장
            "chatbotId": chatbot_id
        }

        # Firestore에 문서 추가 (chatbot_id를 문서 ID로 사용)
        db.collection("chatbots").document(chatbot_id).set(chatbot_data)

        return {"message": "Chatbot created successfully", "chatbot_id": chatbot_id}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@app.put("/chatbots/{chatbot_id}")
async def update_chatbot(chatbot_id: str, chatbot: Chatbot, token: str = Depends(verify_firebase_token)):
    """
    기존 챗봇 수정
    """
    user_id = token["uid"]  # Firebase 토큰에서 인증된 사용자의 ID
    
    # Firestore에서 해당 챗봇을 조회
    chatbot_ref = db.collection("chatbots").document(chatbot_id)
    chatbot_doc = chatbot_ref.get()
    
    if not chatbot_doc.exists:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    # 해당 챗봇이 해당 사용자 소유인지 확인
    if chatbot_doc.to_dict().get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this chatbot")
    
    # 챗봇 정보 업데이트
    try:
        chatbot_ref.update({
            "name": chatbot.name,
            "status": chatbot.status,
        })
        return {"message": "Chatbot updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@app.delete("/chatbots/{chatbot_id}")
async def delete_chatbot(chatbot_id: str, token: str = Depends(verify_firebase_token)):
    """
    챗봇 삭제
    """
    user_id = token["uid"]  # Firebase 토큰에서 인증된 사용자의 ID
    
    # Firestore에서 해당 챗봇을 조회
    chatbot_ref = db.collection("chatbots").document(chatbot_id)
    chatbot_doc = chatbot_ref.get()
    
    if not chatbot_doc.exists:
        raise HTTPException(status_code=404, detail="Chatbot not found")
    
    # 해당 챗봇이 해당 사용자 소유인지 확인
    if chatbot_doc.to_dict().get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this chatbot")
    
    # 챗봇 삭제
    try:
        chatbot_ref.delete()
        return {"message": "Chatbot deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))














class ChatResponse(BaseModel):
    response: str           
    
class ChatRequest(BaseModel):
    message: str

class MessageRequest(BaseModel):
    message: str






# @app.post("/chatbot/{chatbot_id}/test/message", response_model=ChatResponse)
# async def test_message(chatbot_id: str, request: MessageRequest):
#     """
#     특정 챗봇에 대해 메시지를 테스트하고 OpenAI 응답을 반환합니다.
#     """
#     conversation_id = str(uuid.uuid4())
#     conversation_ref = db.collection("conversations").document(conversation_id)

#     try:
#         # AI 응답 호출
#         ai_response = await process_request(request.message)

#         # 고객 메시지 저장
#         save_message(conversation_ref, "customer", request.message, "customer")

#         # AI 응답 저장
#         save_message(conversation_ref, "AI", ai_response, "ai")

#         return ChatResponse(response=ai_response)

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")






# 대화 모델 정의
class Conversation(BaseModel):
    chatbotId: str
    userId: str  # 사용자 ID를 추가
    createdAt: str  # 문자열로 정의
    lastMessage: str
    status: str

    class Config:
        orm_mode = True

# 메시지 모델 정의
class Message(BaseModel):
    sender_type: str
    message: str
    timestamp: str  # timestamp는 문자열로 정의
    
    
    
# @app.get("/chatbots/{chatbot_id}/conversations/{user_id}", response_model=List[Conversation])
# async def get_conversations(chatbot_id: str, user_id: str):
#     try:
#         # Firestore에서 대화 데이터 가져오기 (chatbotId와 userId로 필터링)
#         conversations_ref = db.collection("conversations") \
#             .where("chatbotId", "==", chatbot_id) \
#             .where("userId", "==", user_id)  # 유저별로 필터링
#         conversations = conversations_ref.stream()

#         conversation_list = []

#         # 최신 대화 1개만 가져오기 위해서 정렬 후 첫 번째 항목만 선택
#         for conversation in conversations:
#             data = conversation.to_dict()

#             # 각 대화에 대해 메시지 서브컬렉션에서 최신 메시지 하나만 가져오기
#             messages_ref = conversation.reference.collection("messages") \
#                 .order_by("timestamp", direction=firestore.Query.DESCENDING).limit(1)
#             messages = messages_ref.stream()

#             latest_message = None
#             for message in messages:
#                 message_data = message.to_dict()
#                 latest_message = Message(
#                     sender_type=message_data.get("sender_type", ""),
#                     message=message_data.get("message", ""),
#                     timestamp=message_data.get("timestamp", ""),
#                 )

#             # 최신 메시지 정보를 대화 정보에 포함시킴
#             conversation_list.append(Conversation(
#                 chatbotId=data.get("chatbotId", ""),
#                 createdAt=data.get("createdAt", ""),
#                 lastMessage=latest_message.message if latest_message else "No message",
#                 status=data.get("status", ""),
#             ))

#         # 최신 대화만 1개로 필터링 (최신순으로 정렬된 리스트에서 첫 번째 항목만 반환)
      
#         return []  # 대화가 없으면 빈 배열 반환

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/chatbots/{chatbot_id}/conversations/{user_id}", response_model=List[Conversation])
# async def get_conversations(chatbot_id: str, user_id: str):
#     try:
#         conversations_ref = db.collection("conversations") \
#             .where("chatbotId", "==", chatbot_id) \
#             .where("userId", "==", user_id)
#         conversations = conversations_ref.stream()

#         conversation_list = []
#         for conversation in conversations:
#             data = conversation.to_dict()
#             messages_ref = conversation.reference.collection("messages") \
#                 .order_by("timestamp", direction=firestore.Query.DESCENDING).limit(1)
#             messages = messages_ref.stream()

#             latest_message = None
#             for message in messages:
#                 message_data = message.to_dict()
#                 latest_message = Message(
#                     sender_type=message_data.get("sender_type", ""),
#                     message=message_data.get("message", ""),
#                     timestamp=message_data.get("timestamp", "").isoformat() if message_data.get("timestamp") else None,
#                 )

#             conversation_list.append(Conversation(
#                 chatbotId=data.get("chatbotId", ""),
#                 createdAt=data.get("createdAt", ""),
#                 lastMessage=latest_message.message if latest_message else "No message",
#                 status=data.get("status", ""),
#             ))

#         conversation_list.sort(key=lambda x: x.createdAt, reverse=True)

#         return JSONResponse(content={"sessions": conversation_list}, status_code=200)

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
    
    
    
    
# @app.get("/chatbots/{chatbot_id}/sessions")
# async def get_chat_sessions(chatbot_id: str):
#     try:
#         # Firestore에서 해당 챗봇 ID에 관련된 모든 대화 세션 가져오기
#         conversations_ref = db.collection("conversations").where("chatbotId", "==", chatbot_id)
#         conversations = []

#         # 각 문서를 순회하며 필요한 필드를 추출
#         for doc in conversations_ref.stream():
#             session_data = doc.to_dict()
#             # conversationId가 없는 경우, 문서 ID를 사용하거나 기본값 설정
#             session_data["conversationId"] = session_data.get("conversationId", doc.id)
#             conversations.append(session_data)

#         # 세션 목록 반환
#         return {"sessions": conversations}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error fetching chat sessions: {str(e)}")





# @app.get("/chatbots/{chatbot_id}/sessions")
# async def get_chat_sessions_service(chatbot_id: str):
#     """
#     주어진 chatbot_id에 해당하는 대화 세션을 조회
#     """
#     try:
#         # Firestore에서 chatbotId에 해당하는 세션 조회
#         conversations_ref = db.collection("conversations").where("chatbotId", "==", chatbot_id)
#         conversations = [doc.to_dict() for doc in conversations_ref.stream()]

#         # 세션이 없을 경우
#         if not conversations:
#             raise HTTPException(status_code=404, detail="No chat sessions found for this chatbot.")

#         # 세션 응답 가공
#         for session in conversations:
#             session["conversationId"] = session.get("conversationId")

#         return {"sessions": conversations}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error fetching chat sessions: {str(e)}")







from ably import AblyRest, AblyRealtime

ably_rest_client = AblyRest(ably_api_key)
ably_realtime_client = AblyRealtime(ably_api_key)  # 실시간 클라이언트

def get_ably_channel(conversation_id: str):
    return ably_realtime_client.channels.get(conversation_id)

   

# Pydantic 모델 정의
class MessageRequest(BaseModel):
    sender_type: str  # 'customer', 'ai', 'agent', 'manager'
    message: str
    userId: str  = None # 고객 ID
    agentId: str = None  # 상담원(매니저) ID

class ChatResponse(BaseModel):
    response: str

class Chatbot(BaseModel):
    chatbot_id: str
    name: str
    status: str
    created_at: datetime
    last_message: str
    user_id: str

class Message(BaseModel):
    sender_type: str
    message: str
    userId: str = None
    agentId: str = None
 

# 요청 데이터 모델
class CreateChatRequest(BaseModel):
    userId: str
    chatbotId: str

# 응답 데이터 모델
class ChatRoom(BaseModel):
    id: str
    chatbot_id: str
    chat_link: str
    created_at: datetime = None
    name: str
    last_message: Optional[str]
    user_id: str



class Conversation(BaseModel):
    id: str
    chatbot_id: str
    chat_link: str
    created_at: Optional[datetime] = None
    name: Optional[str] = "Chatbot Name"
    last_message: Optional[str] = ""
    user_id: Optional[str] = ""
    status: Optional[str] = "active"  # 기본값으로 "active" 설정


# 채팅방 생성 엔드포인트
@app.post("/chatbots/{chatbot_id}/create_chat", response_model=ChatRoom)
async def create_chatroom(chatbot_id: str, create_request: CreateChatRequest):
    try:
        user_id = create_request.userId
        chatbot_id = create_request.chatbotId
        conversation_id = f"{chatbot_id}_{user_id}"  # 새로운 대화 ID 생성

        # Firestore에서 대화 세션 생성
        conversation_ref = db.collection("conversations").document(conversation_id)
        conversation_ref.set({
            "chatbotId": chatbot_id,
            "userId": user_id,
            "createdAt": datetime.utcnow(),
            "status": "active",
            "lastMessage": "",
            "conversationId": conversation_id,
            "messages": []  # 빈 메시지 배열 초기화
        })

        chat_link = f"/chat/{chatbot_id}/{conversation_id}"

        # 채널 생성 (실시간 메시지를 전송할 수 있도록 설정)
        channel = get_ably_channel(conversation_id)  # get_ably_channel 함수 정의 필요

        # 대화방 정보 반환
        return ChatRoom(
            id=conversation_id,
            chatbotId=chatbot_id,
            chat_link=chat_link,
            created_at=datetime.utcnow(),
            name="Chatbot Name",  # 이 부분은 실제 챗봇의 이름으로 대체
            last_message="",  # 메시지가 없으면 빈 문자열
            user_id=user_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating chat: {str(e)}")


@app.get("/chatbots/{chatbot_id}/conversations", response_model=List[Conversation])
async def get_conversations(chatbot_id: str):
    """
    특정 챗봇 ID에 해당하는 모든 대화를 반환합니다.
    """
    try:
        # Firestore에서 챗봇 ID에 해당하는 모든 대화 문서 조회
        conversations_ref = db.collection("conversations")
        query = conversations_ref.where("chatbotId", "==", chatbot_id).stream()

        conversations = []
        for doc in query:
            data = doc.to_dict()
            conversations.append(Conversation(
                id=doc.id,
                chatbot_id=chatbot_id,
                chat_link=f"/chat/{chatbot_id}/{doc.id}",
                created_at=data.get("createdAt", datetime.utcnow()),  # 기본값: 현재 시간
                name="Chatbot Name",  # 필요 시 Firestore에서 이름을 가져오는 부분 추가 가능
                last_message=data.get("lastMessage", ""),
                user_id=data.get("userId", ""),
                conversation_id = f"{chatbot_id}_{data.get('userId', '')}"

            ))

        return conversations

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving conversations: {str(e)}")

    

@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str):
    """
    특정 세션에 해당하는 모든 메시지를 반환합니다.
    """
    try:
        # Firestore에서 해당 대화 문서 조회
        conversation_ref = db.collection("conversations").document(conversation_id)
        doc = conversation_ref.get()

        # 문서가 없으면 에러 처리
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        
        # 문서 데이터를 로그로 출력하여 확인
        conversation_data = doc.to_dict()
        print(f"Document data: {conversation_data}")

        # 메시지 목록 반환
        messages = conversation_data.get("messages", [])

        # 메시지가 없으면 로그를 찍어봅니다.
        if not messages:
            print(f"Conversation {conversation_id} has no messages.")
        else:
            print(f"Found messages: {messages}")
        
        return messages

    except Exception as e:
        print(f"Error retrieving messages: {str(e)}")  # 추가된 에러 로깅
        raise HTTPException(status_code=500, detail=f"Error retrieving messages: {str(e)}")



# @app.get("/chatrooms/{chatbot_id}/{conversation_id}/message", response_model=List[Message])
# async def get_messages(chatbot_id: str, conversation_id: str):
#     try:
#         # Firestore에서 chatbot_id와 conversation_id로 대화방 찾기
#         conversation_ref = db.collection("conversations").document(conversation_id)
#         conversation_doc = conversation_ref.get()

#         if not conversation_doc.exists:
#             logging.warning(f"Conversation with ID {conversation_id} not found.")
#             raise HTTPException(status_code=404, detail="Conversation not found")

#         # 메시지 배열 가져오기
#         conversation_data = conversation_doc.to_dict()
#         messages = conversation_data.get('messages', [])

#         # 메시지에서 agentId가 None인 경우 빈 문자열로 대체
#         for idx, message in enumerate(messages):
#             if message.get('agentId') is None:
#                 message['agentId'] = ""  # 또는 None으로 둘 수 있습니다
#                 logging.debug(f"Message at index {idx} had no agentId, set to empty string.")

#         # 반환되는 데이터를 로깅
#         logging.debug(f"Fetched {len(messages)} messages: {messages}")

#         # 메시지가 없으면 빈 배열을 반환
#         if not messages:
#             logging.info("No messages found in the conversation.")
        
#         return messages

#     except Exception as e:
#         logging.error(f"Error fetching messages for conversation {conversation_id}: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}") 
    
import logging

logging.basicConfig(level=logging.DEBUG)



# @app.post("/chatrooms/{chatbot_id}/{conversation_id}/message/customer")
# async def send_customer_message(conversation_id: str, chatbot_id: str, request: MessageRequest):
#     try:
#         if request.sender_type != "customer":
#             raise HTTPException(status_code=400, detail="Invalid sender type for customer message.")
        
#         # Firestore에서 대화 세션 조회
#         conversation_ref = db.collection("conversations").document(conversation_id)
#         conversation_doc = conversation_ref.get()

#         if not conversation_doc.exists:
#             # If no conversation exists, create a new one
#             conversation_id = str(uuid.uuid4())
#             conversation_ref = db.collection("conversations").document(conversation_id)
#             conversation_ref.set({
#                 "chatbotId": chatbot_id,
#                 "userId": request.userId,
#                 "createdAt": datetime.utcnow(),
#                 "status": "active",
#                 "lastMessage": "",
#                 "conversationId": conversation_id,
#                 "messages": []
#             })

#         # Save the customer message
#         save_message(conversation_ref, "customer", request.message, request.userId)

#         # AI response processing (for example)
#         ai_response = await process_request(request.message, chatbot_id)
#         save_message(conversation_ref, "ai", ai_response, request.userId)

#         # Update the last message of the conversation
#         conversation_ref.update({"lastMessage": ai_response})

#         # Publish AI response to the channel
#         channel = get_ably_channel(conversation_id)
#         await channel.publish("new-message", {
#             "sender_type": "ai",
#             "message": ai_response,
#             "timestamp": datetime.utcnow().isoformat()
#         })

#         return {"response": ai_response}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error processing customer message: {str(e)}")




# @app.post("/chatrooms/{chatbot_id}/{conversation_id}/message/agent")
# async def send_agent_message(conversation_id: str, chatbot_id: str, request: MessageRequest):
#     try:
#         if request.sender_type != "agent":
#             raise HTTPException(status_code=400, detail="Invalid sender type for agent message.")
        
#         if not request.agentId:
#             raise HTTPException(status_code=400, detail="Agent ID is required for agent messages.")

#         # Firestore에서 대화 세션 조회
#         conversation_ref = db.collection("conversations").document(conversation_id)
#         conversation_doc = conversation_ref.get()

#         if not conversation_doc.exists:
#             raise HTTPException(status_code=404, detail="Conversation not found")

#         # Save the agent message
#         save_message(conversation_ref, "agent", request.message, request.userId, request.agentId)

#         # Update the last message of the conversation
#         conversation_ref.update({"lastMessage": request.message})

#         # Publish agent message to the channel
#         channel = get_ably_channel(conversation_id)
#         await channel.publish("new-message", {
#             "sender_type": "agent",
#             "message": request.message,
#             "timestamp": datetime.utcnow().isoformat()
#         })
#         # send_message_to_kakao(request.message, request.userId, chatbot_id)

#         return {"response": "Message sent by agent, no AI response"}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error processing agent message: {str(e)}")





# def save_message(conversation_ref, sender_type: str, message: str, user_id: str = None, agent_id: str = None):
#     try:
#         # Prepare the message object
#         message_obj = {
#             "sender_type": sender_type,
#             "message": message,
#             "timestamp": datetime.utcnow()
#         }

#         # For customer messages, ensure userId is provided
#         if sender_type == "customer":
#             if not user_id:
#                 raise HTTPException(status_code=400, detail="User ID is required for customer messages.")
#             message_obj["userId"] = user_id

#         # For agent messages, ensure userId and agentId are provided
#         if sender_type == "agent":
#             if not user_id:
#                 raise HTTPException(status_code=400, detail="User ID is required for agent messages.")
#             if not agent_id:
#                 raise HTTPException(status_code=400, detail="Agent ID is required for agent messages.")
#             message_obj["userId"] = user_id  # Include userId for the customer
#             message_obj["agentId"] = agent_id  # Include agentId for the agent

#         # Update Firestore with the new message
#         conversation_ref.update({
#             "messages": firestore.ArrayUnion([message_obj])
#         })

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error saving message: {str(e)}")



  
    
import urllib.parse

@app.delete("/chatbots/{chatbot_id}/training-data/{filename}", response_model=str)
async def delete_training_data(chatbot_id: str, filename: str):
    """
    챗봇 학습 데이터 삭제
    """
    try:
        # URL decode the filename to handle special characters
        decoded_filename = urllib.parse.unquote(filename)

        # Firestore에서 해당 챗봇의 학습 데이터 조회
        training_data_ref = db.collection("training_data").where("chatbotId", "==", chatbot_id)
        training_data_docs = training_data_ref.stream()

        # 해당 filename에 맞는 학습 데이터를 찾아 삭제
        for doc in training_data_docs:
            data = doc.to_dict()
            if data.get("filename") == decoded_filename:
                db.collection("training_data").document(doc.id).delete()  # 해당 문서 삭제
                return f"Training data '{decoded_filename}' deleted successfully."
        
        # 데이터가 없으면 에러
        raise HTTPException(status_code=404, detail=f"Training data with filename '{decoded_filename}' not found.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting training data: {str(e)}")





    
   
    

    


# 카카오 연동 테스트






# 카카오 웹훅 요청 모델
class KakaoAIRequest(BaseModel):
    userRequest: any
    
    










# @app.post("/chatrooms/{chatbot_id}/{conversation_id}/message/customer")
# async def send_customer_message(conversation_id: str, chatbot_id: str, request: MessageRequest):
#     try:
#         if request.sender_type != "customer":
#             raise HTTPException(status_code=400, detail="Invalid sender type for customer message.")
        
#         # Firestore에서 대화 세션 조회
#         conversation_ref = db.collection("conversations").document(conversation_id)
#         conversation_doc = conversation_ref.get()

#         if not conversation_doc.exists:
#             # If no conversation exists, create a new one
#             conversation_id = str(uuid.uuid4())
#             conversation_ref = db.collection("conversations").document(conversation_id)
#             conversation_ref.set({
#                 "chatbotId": chatbot_id,
#                 "userId": request.userId,
#                 "createdAt": datetime.utcnow(),
#                 "status": "active",
#                 "lastMessage": "",
#                 "conversationId": conversation_id,
#                 "messages": []
#             })

#         # Save the customer message
#         save_message(conversation_ref, "customer", request.message, request.userId)

#         # AI response processing (for example)
#         ai_response = await process_request(request.message, chatbot_id)
#         save_message(conversation_ref, "ai", ai_response, request.userId)

#         # Update the last message of the conversation
#         conversation_ref.update({"lastMessage": ai_response})

#         # Publish AI response to the channel
#         channel = get_ably_channel(conversation_id)
#         await channel.publish("new-message", {
#             "sender_type": "ai",
#             "message": ai_response,
#             "timestamp": datetime.utcnow().isoformat()
#         })

#         return {"response": ai_response}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error processing customer message: {str(e)}")



import tracemalloc
tracemalloc.start()



from fastapi import BackgroundTasks




# @app.post("/chatrooms/{chatbot_id}/{conversation_id}/message/agent")
# async def send_agent_message(conversation_id: str, chatbot_id: str, request: MessageRequest, background_tasks: BackgroundTasks):
#     try:
#         if request.sender_type != "agent":
#             raise HTTPException(status_code=400, detail="Invalid sender type for agent message.")
        
#         if not request.agentId:
#             raise HTTPException(status_code=400, detail="Agent ID is required for agent messages.")

#         # Firestore에서 대화 세션 조회
#         conversation_ref = db.collection("conversations").document(conversation_id)
#         conversation_doc = conversation_ref.get()

#         if not conversation_doc.exists:
#             raise HTTPException(status_code=404, detail="Conversation not found")

#         # Save the agent message
#         save_message(conversation_ref, "agent", request.message, request.userId, request.agentId)

#         # Update the last message of the conversation
#         conversation_ref.update({"lastMessage": request.message})

#         # Publish agent message to the channel
#         channel = get_ably_channel(conversation_id)
#         await channel.publish("new-message", {
#             "sender_type": "agent",
#             "message": request.message,
#             "timestamp": datetime.now().isoformat()
#         })
        
        
#     #     background_tasks.add_task(channel.publish, "new-message", {
#     #     "sender_type": "agent",
#     #     "message": request.message,
#     #     "timestamp": datetime.utcnow().isoformat()
#     # })

#         # send_message_to_kakao(request.message, request.userId, chatbot_id)

#         return {"response": "Message sent by agent, no AI response"}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error processing agent message: {str(e)}")



class TrainingData(BaseModel):
    chatbotId: str
    data: list
    filename: str
    # status: str
    # uploaded_at: str
    user_id: str
 
 
 
# # 챗봇 학습 데이터 조회 API
# @app.get("/chatbots/{chatbot_id}/training-data", response_model=List[TrainingData])
# async def get_training_data(chatbot_id: str):
#     """
#     주어진 챗봇 ID에 대한 학습 데이터를 반환
#     """
#     try:
#         # Firestore에서 해당 챗봇의 학습 데이터 가져오기
#         training_data_ref = db.collection("training_data").where("chatbotId", "==", chatbot_id)
#         training_data_docs = training_data_ref.stream()

#         # Firestore의 stream은 동기 제너레이터이므로 일반 for loop 사용
#         training_data_list = []
#         for doc in training_data_docs:
#             data = doc.to_dict()
#             # Pydantic 모델을 사용하여 반환값 처리
#             training_data = TrainingData(
#                 chatbotId=data.get("chatbotId", ""),
#                 data=data.get("data", []),  # Ensure it's a list, fallback to empty list
#                 filename=data.get("filename", ""),
#                 user_id=data.get("user_id", ""),
#             )
#             training_data_list.append(training_data)

#         # 학습 데이터가 없다면 404 에러 반환
#         if not training_data_list:
#             raise HTTPException(status_code=404, detail="No training data found for this chatbot.")

#         return training_data_list  # 반환 시 자동으로 JSON 형식으로 변환됨

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error retrieving training data: {str(e)}")

# Assuming you have a `TrainingData` Pydantic model defined somewhere
# from yourapp.models import TrainingData

# Firestore client setup





# 챗봇 학습 요청 API
@app.post("/chatbots/{chatbotId}/train")
async def train_chatbot(chatbotId: str, file: UploadFile = File(...), token: str = Depends(verify_firebase_token)):
    """
    챗봇 학습을 위한 엑셀 파일 업로드 API
    """
    # 파일을 바이너리로 읽기
    contents = await file.read()

    # 엑셀 파일을 pandas로 읽기
    try:
        # 모든 시트를 읽음
        all_sheets = pd.read_excel(BytesIO(contents), engine="openpyxl", sheet_name=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
    
    # 학습 데이터를 Firestore에 저장하거나, 학습을 시작하는 로직 구현
    try:
        user_id = token["uid"]
        
        # 여러 시트를 처리하는 로직
        for sheet_name, df in all_sheets.items():
            # 각 시트의 데이터를 학습용으로 변환
            training_data = TrainingData(
                chatbotId=chatbotId,
                user_id=user_id,
                filename=file.filename,
                sheet_name=sheet_name,
                data=df.to_dict(orient="records"),  # DataFrame을 Pydantic 모델로 변환
                uploaded_at=datetime.utcnow(),
            )

            # 학습 데이터를 Firestore에 저장
            db.collection("training_data").add(training_data.dict())  # Firestore에 데이터를 저장할 때는 dict로 변환

        # 실제 학습 프로세스 (외부 ML 시스템 또는 API 호출 등) 구현 필요

        return {"message": "Chatbot training started successfully", "chatbotId": chatbotId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting training: {str(e)}")



# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# class BookingData(BaseModel):
#     mode: str
#     selected_times: list[str]
#     preview_message: str
    
    

# class BookingRequest(BaseModel):
#     # chatbot_id: str
#     date: str
#     booking_data: BookingData
    
    
from typing import List, Optional

from datetime import datetime
from typing import List
from pydantic import BaseModel
from fastapi import HTTPException



# @app.post("/set-booking-data-by-date")
# async def set_booking_data_by_date(request: BookingRequest):
#     """
#     Create or update booking data for the given date.
#     """
#     try:
#         booking_data = request.booking_data
#         selected_times = [] if booking_data.mode in ['all', 'none'] else booking_data.selected_times

#         booking_ref = db.collection("booking_data").document(request.date)
#         booking_doc = booking_ref.get()

#         data = {
#             "mode": booking_data.mode,
#             "selected_times": booking_data.selected_times,
#             "preview_message": booking_data.preview_message,
#             "updated_at": datetime.utcnow(),
#         }

#         if booking_doc.exists:
#             booking_ref.update(data)
#         else:
#             data["created_at"] = datetime.utcnow()
#             booking_ref.set(data)

#         return {"message": "Booking data updated successfully", "date": request.date}

#     except Exception as e:
#         logger.error(f"Error setting booking data for date {request.date}: {e}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error setting booking data for date {request.date}: {str(e)}"
#         )


# @app.get("/get-booking-data-by-date")
# def get_booking_data_by_date(today_date: str) -> BookingData:
#     """
#     Retrieve booking data for a specific date. Returns a BookingData model instance.
#     """
#     if not today_date:
#         today_date = datetime.utcnow().strftime("%Y-%m-%d")  # Default to today's date
        
#     try:
#         logger.info(f"Retrieving booking data for date: {today_date}")
#         booking_ref = db.collection("booking_data").document(today_date)
#         booking_doc = booking_ref.get()
        
#         if booking_doc.exists:
#             booking_dict = booking_doc.to_dict()
#             logger.info(f"Booking data found: {booking_dict}")
            
#             # 직접 BookingData 모델의 필드에 값을 할당
#             return BookingData(
#                 selected_times=booking_dict.get("selected_times", []),
#                 mode=booking_dict.get("mode", "none"),
#                 preview_message=booking_dict.get("preview_message", "")
#             )
#         else:
#             logger.info(f"No booking data found for date {today_date}")
#             return BookingData(
#                 selected_times=[],
#                 mode="none",
#                 preview_message=""
#             )
            
#     except Exception as e:
#         logger.error(f"Error retrieving booking data: {e}")
#         raise HTTPException(status_code=500, detail=f"Error retrieving booking data: {str(e)}")

# def generate_booking_response(mode: str, preview_message: str, selected_times: list) -> str:
#     """
#     Generate a response for booking-related inquiries.
#     """
#     if preview_message:
#         return preview_message

#     if mode == 'all':
#         return "금일 당일예약 가능합니다. 원하시는 시간을 말씀해 주시면 확인 후 안내드리겠습니다."
#     elif mode == 'none':
#         return "죄송합니다. 금일 당일예약은 마감되었습니다. 다음에 다시 방문해주시기 바랍니다."
#     elif mode == 'specific' and selected_times:
#         return (
#             f"금일 당일예약 가능하며, 현재 예약 가능 시간은 아래와 같습니다:\n\n"
#             f"[{' , '.join(selected_times)}]\n\n"
#             "예약을 원하시면 아래 정보를 남겨주세요:\n\n"
#             "1. 성함\n2. 연락처\n3. 원하시는 시간대 (위 가능 시간대 중 선택)\n"
#             "4. 원하시는 시술 및 상담\n\n"
#             "당일예약이셔서 약간의 대기는 발생할 수 있으나, 최대한 빠르게 안내 도와드리겠습니다."
#         )
#     else:
#         return "현재 예약 가능한 시간이 없습니다. 다른 날짜로 확인 부탁드립니다."




# async def get_ai_response(user_message: str, chatbot_id: str, selected_times: list) -> str:
#     """
#     Generate an AI response based on the user's message and booking data.
#     """
#     try:
#         # Step 1: Get today's date in 'yyyy-MM-dd' format
#         today_date = datetime.utcnow().strftime('%Y-%m-%d')
        
#         # Step 2: Retrieve booking data for today's date
#         logger.debug(f"Calling get_booking_data_by_date with chatbot_id={chatbot_id}, today_date={today_date}")
#         booking_data = get_booking_data_by_date(today_date)
#         logger.info(f"Booking data retrieved: {booking_data}")
        
#         # 객체 속성에 직접 접근
#         booking_mode = booking_data.mode
#         preview_message = booking_data.preview_message
#         selected_times = booking_data.selected_times
        
#         # if is_booking_related(user_message):
#         #     return generate_booking_response(booking_mode, preview_message, selected_times)
            
#         # If not booking-related, process AI response
#         training_data = get_training_data(chatbot_id)
#         prompt = generate_prompt(user_message, training_data, booking_mode, selected_times)
        
#         openai_response = openai.chat.completions.create(
#             model="gpt-4",
#             messages=[
#                 {"role": "system", "content": "You are a helpful assistant."},
#                 {"role": "user", "content": prompt},
#             ],
#             max_tokens=200,
#             temperature=0.7
#         )
        
#         return openai_response.choices[0].message.content.strip()
        
#     except Exception as e:
#         logger.error(f"Error generating AI response: {e}")
#         raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")
    
    
# def is_booking_related(user_message: str) -> bool:
#     """
#     Check if the user's message is related to booking.
#     """
#     booking_keywords = ["예약", "시간", "당일", "오늘"]
#     return any(keyword in user_message for keyword in booking_keywords)




# def generate_prompt(user_message: str, training_data: list, booking_mode: str, selected_times: list) -> str:
#     """
#     Generate a prompt for the AI model based on user message and context.
#     """
#     prompt = "Here is the training data for the chatbot:\n\n"
#     for idx, item in enumerate(training_data):
#         prompt += f"Training Data {idx+1}:\n"
#         for key, value in item.items():
#             prompt += f"{key}: {value}\n"
#         prompt += "\n"

#     prompt += f"User's Question: {user_message}\n\n"
#     prompt += f"Booking Mode: {booking_mode}\n"
#     prompt += f"Available Time Slots: {', '.join(selected_times) if selected_times else 'None'}\n"
#     prompt += "AI's Answer:"
#     return prompt    






























































# @app.post("/kakao-webhook", tags=["kakao"])
# async def handle_kakao_callback(
#         kakao_ai_request: KakaoAIRequest,
#         background_tasks: BackgroundTasks,
# ):
#     user_id = kakao_ai_request.userRequest['user']['id']

#     # 챗봇 ID 설정 (예시)
#     chatbot_id = "3521caa9-cf1f-4743-861e-7889f7043a77"  # 필요한 경우 동적으로 설정

#     if user_id not in user_requests:
#         user_requests[user_id] = 0

#     if user_requests[user_id] >= MAX_REQUESTS_PER_DAY:
#         return {
#             "version": "2.0",
#             "template": {
#                 "outputs": [{
#                     "simpleText": {
#                         "text": "내일 다시 시도해주세요"
#                     }
#                 }]
#             }
#         }

#     user_input = kakao_ai_request.userRequest['utterance']
#     if len(user_input) < 0 or len(user_input) > 20000:
#         return {
#             "version": "2.0",
#             "template": {
#                 "outputs": [{
#                     "simpleText": {
#                         "text": "10자 이상 20000자 이하로 입력해주세요"
#                     }
#                 }]
#             }
#         }

#     # process_request에 필요한 매개변수 전달
#     background_tasks.add_task(
#         process_request, 
#         prompt=user_input, 
#         callback_url=kakao_ai_request.userRequest['callbackUrl'], 
#         chatbot_id=chatbot_id,
#         user_id = user_id
#     )
#     user_requests[user_id] += 1

#     return {
#         "version": "2.0",
#         "useCallback": True
#     }

# async def process_request(prompt: str, callback_url: str, chatbot_id: str, user_id: str):
#     try:
#         # Firestore에서 트레이닝 데이터 가져오기
#         training_data = get_training_data(chatbot_id)
#         formatted_training_data = "\n".join(str(item) for item in training_data)

#         # 당일 예약 데이터 가져오기
#         today_date = datetime.utcnow().strftime("%Y-%m-%d")
#         booking_data = get_booking_data_by_date(today_date)

#         # 예약 데이터를 문자열로 변환
#         formatted_booking_data = (
#             f"예약 모드: {booking_data.mode}\n"
#             f"선택된 시간: {', '.join(booking_data.selected_times) if booking_data.selected_times else '없음'}\n"
#             f"미리보기 메시지: {booking_data.preview_message}"
#         )

#         # 사용자 질문과 데이터를 조합하여 프롬프트 생성
#         combined_prompt = (
#             f"다음은 '{chatbot_id}' 챗봇의 트레이닝 데이터입니다:\n"
#             f"{formatted_training_data}\n\n"
#             f"다음은 {today_date}의 예약 데이터입니다:\n"
#             f"{formatted_booking_data}\n\n"
#             f"사용자 질문:\n{prompt}\n\n"
#             "위 데이터를 기반으로 사용자 질문에 답변하세요."
#         )

#         # OpenAI 호출
#         response = openai.chat.completions.create(
#             model="gpt-4o-mini",
#             messages=[
#                 {"role": "system", "content": "당신은 지정된 데이터를 기반으로 사용자에게 도움을 주는 병원 상담 챗봇입니다."},
#                 {"role": "user", "content": combined_prompt}
#             ]
#         )
#         ai_response = response.choices[0].message.content.strip()

#         # Firestore에 메시지 저장
#         save_message(chatbot_id, user_id, "customer", prompt)
#         save_message(chatbot_id, user_id, "chatbot", ai_response)

#         # 카카오 응답 포맷
#         request_body = {
#             "version": "2.0",
#             "template": {
#                 "outputs": [
#                     {"simpleText": {"text": ai_response}}
#                 ]
#             }
#         }
#         requests.post(callback_url, json=request_body)

#     except Exception as e:
#         print(f"Error: {e}")
#         error_body = {
#             "version": "2.0",
#             "template": {
#                 "outputs": [
#                     {"simpleText": {"text": "요청 처리 중 문제가 발생했습니다. 다시 시도해주세요."}}
#                 ]
#             }
#         }
#         requests.post(callback_url, json=error_body)




# def save_message(chatbot_id: str, user_id: str, sender_type: str, message: str, agent_id: str = None):
#     try:
#         # Conversation ID를 유저 ID 기반으로 설정
#         conversation_id = f"{chatbot_id}_{user_id}"

#         # Firestore 문서 참조
#         conversation_ref = db.collection("conversations").document(conversation_id)
#         doc = conversation_ref.get()

#         # 세션이 없으면 새로 생성
#         if not doc.exists:
#             conversation_ref.set({
#             "chatbotId": chatbot_id,
#             "userId": user_id,
#             "createdAt": datetime.utcnow(),
#             "status": "active",
#             "lastMessage": message,
#             "conversationId": conversation_id,
#             "messages": []  # 빈 메시지 배열 초기화
#             })

#         # Prepare the message object
#         message_obj = {
#             "sender_type": sender_type,
#             "message": message,
#             "timestamp": datetime.utcnow()
#         }

#         if sender_type == "customer":
#             if not user_id:
#                 raise HTTPException(status_code=400, detail="User ID is required for customer messages.")
#             message_obj["user_id"] = user_id

#         if sender_type == "agent":
#             if not agent_id:
#                 raise HTTPException(status_code=400, detail="Agent ID is required for agent messages.")
#             message_obj["agent_id"] = agent_id

#         # 메시지 Firestore 업데이트
#         conversation_ref.update({
#             "messages": firestore.ArrayUnion([message_obj]),
#             "updated_at": datetime.utcnow(),
#             "lastMessage": message,
#         })

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error saving message: {str(e)}")

 
 
 
 
 
 
 
 
import re
import logging
 
 
 

MAX_REQUESTS_PER_DAY = 3000
user_requests = {}


class ChatbotRequest(BaseModel):
    user_input: str
    today_data: str


class KakaoAIRequest(BaseModel):
     userRequest: Dict[str, Any]
    

class BookingData(BaseModel):
    mode: str
    selected_times: List[str]
    preview_message: Optional[str] = None

class BookingRequest(BaseModel):
    date: str
    booking_data: BookingData


@app.post("/set-booking-data-by-date")
async def set_booking_data_by_date(request: BookingRequest):
    """
    Create or update booking data for the given date.
    """
    try:
        logger.info(f"Request Data: {request.dict()}")  # 요청 데이터 로깅
        booking_data = request.booking_data

        if booking_data.mode == 'unavailable':
            booking_data.selected_times = []

        booking_ref = db.collection("booking_data").document(request.date)
        booking_doc = booking_ref.get()

        data = {
            "mode": booking_data.mode,
            "selected_times": booking_data.selected_times,
            "preview_message": booking_data.preview_message,
            "updated_at": datetime.utcnow(),
        }

        if booking_doc.exists:
            booking_ref.update(data)
        else:
            data["created_at"] = datetime.utcnow()
            booking_ref.set(data)

        logger.info(f"Data saved for {request.date}: {data}")  # Firestore 저장 데이터 로깅
        return {"message": "Booking data updated successfully", "date": request.date}

    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(
        status_code=500,
        detail=f"Error setting booking data for date {request.date}: {str(e)}"
    )   

@app.get("/get-booking-data-by-date/")
def get_booking_data_by_date():
    """
    오늘 날짜의 예약 데이터를 반환합니다.
    """
    today_date = datetime.utcnow().strftime("%Y-%m-%d")  # 오늘 날짜 (UTC 기준)
    
    # 예약 데이터 처리 로직
    try:
        booking_data = {
            "selected_times": ["10:00", "14:00", "15:30"],
            "mode": "specific",
            "preview_message": f"오늘({today_date}) 예약 가능한 시간대는 아래와 같습니다: [10:00, 14:00, 15:30]. 예약을 원하시면 아래 정보를 남겨주세요."
        }

        return booking_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving booking data: {str(e)}")




# 최근 10개 메시지 가져오기
def get_last_10_messages(chatbot_id: str, user_id: str):
    conversation_ref = db.collection("conversations").document(f"{chatbot_id}_{user_id}")
    conversation_doc = conversation_ref.get()
    if conversation_doc.exists:
        messages = conversation_doc.to_dict().get("messages", [])
        return messages[-10:]
    return []




# 챗봇 학습 데이터 조회 API
@app.get("/chatbots/{chatbot_id}/training-data", response_model=List[TrainingData])
def get_training_data(chatbot_id: str):
    """
    주어진 챗봇 ID에 대한 학습 데이터를 반환
    """
    try:
        # Firestore에서 해당 챗봇의 학습 데이터 가져오기
        training_data_ref = db.collection("training_data").where("chatbotId", "==", chatbot_id)
        training_data_docs = training_data_ref.stream()

        # Firestore의 stream은 동기 제너레이터이므로 일반 for loop 사용
        training_data_list = []
        for doc in training_data_docs:
            data = doc.to_dict()
            # Pydantic 모델을 사용하여 반환값 처리
            training_data = TrainingData(
                chatbotId=data.get("chatbotId", ""),
                data=data.get("data", []),  # Ensure it's a list, fallback to empty list
                filename=data.get("filename", ""),
                user_id=data.get("user_id", ""),
            )
            training_data_list.append(training_data)

        # 학습 데이터가 없다면 404 에러 반환
        if not training_data_list:
            raise HTTPException(status_code=404, detail="No training data found for this chatbot.")

        return training_data_list  # 반환 시 자동으로 JSON 형식으로 변환됨

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving training data: {str(e)}")

 


# AI 응답 생성
def generate_ai_response(training_data: str, booking_data: str, last_10_messages: str, user_prompt: str, user_id: str):
    
        
    # OpenAI API를 통해 사용자 질문에 대한 답변 생성
    prompt = f"""
    다음은 트레이닝 데이터입니다: {training_data}
    오늘의 예약 정보는 다음과 같습니다: {booking_data}
    최근 10개의 대화: {last_10_messages}
    사용자 질문: {user_prompt}
    
    """
    
    # OpenAI 응답 생성 (기존 방식)
    response = openai.chat.completions.create(
        model="gpt-4o-mini",  # GPT 모델 (필요에 따라 변경)
        messages=[
            {"role": "system", "content": "너는 병원 상담 AI입니다. 고객이 예약을 원할 경우 필요한 정보를 묻고 예약을 확정합니다."},
            {"role": "user", "content": prompt}
        ]
    )

    # OpenAI 응답과 맞춤형 응답을 결합하여 최종 AI 응답 생성
    return response.choices[0].message.content


# def confirm_booking(chatbot_id: str, user_id: str, customer_name: str, customer_contact: str, booking_date: str, booking_time: str, procedure_info: str):
#     # 예약 확정 메시지 생성
#     confirmation_message = f"""감사합니다, {customer_name}님!  

# 예약 정보를 확정하겠습니다.  

# - **성함**: {customer_name}  
# - **연락처**: {customer_contact}  
# - **원하시는 시간대**: {booking_time}  
# - **원하시는 시술**: {procedure_info}  

# 예약이 완료되었습니다. 오늘 {booking_time}에 {procedure_info} 시술로 예약되어 있습니다. 병원에 방문 시 안내받으실 수 있습니다.  

# 혹시 다른 문의사항이 있으시면 언제든지 말씀해 주세요!"""

#     # 고객 정보 저장 (Firestore)
    
#     # Firestore에 예약 정보 저장 (예약 확정)
#     conversation_ref = db.collection("conversations").document(f"{chatbot_id}_{user_id}")
#     conversation_doc = conversation_ref.get()

#     if conversation_doc.exists:
#         # 대화 문서에서 메시지 목록 가져오기
#         conversation_data = conversation_doc.to_dict()
#         messages = conversation_data.get("messages", [])

#         # 예약 확정 메시지 저장
#         new_message = {
#             "message": confirmation_message,
#             "sender_type": "system",  # 시스템에서 보내는 메시지
#             "timestamp": datetime.utcnow(),
#             "name": "시스템",
#         }

#         # 메시지 목록에 새 확정 메시지 추가
#         messages.append(new_message)

#         # 대화 문서 업데이트
#         conversation_ref.update({
#             "messages": messages,  # 새로운 메시지 목록 업데이트
#             "lastMessage": new_message,  # 마지막 메시지 업데이트
#         })
        
#         # 예약 확정 상태 업데이트 (is_confirmed = True)
#         conversation_ref.update({
#             "is_confirmed": True,  # 예약 확정 상태 업데이트
#         })

#     return confirmation_message

# FastAPI 요청 모델
class KakaoAIRequest(BaseModel):
    userRequest: Dict[str, Any]



# 카카오 웹훅 처리 함수
@app.post("/kakao-webhook", tags=["kakao"])
async def handle_kakao_callback(kakao_ai_request: KakaoAIRequest, background_tasks: BackgroundTasks):
    user_id = kakao_ai_request.userRequest['user']['id']
    chatbot_id = "3521caa9-cf1f-4743-861e-7889f7043a77"
    user_prompt = kakao_ai_request.userRequest['utterance']

    

    save_conversation(chatbot_id, user_id, "USER", user_prompt, is_confirmed=False)

    # 백그라운드에서 AI 응답 생성
    background_tasks.add_task(
        process_user_input,
        chatbot_id, user_id, user_prompt,
        callback_url=kakao_ai_request.userRequest['callbackUrl'], 
    )

    # 즉시 기본 응답 반환 (타임아웃 방지)
    return {
        "version": "2.0",
        "template": {"outputs": [{"simpleText": {"text": "처리 중입니다. 잠시만 기다려 주세요."}}]},
        "useCallback": True
    }
    
    

# 비동기 함수 수정
async def process_user_input(chatbot_id: str, user_id: str, user_prompt: str, callback_url: str):
    try:
        # 예약 정보 가져오기 (비동기 처리)
        booking_data = get_booking_data_by_date()

        # 최근 10개 메시지 가져오기
        last_10_messages = get_last_10_messages(chatbot_id, user_id)

        # 트레이닝 데이터 가져오기
        training_data = get_training_data(chatbot_id)  # 비동기 데이터 가져오기

        # AI 응답 생성
        ai_response = generate_ai_response(training_data, booking_data, last_10_messages, user_prompt, user_id)

        # AI 응답을 대화에 저장
        save_conversation(chatbot_id, user_id, "AI", ai_response, is_confirmed=False)
      
        # AI 응답을 카카오로 전달
        request_body = {
            "version": "2.0",
            "template": {
                "outputs": [
                    {"simpleText": {"text": ai_response}}
                ]
            }
        }
        response = requests.post(callback_url, json=request_body)

        if response.status_code == 200:
            logger.info(f"AI response successfully sent to Kakao.")
        else:
            logger.error(f"Failed to send AI response to Kakao: {response.status_code} - {response.text}")

    except Exception as e:
        logger.error(f"Error processing user input: {str(e)}")
        
        # 에러 발생 시 카카오에 오류 메시지 전송
        error_body = {
            "version": "2.0",
            "template": {
                "outputs": [
                    {"simpleText": {"text": "요청 처리 중 문제가 발생했습니다. 다시 시도해주세요."}}
                ]
            }
        }
        
        # 에러 메시지를 카카오에 전송
        response = requests.post(callback_url, json=error_body)
        
        if response.status_code != 200:
            logger.error(f"Failed to send error response to Kakao: {response.status_code} - {response.text}")
            
            
            
def save_conversation(chatbot_id: str, user_id: str, sender_type: str, message: str, is_confirmed: bool = False, is_completed: bool = False, name: str = ''):
    
    
    # 예약 확정 키워드가 포함된 경우 is_confirmed를 True로 설정
    if any(re.search(keyword, message) for keyword in ["예약이 확정", "예약을 확정", "예약이 완료", "예약을 완료","### 예약 정보:"]):
        is_confirmed = True

    # 대화 문서 참조 가져오기
    conversation_ref = db.collection("conversations").document(f"{chatbot_id}_{user_id}")
    conversation_doc = conversation_ref.get()

    if conversation_doc.exists:
        # 기존 메시지 목록 가져오기
        messages = conversation_doc.to_dict().get("messages", [])
        
        # 중복 메시지 확인: 마지막 메시지가 같은지 비교
        if messages and messages[-1]["message"] == message:
            return  # 중복 메시지 저장 방지
    else:
        messages = []

    # 새로운 메시지 추가
    new_message = {
        "name": name,
        "sender_type": sender_type,
        "message": message,
        "timestamp": datetime.utcnow(),
        "userId": user_id,  # userId 추가
    }

    # 메시지 목록에 새로운 메시지 추가
    messages.append(new_message)

    # 새로운 lastMessage 정보 정의 (마지막 메시지)
    new_last_message = {
        "message": message,
        "sender_type": sender_type,
        "timestamp": new_message["timestamp"],
        "name": name,
    }
    
    # 예약이 확정되었으면 고객 이름과 연락처 추출해서 추가
    if is_confirmed:
        # 고객 이름 추출 (예시: "고객 이름: 윤찬영")
        def extract_name_from_message(message):
            lines = message.split('\n')
            for line in lines:
                if '고객 이름' in line or '이름' in line:
                    parts = line.split(':')  # ':' 기준으로 나누기
                    if len(parts) > 1:
                        name = parts[1].strip()  # 이름 부분에서 불필요한 공백 제거
                        if name.endswith('님'):  # 이름 뒤에 '님'이 있을 경우 제거
                            name = name[:-1]
                        return name
            return None  # 이름을 찾을 수 없으면 None 반환
        
        # 연락처 추출 (예시: "연락처: 010-1234-5678")
        def extract_phone_from_message(message):
            phone_pattern = r'010-\d{4}-\d{4}'  # 010-xxxx-xxxx 형태의 연락처를 찾는 패턴
            match = re.search(phone_pattern, message)
            if match:
                return match.group(0)  # 첫 번째 매칭된 연락처 반환
            return None  # 연락처를 찾을 수 없으면 None 반환
        
        extracted_name = extract_name_from_message(message)
        extracted_phone = extract_phone_from_message(message)
        
        if extracted_name:
            print(f"Debug: Extracted name: {extracted_name}")  # 디버깅 로그 추가
        else:
            print("Debug: No name found in the message.")  # 디버깅 로그 추가
        
        if extracted_phone:
            print(f"Debug: Extracted phone: {extracted_phone}")  # 디버깅 로그 추가
        else:
            print("Debug: No phone found in the message.")  # 디버깅 로그 추가
        
        # 고객 이름과 연락처를 conversations 문서에 추가
        update_data = {}
        if extracted_name:
            update_data["client_name"] = extracted_name
        if extracted_phone:
            update_data["client_phone"] = extracted_phone
        
        if update_data:
            conversation_ref.set(update_data, merge=True)  # Firestore 문서 업데이트 (병합 방식)

    # 문서 업데이트
    conversation_ref.set({
        "messages": messages,  # 대화 내용 업데이트
        "userId": user_id,
        "lastMessage": new_last_message,  # 마지막 메시지 업데이트
        "is_confirmed": is_confirmed,  # 예약 확정 여부 업데이트
        "chart_number":"",
        "chatbotId":chatbot_id
       
    },merge=True)

    # 새로 추가된 메시지의 경로 반환
    return f"conversations/{chatbot_id}_{user_id}/messages/{len(messages) - 1}"



# # 알림 생성 함수
# def create_notification(user_id: str, message: str, sender_type: str, name: str = None, contact: str = None):
#     # 현재 시간 (UTC)
#     timestamp = datetime.utcnow()

#     # 새로운 알림 데이터
#     notification_data = {
#         "message": message,
#         "senderType": sender_type,
#         "is_confirmed": False,  # 초기에는 미확정
#         "is_completed": False,  # 초기에는 미완료
#         "timestamp": timestamp,  # 직접 타임스탬프 사용
#         "name": name,
#         "contact": contact,
#         "conversation_ref": None  # 대화 참조는 나중에 설정
#     }

#     # 해당 사용자에 대한 알림 추가
#     user_notifications_ref = db.collection("notifications").document(user_id)
#     user_notifications_doc = user_notifications_ref.get()

#     if user_notifications_doc.exists:
#         # 기존 알림에 새 알림 추가
#         user_notifications_ref.update({
#             "notifications": firestore.ArrayUnion([notification_data])
#         })
#     else:
#         # 새로운 사용자 알림 데이터 생성
#         user_notifications_ref.set({
#             "userId": user_id,
#             "notifications": [notification_data]
#         })


# # 알림 상태 업데이트 함수
# def update_notification(user_id: str, notification_index: int, is_confirmed: bool, is_completed: bool):
#     user_notifications_ref = db.collection("notifications").document(user_id)
#     user_notifications_doc = user_notifications_ref.get()

#     if not user_notifications_doc.exists:
#         raise HTTPException(status_code=404, detail="User notifications not found")

#     notifications = user_notifications_doc.to_dict().get("notifications", [])
    
#     if notification_index >= len(notifications):
#         raise HTTPException(status_code=400, detail="Invalid notification index")

#     # 알림 업데이트
#     notification = notifications[notification_index]
#     notification["is_confirmed"] = is_confirmed
#     notification["is_completed"] = is_completed

#     # 업데이트된 알림 데이터 저장
#     user_notifications_ref.update({
#         f"notifications.{notification_index}": notification
#     })




# # 알림 상태를 확인하고, 24시간 이상 지난 알림을 미확정 처리하는 함수
# # 알림 상태를 확인하고, 24시간 이상 지난 알림을 미확정 처리하는 함수
# def check_and_update_notifications():
#     now = datetime.utcnow()
#     notifications_ref = db.collection("notifications")

#     # 모든 사용자 알림 데이터 조회
#     users = notifications_ref.stream()

#     for user in users:
#         notifications = user.to_dict().get("notifications", [])

#         for index, notif in enumerate(notifications):
#             notification_time = notif.get("timestamp")
            
#             if notification_time:
#                 notification_timestamp = notification_time.get("seconds")
#                 if notification_timestamp:
#                     notif_time = datetime.utcfromtimestamp(notification_timestamp)
#                     time_difference = (now - notif_time).total_seconds() / (60 * 60)  # 시간 차이 계산

#                     if time_difference > 24 and not notif.get("is_confirmed"):
#                         # 24시간 이상 경과한 알림은 미확정 상태로 처리
#                         notifications_ref.document(user.id).update({
#                             f"notifications.{index}.is_confirmed": False
#                         })


# @app.post("/create-notification/{user_id}")
# async def create_new_notification(user_id: str, message: str, sender_type: str, name: str = None, contact: str = None):
#     # 알림 생성
#     create_notification(user_id, message, sender_type, name, contact)
#     return {"message": "Notification created successfully"}

# @app.post("/update-notification/{user_id}/{notification_index}")
# async def update_notification_status(user_id: str, notification_index: int, is_confirmed: bool, is_completed: bool):
#     # 알림 상태 업데이트
#     update_notification(user_id, notification_index, is_confirmed, is_completed)
#     return {"message": "Notification updated successfully"}

# @app.get("/check-notifications")
# async def check_notifications():
#     # 알림 상태를 확인하고 24시간 이상 경과된 알림을 미확정 상태로 처리
#     check_and_update_notifications()
#     return {"message": "Notifications checked and updated successfully"}
