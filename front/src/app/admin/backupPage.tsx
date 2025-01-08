'use client';
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ChatbotList from "@/components/ChatbotList";
import DashboardPage from "@/components/Dashboard";
import { useAuth } from "@/context/AuthContext";
import Chats from "@/components/Chats";
import { Home, MessageCircle, Cpu } from "lucide-react"; // lucide-react 아이콘

const Admin = () => {
  const [view, setView] = useState<"chat" | "list" | "dashboard">("dashboard");
  const user = useAuth();

  return (
    <div className="flex h-[1100px]">
      {/* 사이드바 */}
      <div className="w-16 bg-gray-400 text-white p-4 flex flex-col items-center">
        {/* 사이드바 아이콘들 */}
        <Button
          variant="link"
          onClick={() => setView("dashboard")}
          className="mb-4 p-2"
        >
          <Home className="w-5 h-5" />
        </Button>
        <Button
          variant="link"
          onClick={() => setView("chat")}
          className="mb-4 p-2"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button
          variant="link"
          onClick={() => setView("list")}
          className="mb-4 p-2"
        >
          <Cpu className="w-5 h-5" />
        </Button>
      </div>

      {/* 본문 콘텐츠 */}
      <div className="flex-1 p-8">
        <div>
          {view === "dashboard" && <DashboardPage />} {/* 대시보드 렌더링 */}
          {view === "list" && <ChatbotList />}
          {view === "chat" && <Chats />} {/* 챗룸 탭에서 대화 세션 목록을 보여주는 컴포넌트 */}
        </div>
      </div>
    </div>
  );
};

export default Admin;
