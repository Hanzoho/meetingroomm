'use client'

import React from 'react'

export default function UniversalLoading({ 
  role = 'user', 
  message = 'กำลังโหลด...',
  subMessage = '',
  loadingText = 'โปรดรอสักครู่...'
}) {
  // กำหนดสีตาม role
  const getThemeColors = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return {
          bgGradient: 'from-red-50 via-rose-50 to-pink-50',
          primaryColor: 'red-500',
          secondaryColor: 'rose-400',
          spinnerColor: 'border-red-500',
          textColor: 'text-red-700'
        }
      case 'officer':
      case 'staff':
        return {
          bgGradient: 'from-orange-50 via-amber-50 to-yellow-50',
          primaryColor: 'orange-500',
          secondaryColor: 'amber-400',
          spinnerColor: 'border-orange-500',
          textColor: 'text-orange-700'
        }
      case 'executive':
        return {
          bgGradient: 'from-purple-50 via-violet-50 to-indigo-50',
          primaryColor: 'purple-500',
          secondaryColor: 'violet-400',
          spinnerColor: 'border-purple-500',
          textColor: 'text-purple-700'
        }
      default: // user
        return {
          bgGradient: 'from-green-50 via-emerald-50 to-teal-50',
          primaryColor: 'green-600',
          secondaryColor: 'emerald-500',
          spinnerColor: 'border-green-600',
          textColor: 'text-gray-900' // เปลี่ยนเป็นสีดำเพื่อให้มองเห็นชัด
        }
    }
  }

  const theme = getThemeColors(role)

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${theme.bgGradient} flex items-center justify-center z-50 px-4`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px sm:60px 60px'
          }}></div>
        </div>
        
        {/* Floating Elements - Hidden on very small screens */}
        <div className={`hidden sm:block absolute top-1/4 left-1/4 w-4 h-4 sm:w-6 sm:h-6 bg-${theme.primaryColor}/20 rounded-full animate-ping`}></div>
        <div className={`hidden sm:block absolute top-3/4 right-1/4 w-3 h-3 sm:w-4 sm:h-4 bg-${theme.secondaryColor}/30 rounded-full animate-pulse`}></div>
        <div className={`hidden sm:block absolute bottom-1/3 left-1/3 w-6 h-6 sm:w-8 sm:h-8 bg-${theme.primaryColor}/15 rounded-full`}></div>
      </div>

      {/* Loading Content */}
      <div className="relative z-10 flex flex-col items-center space-y-4 sm:space-y-8 text-center">
        {/* Large Spinner */}
        <div className="relative">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 border-4 border-gray-200 border-t-4 ${theme.spinnerColor} rounded-full animate-spin`}></div>
          
          {/* Inner pulse circle */}
          <div className={`absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-${theme.primaryColor}/10 rounded-full animate-pulse`}></div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {message}
          </h2>
          {subMessage && (
            <p className="text-base sm:text-lg text-gray-800">
              {subMessage}
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-700 mt-2 sm:mt-4">
            {loadingText}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex space-x-1 sm:space-x-2">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 bg-${theme.primaryColor} rounded-full animate-bounce`}></div>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 bg-${theme.primaryColor} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 bg-${theme.primaryColor} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}
