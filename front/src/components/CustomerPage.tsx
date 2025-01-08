// CustomerManagementPage.tsx

import React, { useState, useEffect } from 'react';
import { db } from "@/app/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import CustomerModal from "@/components/CustomerModal";
import { Trash2, Edit2 } from "lucide-react";  // 아이콘

interface Customer {
  userId: string;
  clientName: string;
  clientPhone: string;
  chartNumber: string;
  note: string | null;
  isConfirmed: boolean;
  isCancelled: boolean;
}

const CustomerManagementPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 고객 정보 가져오기
  const fetchCustomers = async () => {
    const querySnapshot = await getDocs(collection(db, "clients"));
    const customerData: Customer[] = querySnapshot.docs.map(doc => ({
      userId: doc.id,
      clientName: doc.data().client_name,
      clientPhone: doc.data().client_phone,
      chartNumber: doc.data().chart_number,
      note: doc.data().note,
      isConfirmed: doc.data().is_confirmed,
      isCancelled: doc.data().is_cancelled,
    }));
    setCustomers(customerData);
  };

  // 고객 삭제
  const handleDeleteCustomer = async (userId: string) => {
    try {
      const userRef = doc(db, "clients", userId);
      await deleteDoc(userRef);
      alert("고객 정보가 삭제되었습니다.");
      fetchCustomers();  // 고객 목록 새로 고침
    } catch (error) {
      console.error("고객 삭제 중 오류가 발생했습니다.", error);
      alert("고객 삭제 중 오류가 발생했습니다.");
    }
  };

  // 모달 열기
  const handleOpenModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  // 초기 데이터 로딩
  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">고객 관리</h1>

      <div className="mb-4 flex justify-end">
        {/* 새 고객 추가 버튼 */}
        <Button onClick={() => handleOpenModal({ userId: '', clientName: '', clientPhone: '', chartNumber: '', note: '', isConfirmed: false, isCancelled: false })} className="bg-green-500 text-white">
          새 고객 추가
        </Button>
      </div>

      <div className="space-y-4">
        {customers.length > 0 ? (
          customers.map((customer) => (
            <div key={customer.userId} className="flex justify-between items-center p-4 border rounded-md shadow-sm">
              <div>
                <h2 className="text-lg font-semibold">{customer.clientName}</h2>
                <p className="text-sm text-gray-600">연락처: {customer.clientPhone}</p>
                <p className="text-sm text-gray-600">차트 번호: {customer.chartNumber}</p>
                <p className="text-sm text-gray-500">상태: {customer.isConfirmed ? '확정됨' : customer.isCancelled ? '취소됨' : '미확정'}</p>
              </div>

              <div className="flex space-x-4">
                {/* 고객 수정 버튼 */}
                <Button variant="link" onClick={() => handleOpenModal(customer)}>
                  <Edit2 className="w-5 h-5 text-blue-500" />
                </Button>

                {/* 고객 삭제 버튼 */}
                <Button variant="link" onClick={() => handleDeleteCustomer(customer.userId)}>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p>고객이 없습니다.</p>
        )}
      </div>

      {/* 고객 정보 수정 모달 */}
      {isModalOpen && selectedCustomer && (
        <CustomerModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          customerInfo={selectedCustomer}
        />
      )}
    </div>
  );
};

export default CustomerManagementPage;
