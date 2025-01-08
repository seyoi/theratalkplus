import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, where, onSnapshot, doc, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import axios from 'axios';

// Firestore 초기화
const db = getFirestore();

const HomePage: React.FC = () => {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [messageInput, setMessageInput] = useState("");  // 메시지 입력 상태 추가

  // 알림 권한 확인 및 요청 (브라우저 권한)
  const checkNotificationPermission = async () => {
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("알림 권한이 필요합니다.");
      }
    }
  };

  useEffect(() => {
    checkNotificationPermission();  // 컴포넌트 로드 시 알림 권한 요청
  }, []);

  // Firestore에서 실시간 알림 수신
  useEffect(() => {
    const q = query(
      collection(db, "kakao-chat"),
      where("agentMode", "==", true) // 'agentMode'가 true인 문서만 필터링
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: any[] = [];
      snapshot.forEach((doc) => {
        newNotifications.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(newNotifications); // 새 알림 목록을 상태에 업데이트
      triggerDesktopNotification("새 상담 요청", "상담원이 연결을 요청했습니다.");
    });

    return () => unsubscribe(); // 리스너 해제
  }, []);

  // 데스크탑 알림 보내기
  const triggerDesktopNotification = (title: string, message: string) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "https://example.com/icon.png", // 알림 아이콘 (필요에 따라 추가)
      });
    }
  };

  // 알림 카드 클릭 시 대화 화면으로 이동
  const handleNotificationClick = (userKey: string) => {
    setUserKey(userKey);
    setShowChat(true);

    // 고객 데이터 가져오기
    const customerDoc = doc(db, "kakao-chat", userKey);
    const unsubscribeCustomer = onSnapshot(customerDoc, (doc) => {
      setCustomerData(doc.data());
    });

    return () => unsubscribeCustomer(); // 리스너 해제
  };

  // 선택된 userKey에 대한 메시지 실시간 수신
  useEffect(() => {
    if (userKey) {
      const q = query(
        collection(db, "kakao-chat", userKey, "messages"),
        orderBy("timestamp") // 메시지를 시간 순으로 정렬
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages: any[] = [];
        snapshot.forEach((doc) => {
          newMessages.push(doc.data());
        });
        setMessages(newMessages); // 메시지 목록을 상태에 업데이트
      });

      return () => unsubscribe(); // 리스너 해제
    }
  }, [userKey]);

  // 메시지 입력 변경 처리 함수
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value); // 입력된 메시지 상태 업데이트
  };

  // 메시지 전송 처리 함수
  const handleSendMessage = async () => {
    if (!messageInput.trim()) {
      alert("메시지를 입력해주세요.");
      return;
    }

    if (userKey) {
      try {
        // Firestore에 메시지 추가
        await addDoc(collection(db, "kakao-chat", userKey, "messages"), {
          message: messageInput,
          timestamp: serverTimestamp(),
          sender: "agent", // 상담원이 보낸 메시지
        });

        // FastAPI 엔드포인트로 메시지 전송
        await sendMessageToAPI(userKey, messageInput);

        // 메시지 전송 후 입력창 초기화
        setMessageInput("");
      } catch (error) {
        console.error("메시지 전송 오류:", error);
        alert("메시지 전송에 실패했습니다.");
      }
    }
  };

  // FastAPI로 메시지 전송
  const sendMessageToAPI = async (userKey: string, message: string) => {
    try {
      // 메시지 전송을 위한 payload 준비 (event_key 추가)
      const payload = {
        user_key: userKey,
        event_key: "your_event_key_here",  // 이벤트 키를 여기에 넣으세요.
        message: message,  // 메시지는 단순히 텍스트
      };

      // FastAPI로 메시지 전송
      const response = await axios.post("https://theratalkplus.com/admin/api/v1/send/message", payload);
      
      if (response.data.status === "success") {
        console.log("메시지가 성공적으로 송신되었습니다.");
      } else {
        console.error("메시지 송신 실패:", response.data.message);
      }
    } catch (error) {
      console.error("API 호출 오류:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex gap-6">
      {/* 좌측 컬럼 - 알림 카드 */}
      <div className="flex flex-col w-1/4 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">알림</h2>
        {notifications.length === 0 ? (
          <p>새로운 상담 요청이 없습니다.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex p-4 border rounded-lg shadow-md bg-white cursor-pointer hover:bg-gray-100 mb-2"
              onClick={() => handleNotificationClick(notification.id)} // 알림 클릭 시 userKey 설정
            >
              <div className="flex-1">
                <h3 className="font-semibold text-lg">상담원 연결 요청</h3>
                <p className="text-gray-600">{notification.message || "새 상담원 연결 요청!"}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 중간 컬럼 - 대화창 */}
      <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
        {showChat ? (
          <div>
            <h1 className="text-xl font-semibold mb-4">대화 내용</h1>
            <div className="bg-gray-100 p-4 rounded-lg shadow-md max-h-80 overflow-y-scroll">
              {messages.length === 0 ? (
                <p>메시지가 없습니다.</p>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="p-2 border-b">
                    {message.message}
                  </div>
                ))
              )}
            </div>

            {/* 메시지 입력 창과 전송 버튼 */}
            <div className="flex mt-4">
              <input
                type="text"
                className="flex-1 p-2 border rounded-l-lg"
                value={messageInput}
                onChange={handleInputChange}
                placeholder="메시지를 입력하세요"
              />
              <button
                className="p-2 bg-blue-500 text-white rounded-r-lg ml-2"
                onClick={handleSendMessage}
              >
                전송
              </button>
            </div>
          </div>
        ) : (
          <p>상담원과의 대화가 없습니다.</p>
        )}
      </div>

      {/* 우측 컬럼 - 고객 데이터 */}
      <div className="w-1/4 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">고객 정보</h2>
        {customerData ? (
          <div>
            <p><strong>이름:</strong> {customerData.name}</p>
            <p><strong>이메일:</strong> {customerData.email}</p>
            <p><strong>상담 요청일:</strong> {customerData.createdAt ? new Date(customerData.createdAt.seconds * 1000).toLocaleString() : "정보 없음"}</p>
          </div>
        ) : (
          <p>고객 정보를 불러오는 중입니다...</p>
        )}
      </div>
    </div>
  );
};

export default HomePage;
