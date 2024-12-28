'use client'
import React from "react";
import { AuthProvider, useAuth } from "../context/AuthContext"; // Import AuthProvider and useAuth
import Header from "@/components/Header";
import "./globals.css"; // Global styles

export default function RootLayout({
  children,  // This is where nested page content will go
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}

// Layout component should accept `children` as a prop
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the useAuth hook inside the AuthProvider context
  const { isLoggedIn, user, token, logout } = useAuth();

  return (
    <div className="layout">
      <Header 
        isLoggedIn={isLoggedIn} 
        email={user?.email || null}  // 이메일은 user 객체에서 가져오기
        userToken={token}           // 토큰을 그대로 전달
        onLogOut={logout}           // 로그아웃 함수 전달
      />
      <main>{children}</main>
    </div>
  );
}
