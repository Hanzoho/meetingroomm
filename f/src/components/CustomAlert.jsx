import React from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

const CustomAlert = ({ 
  isOpen, 
  onClose, 
  type = 'info', // 'success', 'error', 'warning', 'confirm'
  title,
  message,
  onConfirm,
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  showCancel = false
}) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />
      case 'confirm':
        return <AlertTriangle className="w-12 h-12 text-blue-500" />
      default:
        return <Info className="w-12 h-12 text-blue-500" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          button: 'bg-green-500 hover:bg-green-600'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          button: 'bg-red-500 hover:bg-red-600'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          button: 'bg-yellow-500 hover:bg-yellow-600'
        }
      case 'confirm':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          button: 'bg-blue-500 hover:bg-blue-600'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          button: 'bg-gray-500 hover:bg-gray-600'
        }
    }
  }

  const colors = getColors()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4
        transform transition-all duration-300 ease-out
        ${colors.bg} ${colors.border} border-2
        scale-100 opacity-100
      `}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {title}
          </h3>

          {/* Message */}
          <div className="text-gray-600 mb-8 leading-relaxed whitespace-pre-line">
            {message}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                {cancelText}
              </button>
            )}
            
            <button
              onClick={() => {
                if (onConfirm) onConfirm()
                onClose()
              }}
              className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${colors.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomAlert
