import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

// Firestore 초기화
const db = getFirestore();

interface ChatScreenProps {
  userKey: string;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ userKey }) => {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'kakao-chat', userKey, 'messages'), // 특정 userKey에 대한 메시지 컬렉션
      orderBy('timestamp') // 메시지를 시간 순으로 정렬
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: any[] = [];
      snapshot.forEach((doc) => {
        newMessages.push(doc.data());
      });
      setMessages(newMessages); // 메시지 목록을 상태에 업데이트
    });

    return () => unsubscribe(); // 리스너 해제
  }, [userKey]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">대화 내용</h1>
      <div className="bg-gray-100 p-4 rounded-lg shadow-md max-h-80 overflow-y-scroll">
        {messages.map((message, index) => (
          <div key={index} className="p-2 border-b">
            {message.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatScreen;
