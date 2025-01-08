import React, { useState } from 'react';

// 월별 날짜 계산
const getDaysInMonth = (date: Date) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const daysInMonth = [];
  let day = new Date(startDate);
  while (day <= endDate) {
    daysInMonth.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  return daysInMonth;
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Calendar = ({ selectedDate, onDateSelect }: any) => {
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col items-center border border-gray-300 rounded-lg p-4 w-80 bg-white">
      <div className="flex justify-between w-full mb-4">
        <button
          className="text-xl text-gray-700 hover:bg-gray-200 rounded-full p-2"
          onClick={handlePrevMonth}
        >
          &lt;
        </button>
        <span className="text-xl font-semibold text-gray-800">{currentMonth}</span>
        <button
          className="text-xl text-gray-700 hover:bg-gray-200 rounded-full p-2"
          onClick={handleNextMonth}
        >
          &gt;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-gray-600 mb-4">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((date) => (
          <div
            key={date.toString()}
            className={`text-center p-2 cursor-pointer rounded-full 
              ${selectedDate && selectedDate.toDateString() === date.toDateString() 
              ? 'bg-blue-500 text-white font-bold' 
              : 'hover:bg-gray-200'}`}
            onClick={() => handleDateClick(date)}
          >
            {date.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
