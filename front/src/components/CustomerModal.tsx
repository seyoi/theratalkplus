// CustomerModal.tsx

import React, { useState, useEffect } from 'react';
import { db } from "@/app/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerInfo: {
    userId: string;
    clientName: string;
    clientPhone: string;
    chartNumber: string;
    note: string | null;
    isConfirmed: boolean;
    isCancelled: boolean;
  };
}

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customerInfo }) => {
  const [editedClientName, setEditedClientName] = useState(customerInfo.clientName);
  const [editedClientPhone, setEditedClientPhone] = useState(customerInfo.clientPhone);
  const [editedChartNumber, setEditedChartNumber] = useState(customerInfo.chartNumber);
  const [editedNote, setEditedNote] = useState(customerInfo.note || "");  // Note 상태 추가

  // Effect to reset values when customerInfo changes
  useEffect(() => {
    setEditedClientName(customerInfo.clientName);
    setEditedClientPhone(customerInfo.clientPhone);
    setEditedChartNumber(customerInfo.chartNumber);
    setEditedNote(customerInfo.note || "");  // Note 상태 초기화
  }, [customerInfo]);

  // Handle form submission (save changes to Firestore)
  const handleSaveChanges = async () => {
    if (!customerInfo.userId) return;

    const userRef = doc(db, "clients", customerInfo.userId); // 'clients' 컬렉션에서 업데이트할 고객 찾기

    try {
      // Firestore에서 해당 고객의 문서를 가져옴
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        // 기존 데이터를 가져와서 새로운 값으로 업데이트
        await updateDoc(userRef, {
          client_name: editedClientName,
          client_phone: editedClientPhone,
          chart_number: editedChartNumber,
          note: editedNote, // note 필드 추가
        });

        alert("고객 정보가 수정되었습니다.");
        onClose(); // Close modal after save
      } else {
        alert("고객을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">고객 정보 수정</h3>
          <button onClick={onClose} className="text-gray-600 font-semibold">
            X
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
              고객 이름
            </label>
            <input
              id="clientName"
              type="text"
              value={editedClientName}
              onChange={(e) => setEditedClientName(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
          </div>

          <div>
            <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">
              연락처
            </label>
            <input
              id="clientPhone"
              type="text"
              value={editedClientPhone}
              onChange={(e) => setEditedClientPhone(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
          </div>

          <div>
            <label htmlFor="chartNumber" className="block text-sm font-medium text-gray-700">
              차트 번호
            </label>
            <input
              id="chartNumber"
              type="text"
              value={editedChartNumber}
              onChange={(e) => setEditedChartNumber(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
          </div>

          {/* Note 필드 추가 */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700">
              메모
            </label>
            <textarea
              id="note"
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
              rows={4}
              placeholder="고객에 대한 추가 정보를 입력하세요."
            />
          </div>

          <div className="mt-4 flex justify-between">
            <button
              onClick={handleSaveChanges}
              className="bg-blue-500 text-white py-2 px-4 rounded-md"
            >
              저장
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 text-black py-2 px-4 rounded-md"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
