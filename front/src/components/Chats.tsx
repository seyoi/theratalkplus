import React, { useState, useEffect, useRef } from "react";
import { db } from "@/app/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { FaSearch } from "react-icons/fa";

interface Chat {
  message: string;
  senderType: string;
  is_completed: boolean;
  timestamp: any;
  name: string;
}

interface UserConversation {
  userId: string;
  conversations: Chat[];
  is_confirmed: boolean;
  client_name: string | null;
  client_phone: string | null;
  chart_number: string | null;
  chatbotId: string;
  showEdit?: boolean;
}

const Chats = () => {
  const [userConversations, setUserConversations] = useState<UserConversation[]>([]);
  const [expandedConversation, setExpandedConversation] = useState<UserConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState<string>(""); // 검색어 상태
  const [filteredCards, setFilteredCards] = useState<UserConversation[]>([]); // 필터링된 카드 목록
  const [filteredMessages, setFilteredMessages] = useState<Chat[]>([]); // 필터링된 대화 목록
  const [showDropdown, setShowDropdown] = useState<boolean>(false); // 드롭다운 표시 여부
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null); // 강조할 메시지의 인덱스
  const [scrollToSearchMessage, setScrollToSearchMessage] = useState<boolean>(false); // 검색된 메시지로 스크롤할지 여부
  const scrollRef = useRef<HTMLDivElement | null>(null); // 대화창 끝 부분에 대한 ref
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map()); // 각 메시지에 대한 ref 저장

  // 검색어에 따른 필터링
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCards(userConversations);
      setFilteredMessages([]);
      setShowDropdown(false);
      return;
    }

    const filteredCards = userConversations.filter((user) => {
      const lowerCaseQuery = searchQuery.toLowerCase();
      return (
        (user.client_name && user.client_name.toLowerCase().includes(lowerCaseQuery)) ||
        (user.client_phone && user.client_phone.toLowerCase().includes(lowerCaseQuery)) ||
        (user.chart_number && user.chart_number.toLowerCase().includes(lowerCaseQuery))
      );
    });

    // 각 사용자에 대해 마지막 대화 메시지를 필터링
    const filteredMessages = userConversations.flatMap((user) =>
      user.conversations.filter((message) => message.message.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setFilteredCards(filteredCards);
    setFilteredMessages(filteredMessages);
    setShowDropdown(true); // 드롭다운 표시
  }, [searchQuery, userConversations]);

  // Firestore에서 데이터 불러오기
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "conversations"), (querySnapshot) => {
      const conversationsMap: { [key: string]: UserConversation } = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.messages && data.userId !== undefined && data.is_confirmed !== undefined) {
          conversationsMap[data.userId] = {
            userId: data.userId,
            conversations: data.messages.map((message: any) => ({
              message: message.message,
              senderType: message.sender_type,
              is_completed: message.is_completed || false,
              timestamp: message.timestamp,
              name: message.name,
            })),
            is_confirmed: data.is_confirmed || false,
            client_name: data.client_name || null,
            client_phone: data.client_phone || null,
            chart_number: data.chart_number || null,
            chatbotId: data.chatbotId || "",
          };
        }
      });

      const groupedConversations = Object.keys(conversationsMap).map((userId) => ({
        ...conversationsMap[userId],
      }));

      const sortedConversations = groupedConversations.sort((a, b) => {
        const aLastMessageTimestamp = a.conversations[a.conversations.length - 1]?.timestamp?.seconds;
        const bLastMessageTimestamp = b.conversations[b.conversations.length - 1]?.timestamp?.seconds;
        return (bLastMessageTimestamp || 0) - (aLastMessageTimestamp || 0);
      });

      setUserConversations(sortedConversations);
      setIsLoading(false);

      if (sortedConversations.length > 0) {
        setExpandedConversation(sortedConversations[0]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCardClick = (user: UserConversation) => {
    setExpandedConversation(user);
    setSearchQuery(""); // 대화창 클릭 시 검색어 초기화
    setShowDropdown(false); // 대화창 클릭 시 드롭다운 숨기기
    setScrollToSearchMessage(false); // 검색된 메시지로 스크롤 하지 않도록 설정
  };

  const handleDropdownItemClick = (user: UserConversation, isMessage: boolean, messageIndex?: number) => {
    if (isMessage && messageIndex !== undefined) {
      // 대화 내용 클릭
      const selectedMessage = user.conversations[messageIndex];
      setExpandedConversation({
        ...user,
        conversations: user.conversations, // 전체 대화로 설정
      });
      setScrollToSearchMessage(true); // 검색된 메시지로 스크롤

      // 해당 메시지로 스크롤
      const ref = messageRefs.current.get(messageIndex);
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      // 카드 클릭
      handleCardClick(user);
    }

    setSearchQuery(""); // 검색어 초기화
    setShowDropdown(false); // 드롭다운 숨기기
  };

  // 검색된 메시지 강조
  const getMessageClassName = (index: number) => {
    return index === highlightedMessageIndex ? "bg-yellow-200" : ""; // 강조 색상 추가
  };

  // 대화창에서 메시지들 렌더링
  const scrollToLatestMessage = () => {
    if (scrollToSearchMessage) return; // 검색된 메시지로 이미 스크롤을 했으면, 최신 메시지로 이동하지 않음.

    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // 대화창 열 때 최신 메시지로 스크롤
  useEffect(() => {
    if (expandedConversation) {
      scrollToLatestMessage();
    }
  }, [expandedConversation]);

  return (
    <>
      {/* 서치바 */}
      <div className="p-6 w-full flex items-center space-x-4 mb-4">
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="고객 이름, 연락처, 차트 번호로 검색"
          className="p-2 w-full border border-gray-300 rounded-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 검색 결과 드롭다운 */}
      {showDropdown && (
        <div className="absolute bg-white shadow-md max-h-60 overflow-y-auto w-full mt-2 rounded-md z-10">
          {/* 카드 항목 */}
          {filteredCards.length > 0 && (
            <div className="border-b">
              <p className="font-semibold p-2">고객 카드</p>
              {filteredCards.map((user) => (
                <div
                  key={user.userId}
                  className="p-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleDropdownItemClick(user, false)}
                >
                  <p>{user.client_name || "없음"} - {user.client_phone || "없음"}</p>
                </div>
              ))}
            </div>
          )}

          {/* 대화 내용 항목 */}
          {filteredMessages.length > 0 && (
            <div>
              <p className="font-semibold p-2">대화 내용</p>
              {filteredMessages.map((message, index) => {
                const user = userConversations.find((user) =>
                  user.conversations.some((msg) => msg === message)
                );
                return (
                  user && (
                    <div
                      key={index}
                      className="p-2 cursor-pointer hover:bg-gray-200"
                      onClick={() =>
                        handleDropdownItemClick(user, true, user.conversations.findIndex((msg) => msg === message))
                      }
                    >
                      <p>{message.message}</p>
                    </div>
                  )
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex relative">
        {/* 왼쪽 대화 목록 */}
        <div className="p-6 w-1/3 space-y-4">
          {userConversations.map((user) => {
            const lastMessage = user.conversations[user.conversations.length - 1];
            return (
              <div
                key={user.userId}
                className="w-full p-4 rounded-md shadow-md cursor-pointer"
                onClick={() => handleCardClick(user)}
              >
                <h2 className="text-lg font-semibold">{`고객 이름: ${user.client_name || "없음"}`}</h2>
                <p>{`연락처: ${user.client_phone || "없음"}`}</p>
                <p>{`차트 번호: ${user.chart_number || "없음"}`}</p>

                {lastMessage && (
                  <p className="text-sm mt-2 text-gray-600">{lastMessage.message}</p>
                )}

                <div
                  className={`mt-2 text-sm ${
                    user.is_confirmed ? "text-green-500" : "text-yellow-500"
                  }`}
                >
                  {user.is_confirmed ? "확정됨" : "미확정"}
                </div>

                {lastMessage?.timestamp && (
                  <p className="text-xs mt-1 text-gray-500">
                    {new Date(lastMessage.timestamp.seconds * 1000).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* 슬라이드 대화창 */}
        {expandedConversation && (
          <div className="transition-all transform ease-in-out duration-300 w-2/3 p-6 bg-white shadow-lg rounded-md overflow-y-auto absolute right-0 top-0 bottom-0 z-5">
            <div className="space-y-4 mt-6">
              {expandedConversation.conversations.map((notif, index) => {
                const isAI = notif.senderType === "AI";
                return (
                  <div
                    key={index}
                    className={`flex ${isAI ? "justify-start" : "justify-end"} ${getMessageClassName(index)}`}
                    ref={(el) => {
                      messageRefs.current.set(index, el as HTMLDivElement); // 각 메시지에 ref 설정
                    }}
                  >
                    <div className={`max-w-xs sm:max-w-md p-4 rounded-lg shadow-md ${isAI ? "bg-white-100" : "bg-gray-200"}`}>
                      <div className="flex items-center">
                        <span className={`font-bold text-sm ${isAI ? "text-blue-600" : "text-gray-800"}`}>
                          {isAI ? "AI" : notif.name || "고객"}
                        </span>
                      </div>
                      <p className="font-medium text-sm mt-2">{notif.message}</p>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-gray-400">
                          {notif.timestamp
                            ? new Date(notif.timestamp.seconds * 1000).toLocaleString()
                            : null}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef}></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Chats;
