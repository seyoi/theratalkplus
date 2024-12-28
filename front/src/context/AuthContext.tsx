import React, { createContext, useState, useEffect, useContext } from "react";
import { onAuthStateChangedListener, getIdToken, logOut, User } from "@/app/firebase";

// 사용자 인증 상태를 관리할 Context 타입 정의
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 컴포넌트: 인증 상태를 전역에서 관리
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // 로그인 상태 변경을 감지하는 onAuthStateChanged를 사용
  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLoggedIn(true);
        getIdToken(firebaseUser)
          .then(setToken)
          .catch((error) => {
            console.error("Error fetching token:", error);
            setToken(null); // Handle error and set token to null
          });
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setToken(null);
      }
    });

    // Cleanup: The Firebase listener is automatically cleaned up when the component is unmounted
    return () => unsubscribe();
  }, []);

  // 로그아웃 기능 제공
  const handleLogout = async () => {
    await logOut();
    setUser(null);
    setToken(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 인증 상태를 가져오는 Custom Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
