'use client'

import React from 'react'

// ContentLoadingSpinner - สำหรับแสดงการโหลดในส่วนเนื้อหาเฉพาะ ไม่เต็มหน้า
function ContentLoadingSpinner({ message = "กำลังโหลดข้อมูล..." }) {
  return (
    <div className="flex items-center justify-center py-20 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
      <div className="text-center">
        {/* Logo หรือชื่อมหาวิทยาลัย */}
        <div className="mb-8">
          <div className="text-4xl lg:text-6xl font-bold text-green-600 mb-2">
            🏢 RMU
          </div>
          <p className="text-lg lg:text-xl text-gray-700 font-medium">
            ระบบจองห้องประชุม
          </p>
          <p className="text-sm text-gray-500 mt-1">
            มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>

        {/* Loading spinner */}
        <div className="mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <p className="text-gray-600 text-lg font-medium">{message}</p>
          <p className="text-gray-500 text-sm">โปรดรอสักครู่</p>
        </div>

        {/* Dots animation */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

export default ContentLoadingSpinner