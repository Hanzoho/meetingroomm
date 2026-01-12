'use client'

import React from 'react'

export default function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'success',
  showCancel = false,
  onConfirm = null,
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก'
}) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '⛔' // เปลี่ยนเป็นไอคอนที่มองเห็นชัดบนพื้นแดง
      case 'warning':
        return '⚠️'
      default:
        return '✅'
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'from-green-500 to-emerald-600',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700'
        }
      case 'error':
        return {
          bg: 'from-red-500 to-red-600',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700',
          icon: 'text-white text-6xl' // เพิ่มสำหรับไอคอน error
        }
      case 'warning':
        return {
          bg: 'from-yellow-500 to-orange-600',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      default:
        return {
          bg: 'from-green-500 to-emerald-600',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700'
        }
    }
  }

  const colors = getColors()

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <style jsx>{`
        @keyframes checkmark-spin {
          0% { transform: rotate(0deg) scale(0.5); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .checkmark-animation {
          animation: checkmark-spin 0.6s ease-out;
        }
      `}</style>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className={`bg-gradient-to-br ${colors.bg} p-8 text-white text-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className={`text-5xl mb-3 ${type === 'success' ? '' : 'animate-bounce'}`}>{getIcon()}</div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8 text-center">
          <p className={`text-lg ${colors.text} mb-8 leading-relaxed whitespace-pre-line`}>{message}</p>
          
          {/* Buttons */}
          <div className={`flex gap-4 ${showCancel ? 'justify-center' : ''}`}>
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-gray-300 hover:scale-105 transform-gpu"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`${showCancel ? 'flex-1' : 'w-full'} ${colors.button} text-white py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl transform-gpu`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
