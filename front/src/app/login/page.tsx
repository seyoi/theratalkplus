'use client'
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { logIn } from "@/app/firebase"; // 로그인 함수 import
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  // 로그인 상태 변경 시 리다이렉트 처리
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/"); // 이미 로그인된 경우 홈 페이지로 리다이렉트
    }
  }, [isLoggedIn, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await logIn(email, password); // Firebase 로그인 호출
    } catch (err) {
      setError("로그인 실패: 이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">로그인</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              type="email"
              id="email"
              className="w-full mt-1 px-4 py-2 border rounded-md"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              className="w-full mt-1 px-4 py-2 border rounded-md"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="bg-lime-400 hover:bg-lime-500 text-white w-full py-2 rounded"
          >
            로그인
          </Button>
        </form>
        <p className="mt-4 text-sm text-center">
          아직 회원이 아니신가요?{" "}
          <a href="/signup" className="text-lime-500 hover:underline">
            회원가입
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
