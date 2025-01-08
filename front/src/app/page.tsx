'use client'
import React from 'react';
import { FaComments, FaCalendarCheck, FaRobot } from 'react-icons/fa'; // react-icons 라이브러리에서 아이콘 가져오기
import { useRouter } from 'next/navigation';

function Landing() {
  const router = useRouter();

  // 어드민 페이지로 이동하는 함수
  const goToAdmin = () => {
    router.push('/admin'); // 어드민 페이지로 라우팅
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 히어로 섹션 */}
      <section className="bg-gray-800 py-24 text-center text-white">
        <div className="max-w-screen-xl mx-auto px-6">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Welcome to TerraTalk
          </h1>
          <p className="text-xl mt-4">병원 AI 상담을 위한 스마트 솔루션</p>
          <button
            onClick={goToAdmin}
            className="mt-8 bg-gray-600 text-white px-8 py-3 rounded-full text-lg hover:bg-gray-700 transition-all duration-300"
          >
            어드민 대시보드로 가기
          </button>
        </div>
      </section>

      {/* 주요 기능 소개 */}
      <section className="py-20 px-6">
        <div className="max-w-screen-lg mx-auto text-center space-y-16">
          <h2 className="text-4xl font-semibold text-gray-800">테라톡만의 강력한 장점</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* 옴니채널 통합 관리 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-center mb-6">
                <FaComments className="text-5xl text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">옴니채널 통합 관리</h3>
              <p className="text-lg text-gray-700 mb-4">
                "카카오톡, 인스타 DM, 네이버 톡톡까지! 다양한 SNS를 한 곳에서 효율적으로 관리하세요."
              </p>
              <p className="text-lg text-gray-700">
                "중복 업무를 줄이고 상담 시간을 단축하여 운영 효율성을 극대화하세요."
              </p>
            </div>

            {/* 내원 증가 솔루션 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-center mb-6">
                <FaCalendarCheck className="text-5xl text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">내원 증가 솔루션</h3>
              <p className="text-lg text-gray-700 mb-4">
                "테라톡으로 예약 놓치지 마세요! 당일 예약 관리를 통해 병원 매출 30%를 증가시켜 보세요."
              </p>
              <p className="text-lg text-gray-700">
                "실무자와 예약자 간 갈등 없이 매끄럽게 예약을 관리합니다."
              </p>
            </div>

            {/* 단순 상담 자동화 */}
            <div className="bg-white p-8 rounded-3xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-center mb-6">
                <FaRobot className="text-5xl text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">단순 상담 자동화</h3>
              <p className="text-lg text-gray-700 mb-4">
                "반복적인 상담은 챗봇에게 맡기세요. 직원들은 고부가가치 업무에 더 집중할 수 있습니다."
              </p>
              <p className="text-lg text-gray-700">
                "효율적인 인력 활용으로 상담 직원의 업무 생산성을 높여 보세요."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="text-center">
          <p>&copy; 2025 TerraTalk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
