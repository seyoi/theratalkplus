import React, { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";

// Firestore 초기화
const db = getFirestore();

interface NotificationCardProps {
  openChat: (userKey: string) => void;  // 부모 컴포넌트로 유저키 전달하는 함수
}

const NotificationCard: React.FC<NotificationCardProps> = ({ openChat }) => {
  const [agentModeUsers, setAgentModeUsers] = useState<string[]>([]); // 여러 유저키 상태 관리

  // Firestore 실시간 데이터 리스닝
  useEffect(() => {
    // 'kakao-chat' 컬렉션에서 agent_mode가 True인 모든 유저 쿼리
    const referenceRef = query(collection(db, "kakao-chat"), where("agent_mode", "==", true));

    // 실시간 스냅샷 리스너
    const unsubscribe = onSnapshot(referenceRef, (querySnapshot) => {
      const usersWithAgentMode: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.user_key) {
          usersWithAgentMode.push(data.user_key); // agent_mode가 True인 유저의 user_key를 저장
        }
      });
      
      // 상태 업데이트
      setAgentModeUsers(usersWithAgentMode);
    });

    // 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, []);

  // 알림을 닫는 함수
  const closeNotification = (userKey: string) => {
    setAgentModeUsers((prev) => prev.filter((key) => key !== userKey)); // 특정 유저키의 알림 제거
  };

  return (
    <div className="fixed bottom-5 left-5 w-64 space-y-3 z-50 animate__animated animate__fadeIn overflow-y-auto max-h-[80vh]">
      {/* 유저별 상담원 연결 알림 카드 */}
      {agentModeUsers.map((userKey, index) => (
        <div key={index} className="bg-gray-800 text-white rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">유저 {userKey} 상담원 연결됨</h3>
            <button
              onClick={() => closeNotification(userKey)}
              className="text-lg font-bold text-red-500"
            >
              X
            </button>
          </div>
          <p>상담원이 연결되었습니다. 채팅을 시작할 수 있습니다.</p>
          <button
            onClick={() => openChat(userKey)}  // 클릭 시 대화창 열기
            className="mt-2 p-2 bg-blue-500 text-white rounded-lg"
          >
            대화 시작
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationCard;
