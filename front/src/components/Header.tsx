import React, { useState } from "react";
import { Button } from "@/components/ui/button"; // Import Button from ShadCN UI
import Link from "next/link";
// import { User } from "lucide-react"; // lucide-react에서 알림 및 프로필 아이콘을 임포트
import { useAuth } from "@/context/AuthContext";
import { User } from "lucide-react"; // Assuming you're using lucide-react for the user icon


interface HeaderProps {
  isLoggedIn: boolean;
  email: string | null;
  userToken: string | null; // userToken 추가
  onLogOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, email, userToken, onLogOut }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  
  
  const user = useAuth();
  console.log(user)

  const toggleDropdown = () => {
    setDropdownOpen((prevState) => !prevState);
  };

  return (
    <header className="bg-gray-100 text-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* 로고 및 환영 메시지 */}
        <div className="flex items-center space-x-4">
          <img src="logo.svg" alt="TheraTalk Logo" className="h-3" />
          {isLoggedIn && <p className="text-sm font-semibold">환영합니다, {email}</p>}
        </div>

        {/* 버튼 및 프로필 아이콘 */}
        <div className="flex items-center space-x-6">
          {/* 알림 컴포넌트 */}
          {/* {isLoggedIn && userToken && (
            <Notifications agentId={user.uid} />
          )} */}

          {/* 프로필 아이콘 및 드롭다운 메뉴 */}
          {isLoggedIn && (
            <div className="relative">
              <button onClick={toggleDropdown} className="flex items-center space-x-2">
                <User className="text-2xl" />
                {/* <span className="text-sm font-semibold">{email}</span> */}
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 p-2 bg-white shadow-lg rounded-lg">
                  <ul>
                    <li>
                      <Link href="/profile">
                        프로필
                      </Link>
                    </li>
                    <li>
                      <Button
                        onClick={onLogOut}
                        className="w-full text-sm text-red-500 py-1 hover:bg-gray-100"
                      >
                        로그아웃
                      </Button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 로그인/회원가입 버튼 */}
          {!isLoggedIn && (
            <div className="flex space-x-4">
              <Link href="/login" passHref>
                <Button className="bg-lime-400 hover:bg-lime-500 text-white px-4 py-2 rounded">
                  로그인
                </Button>
              </Link>
              <Link href="/signup" passHref>
                <Button className="bg-lime-400 hover:bg-lime-500 text-white px-4 py-2 rounded">
                  회원가입
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
