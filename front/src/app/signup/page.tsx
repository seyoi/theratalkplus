import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/firebase"; // 회원가입 함수 import
import { useAuth } from "@/context/AuthContext";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      setError("이름을 입력해주세요.");
      return;
    }

    try {
      await signUp(email, password, name); // Firebase 회원가입 호출
      router.push("/"); // 회원가입 후 홈 페이지로 리다이렉트
    } catch (err) {
      setError("회원가입 실패: 이미 존재하는 이메일일 수 있습니다.");
    }
  };

  if (isLoggedIn) {
    router.push("/"); // 이미 로그인한 경우 홈 페이지로 리다이렉트
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">회원가입</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              이름
            </label>
            <input
              type="text"
              id="name"
              className="w-full mt-1 px-4 py-2 border rounded-md"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            회원가입
          </Button>
        </form>
        <p className="mt-4 text-sm text-center">
          이미 계정이 있으신가요?{" "}
          <a href="/login" className="text-lime-500 hover:underline">
            로그인
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
