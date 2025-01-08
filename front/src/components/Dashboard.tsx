import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Save } from 'lucide-react';
import { db } from '@/app/firebase'; // Firestore 설정 경로를 맞게 설정하세요.
import { onSnapshot, doc } from 'firebase/firestore';
import Calendar from './Calendar'; // 캘린더 컴포넌트 임포트
import { format } from 'date-fns';

type AppointmentMode = 'available' | 'unavailable';
type TimeSlot = string;

export default function AdminDashboard() {
  const [mode, setMode] = useState<AppointmentMode>('available');
  const [selectedTimes, setSelectedTimes] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [existingSlots, setExistingSlots] = useState<TimeSlot[]>([]);

  const timeSlots = Array.from({ length: 21 }, (_, i) => {
    const hour = Math.floor(i / 2) + 10;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
  });

  const selectAllTimes = () => setSelectedTimes([...timeSlots]);

  const handleTimeToggle = (time: TimeSlot) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time].sort()
    );
  };

  const getPreviewMessage = () => {
    const clinicName = '[병의원명]';
    const baseMessage = `안녕하세요, ${clinicName}입니다.\n`;

    if (mode === 'unavailable') {
      return `${baseMessage}죄송합니다. 금일 당일 예약은 불가합니다. 다음에 다시 방문해주시기 바랍니다.`;
    } else {
      const times = selectedTimes.length > 0 ? `[${selectedTimes.join(', ')}]` : '모든 시간대';
      return `${baseMessage}금일 당일 예약이 가능합니다. 현재 예약 가능 시간은 ${times}입니다.\n\n예약을 원하시면 아래 정보를 남겨주세요:\n\n1. 성함\n2. 연락처\n3. 원하시는 시간대\n4. 원하시는 시술 및 상담\n\n당일 예약이므로 약간의 대기는 발생할 수 있습니다. 감사합니다!`;
    }
  };

  useEffect(() => {
    setPreviewMessage(getPreviewMessage());
  }, [mode, selectedTimes]);

  useEffect(() => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const unsubscribe = onSnapshot(doc(db, 'booking_data', formattedDate), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setExistingSlots(data.selected_times || []);
      } else {
        setExistingSlots([]);
      }
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const handleSaveBookingData = async () => {
    const bookingData = {
      mode: mode,
      selected_times: mode === 'unavailable' ? [] : selectedTimes,
      preview_message: previewMessage,
    };

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    try {
      console.log("Sending data to API:", { date: formattedDate, booking_data: bookingData });

      const response = await fetch(`https://theratalkplus.com/set-booking-data-by-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formattedDate,
          booking_data: bookingData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`예약 데이터 저장 완료!\n\n날짜: ${formattedDate}\n모드: ${mode}\n시간대: ${selectedTimes.join(', ')}`);
        console.log("Response:", result);
      } else {
        const errorText = await response.text();
        alert(`예약 데이터 저장 실패: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving booking data:', error);
      alert('예약 데이터 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>당일 예약 관리 ({format(selectedDate, 'yyyy-MM-dd')})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 자체 캘린더 사용 */}
          <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

          <RadioGroup
            defaultValue="available"
            onValueChange={(value: string) => setMode(value as AppointmentMode)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="available" id="available" />
              <Label htmlFor="available">예약 가능</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unavailable" id="unavailable" />
              <Label htmlFor="unavailable">예약 불가</Label>
            </div>
          </RadioGroup>

          {mode === 'available' && (
            <div className="space-y-4">
              <Button variant="outline" onClick={selectAllTimes}>
                모두 선택
              </Button>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {timeSlots.map((time) => (
                  <div key={time} className="flex items-center space-x-2">
                    <Checkbox
                      id={time}
                      checked={selectedTimes.includes(time)}
                      onCheckedChange={() => handleTimeToggle(time)}
                    />
                    <Label htmlFor={time}>{time}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={handleSaveBookingData}>
            <Save className="w-4 h-4 mr-2" />
            AI 답변에 적용
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>현재 예약 시간</CardTitle>
        </CardHeader>
        <CardContent>
          {existingSlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {existingSlots.map((time) => (
                <span
                  key={time}
                  className="bg-white-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium border border-gray-500"
                >
                  {time}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h4m-2 4h2m1 5h-3m1-9h4m1 6h-3"
                />
              </svg>
              <p className="text-gray-500">예약된 시간이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
