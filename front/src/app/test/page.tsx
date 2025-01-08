"use client";

import React, { useEffect, useState } from "react";

const App: React.FC = () => {
  const [permission, setPermission] = useState<string>("default");

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") {
        alert("알림 권한이 필요합니다.");
      }
    }
  };

  // 알림 띄우기
  const triggerDesktopNotification = (title: string, message: string) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "https://example.com/icon.png",  // 알림 아이콘 URL (필요시 변경)
      });
    } else {
      alert("알림 권한이 없습니다. 권한을 허용해주세요.");
    }
  };

  useEffect(() => {
    // 클라이언트 사이드에서만 Notification API 사용
    if (typeof window !== "undefined" && Notification) {
      // 페이지가 로드될 때 알림 권한 상태를 확인
      if (Notification.permission === "default") {
        requestNotificationPermission();
      } else {
        setPermission(Notification.permission);
      }
    }
  }, []);

  return (
    <div className="App">
      <h1>데스크탑 알림 예시</h1>
      <p>알림 권한 상태: {permission}</p>
      <button
        onClick={() => triggerDesktopNotification("새 상담 요청", "상담원이 연결을 요청했습니다.")}
      >
        알림 보내기
      </button>
    </div>
  );
};

export default App;
