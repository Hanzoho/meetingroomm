'use client'

import React from 'react'

export default function DepartmentStatsChart({ departmentStats = [] }) {
  // หาค่าสูงสุดเพื่อคำนวณ percentage
  const maxBookings = Math.max(...departmentStats.map(dept => dept.bookings), 1)
  
  // สีสำหรับแต่ละคณะ
  const getDepartmentColor = (index) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-red-500 to-red-600',
      'bg-gradient-to-r from-yellow-500 to-yellow-600',
      'bg-gradient-to-r from-pink-500 to-pink-600',
      'bg-gradient-to-r from-indigo-500 to-indigo-600'
    ]
    return colors[index % colors.length]
  }

  const getDepartmentIcon = (department) => {
    const icons = {
      'คณะเทคโนโลยีสารสนเทศ': '💻',
      'คณะบริหารธุรกิจ': '💼',
      'คณะศึกษาศาสตร์': '📚',
      'คณะมนุษยศาสตร์': '🎭',
      'คณะวิทยาศาสตร์': '🔬',
      'คณะเกษตรศาสตร์': '🌾',
      'คณะศิลปกรรมศาสตร์': '🎨',
      'งานอื่นๆ': '🏢'
    }
    return icons[department] || '📋'
  }

  // คำนวณเปอร์เซ็นต์สำหรับ Donut Chart
  const totalBookings = departmentStats.reduce((sum, dept) => sum + dept.bookings, 0)
  
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-xl sm:text-2xl mr-3">🏛️</span>
        สถิติการจองตามคณะทั้งหมด
      </h2>
      
      {departmentStats.length > 0 ? (
        <div className="space-y-4">
          {/* Compact Department List */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2" style={{
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
            {departmentStats.map((dept, index) => {
              const percentage = totalBookings > 0 ? (dept.bookings / totalBookings) * 100 : 0
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getDepartmentIcon(dept.department)}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{dept.department}</div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}% ของทั้งหมด</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-blue-600">{dept.bookings}</div>
                    <div className="text-xs text-gray-500">ครั้ง</div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* สรุปรวม */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">รวมทั้งหมด:</span>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{totalBookings} ครั้ง</div>
                <div className="text-xs text-gray-500">{departmentStats.length} คณะ</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">🏛️</div>
          <p className="text-gray-500">ยังไม่มีข้อมูลการจองตามคณะ</p>
        </div>
      )}
    </div>
  )
}
