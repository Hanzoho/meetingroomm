'use client'

import React from 'react'

export default function RoomUsageChart({ roomUsageData = [] }) {
  // หาค่าสูงสุดเพื่อคำนวณ percentage
  const maxBookings = Math.max(...roomUsageData.map(room => room.bookings), 1)
  
  // สีสำหรับแต่ละห้อง (ใช้ gradients สวยๆ)
  const getColorByIndex = (index) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600', 
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-red-500 to-red-600',
      'bg-gradient-to-r from-yellow-500 to-yellow-600',
      'bg-gradient-to-r from-pink-500 to-pink-600',
      'bg-gradient-to-r from-indigo-500 to-indigo-600',
      'bg-gradient-to-r from-teal-500 to-teal-600',
      'bg-gradient-to-r from-cyan-500 to-cyan-600'
    ]
    return colors[index % colors.length]
  }

  const getTextColorByIndex = (index) => {
    const colors = [
      'text-blue-600',
      'text-green-600',
      'text-purple-600',
      'text-orange-600',
      'text-red-600',
      'text-yellow-600',
      'text-pink-600',
      'text-indigo-600',
      'text-teal-600',
      'text-cyan-600'
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-xl sm:text-2xl mr-3">📊</span>
       สถิติการใช้ห้องประชุมทั้งหมด
      </h2>
      
      {roomUsageData.length > 0 ? (
        <div className="space-y-4">
          {/* กราฟแท่ง - เพิ่ม scrollbar */}
          <div className="max-h-80 overflow-y-auto pr-2 space-y-3" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E1 #F1F5F9'
          }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                width: 8px;
              }
              div::-webkit-scrollbar-track {
                background: #F1F5F9;
                border-radius: 8px;
              }
              div::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #64748B 0%, #475569 100%);
                border-radius: 8px;
                border: 1px solid #E2E8F0;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, #475569 0%, #334155 100%);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              div::-webkit-scrollbar-thumb:active {
                background: linear-gradient(180deg, #334155 0%, #1E293B 100%);
              }
            `}</style>
            {roomUsageData.map((room, index) => {
              const percentage = (room.bookings / maxBookings) * 100
              
              return (
                <div key={room.room_id || index} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{room.room_name}</span>
                      {room.location && (
                        <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getTextColorByIndex(index)}`}>
                          {room.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-700">{room.bookings}</span>
                      <span className="text-gray-500 text-xs">ครั้ง</span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ease-out ${getColorByIndex(index)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* สรุปยอดรวม */}
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <span className="block font-medium text-gray-700">รวมการจอง</span>
                <span className="font-bold text-lg text-blue-600">
                  {roomUsageData.reduce((sum, room) => sum + room.bookings, 0)} ครั้ง
                </span>
              </div>
              <div className="text-center">
                <span className="block font-medium text-gray-700">จำนวนห้อง</span>
                <span className="font-bold text-lg text-green-600">
                  {roomUsageData.length} ห้อง
                </span>
              </div>
              <div className="text-center">
                <span className="block font-medium text-gray-700">เฉลี่ยต่อห้อง</span>
                <span className="font-bold text-lg text-purple-600">
                  {roomUsageData.length > 0 ? Math.round(roomUsageData.reduce((sum, room) => sum + room.bookings, 0) / roomUsageData.length) : 0} ครั้ง
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📈</div>
          <p className="text-gray-500">ยังไม่มีข้อมูลการใช้ห้อง</p>
        </div>
      )}
    </div>
  )
}
