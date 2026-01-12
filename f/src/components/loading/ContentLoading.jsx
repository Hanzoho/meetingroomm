import React from 'react'

export default function ContentLoading({ message = 'กำลังโหลดข้อมูล...', loadingText = 'โปรดรอสักครู่' }) {
  return (
    <div className="w-full flex items-center justify-center py-16">
      <div className="text-center">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-18 w-18 lg:h-20 lg:w-20 border-b-4 border-green-600 mx-auto mb-4"></div>
        </div>
        <div className="space-y-2">
          <p className="text-gray-600 text-lg lg:text-xl font-medium">{message}</p>
          <p className="text-gray-500 text-sm lg:text-base">{loadingText}</p>
        </div>
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce"></div>
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}
