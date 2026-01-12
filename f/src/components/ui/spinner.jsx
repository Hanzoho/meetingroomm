import React from 'react'

export const Spinner = ({ size = 'md', color = 'blue', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2', 
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  }

  const colorClasses = {
    blue: 'border-gray-200 border-t-blue-500',
    green: 'border-gray-200 border-t-green-500', 
    white: 'border-gray-300 border-t-white',
    gray: 'border-gray-300 border-t-gray-600'
  }

  return (
    <div 
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="กำลังโหลด..."
    >
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  )
}

export const LoadingScreen = ({ 
  title = 'กำลังโหลดข้อมูล...', 
  subtitle = 'โปรดรอสักครู่',
  size = 'lg',
  color = 'blue'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <Spinner size={size} color={color} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600">{subtitle}</p>
      </div>
    </div>
  )
}

export const InlineSpinner = ({ size = 'sm', color = 'white', text = '' }) => {
  return (
    <div className="flex items-center">
      <Spinner size={size} color={color} className="mr-2" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  )
}