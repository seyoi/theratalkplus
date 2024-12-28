'use client';
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ChatbotList from "@/components/ChatbotList";
import DashboardPage from "@/components/Dashboard";
import { useAuth } from "@/context/AuthContext";
import Chats from "@/components/Chats";

const Admin = () => {
  const [view, setView] = useState<"chat" | "list" | "dashboard">("dashboard");
  // const [messages, setMessages] = useState<any[]>([]); // 실시간으로 쌓이는 메시지
  // const [notifications, setNotifications] = useState<any[]>([]); // 알림
  const user = useAuth();

  // useEffect(() => {
  //   const fetchMessages = () => {
  //     const q = query(collection(db, 'conversations'));
  //     const unsubscribe = onSnapshot(q, (querySnapshot) => {
  //       const messagesData: any[] = [];
  //       querySnapshot.forEach((doc) => {
  //         messagesData.push(doc.data());
  //       });
  //       setMessages(messagesData);
  //     });

  //     return () => unsubscribe();
  //   };

  //   fetchMessages();
  // }, []);

  // useEffect(() => {
  //   const fetchNotifications = () => {
  //     const q = query(collection(db, 'conversations'));
  //     const unsubscribe = onSnapshot(q, (querySnapshot) => {
  //       const notificationsData: any[] = [];
  //       querySnapshot.forEach((doc) => {
  //         notificationsData.push(doc.data());
  //       });
  //       setNotifications(notificationsData);
  //     });

  //     return () => unsubscribe();
  //   };

  //   fetchNotifications();
  // }, []);

  // const handleRespondToMessage = async (message: any) => {
  //   console.log('응답하기', message);
  // };

  // const handleMarkAsConfirmed = async (message: any) => {
  //   try {
  //     const conversationRef = doc(db, "conversations", message.conversationId);
  //     await updateDoc(conversationRef, { status: "confirmed" });
  //     console.log("Message status updated to 'confirmed'");
  //   } catch (error) {
  //     console.error("Error updating message status:", error);
  //   }
  // };

  // // Function for handling session selection (if needed)
  // const handleSelectSession = (session: any) => {
  //   console.log("Session selected:", session);
  // };

  return (
    <div className="p-8">
      <nav>
        <Button variant="outline" className="mr-4" onClick={() => setView("dashboard")}>
          예약 관리
        </Button>
        <Button variant="outline" className="mr-4" onClick={() => setView("chat")}>
          상담 관리
        </Button>
        {/* <Button variant="outline" className="mr-4" onClick={() => setView("list")}>
          AI 관리
        </Button> */}
      </nav>

      <div>
        {view === "dashboard" && <DashboardPage />} {/* 대시보드 렌더링 */}
        {view === "list" && <ChatbotList />}
        {view === "chat" && <Chats />} {/* 챗룸 탭에서 대화 세션 목록을 보여주는 컴포넌트 */}
      </div>
    </div>
  );
};

export default Admin;
