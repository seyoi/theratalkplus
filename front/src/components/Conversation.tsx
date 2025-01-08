import React, { useEffect, useState } from "react";
import axios from "axios";
import { getFirestore, collection, onSnapshot, orderBy, query, addDoc, serverTimestamp } from "firebase/firestore";

// Firestore 초기화
const db = getFirestore();

interface Message {
  message: string;
  timestamp: any;  // Firestore timestamp
  user_key: string;
  sender: "user" | "agent";  // user 또는 agent
}

interface ChatProps {
  userKey: string;  // 메시지를 주고받을 상대방의 user_key
}

const Chat: React.FC<ChatProps> = ({ userKey }) => {
  const [messages, setMessages] = useState<Message[]>([]);  // 대화 메시지 상태 관리
  const [newMessage, setNewMessage] = useState<string>("");  // 새 메시지 입력 필드 상태 관리
  const [loading, setLoading] = useState<boolean>(false);  // 메시지 전송 중 로딩 상태
  const [error, setError] = useState<string | null>(null);  // 에러 메시지 상태

  // Firestore 실시간 메시지 수신 (onSnapshot 사용)
  useEffect(() => {
    const messagesRef = collection(db, "messages", userKey, "user_messages");
    const q = query(messagesRef, orderBy("timestamp"));  // 타임스탬프 순으로 정렬

    // 실시간 메시지 업데이트 리스너
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loadedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          message: data.message,
          timestamp: data.timestamp,
          user_key: data.user_key,
          sender: data.sender,
        });
      });
      setMessages(loadedMessages);  // 메시지 상태 업데이트
    });

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [userKey]);

  // 메시지 전송 함수
  const sendMessage = async () => {
    if (newMessage.trim() === "") return;  // 빈 메시지는 보내지 않음

    setLoading(true);  // 로딩 시작
    setError(null);  // 기존 에러 메시지 초기화

    try {
      // 메시지를 API로 전송
      const response = await axios.post('https://theratalkplus.com/admin/api/v1/receive/message', {
        user_key: userKey,
        message: newMessage,
        sender: "agent",  // 상담원
      });

      console.log(response.data);  // API 응답 확인
      setNewMessage("");  // 메시지 입력 필드 초기화

      // Firestore에 메시지 저장
      const messagesRef = collection(db, "messages", userKey, "user_messages");
      await addDoc(messagesRef, {
        message: newMessage,
        timestamp: serverTimestamp(),  // Firestore 서버 시간 사용
        user_key: userKey,
        sender: "agent",  // 상담원
      });
    } catch (error) {
      console.error("Error sending message: ", error);
      setError("메시지 전송에 실패했습니다. 다시 시도해주세요.");  // 에러 메시지 설정
    } finally {
      setLoading(false);  // 로딩 종료
    }
  };

  return (
    <div className="chat-container p-4 bg-gray-100 h-screen flex flex-col">
      {/* 메시지 표시 영역 */}
      <div className="messages flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"} p-3 rounded-lg max-w-[70%] self-${msg.sender === "user" ? "start" : "end"}`}
          >
            <p>{msg.message}</p>
            <span className="text-xs text-gray-500">{new Date(msg.timestamp.seconds * 1000).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* 메시지 입력 영역 */}
      <div className="message-input flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="상담원이 메시지를 입력하세요..."
          className="p-2 w-full rounded-lg border-2 border-gray-300"
        />
        <button
          onClick={sendMessage}
          className="p-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400"
          disabled={newMessage.trim() === "" || loading}
        >
          {loading ? "전송 중..." : "전송"}
        </button>
      </div>

      {/* 에러 메시지 표시 */}
      {error && <div className="text-red-500 text-center mt-2">{error}</div>}
    </div>
  );
};

export default Chat;
