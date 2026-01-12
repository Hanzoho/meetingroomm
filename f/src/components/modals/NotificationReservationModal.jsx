'use client'

import { useState, useEffect } from 'react'

export default function NotificationReservationModal({ 
  isOpen, 
  onClose, 
  reservation 
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // เริ่มอนิเมชั่นหลังจาก component mount
      setTimeout(() => setIsVisible(true), 50)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    // รอให้อนิเมชั่นเสร็จก่อนปิด modal
    setTimeout(() => onClose(), 200)
  }

  if (!isOpen || !reservation) return null

  // ฟังก์ชันสำหรับ format วันที่และเวลาที่อ่านง่าย
  const formatBookingDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ'
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCreatedDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ'
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'ไม่ระบุ'
    // ถ้าเป็น ISO string ให้แปลงเป็นเวลา
    if (timeString.includes('T')) {
      const date = new Date(timeString)
      return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    // ถ้าเป็น time string ปกติ
    return timeString.slice(0, 5) // แสดงแค่ HH:MM
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รออนุมัติ'
      case 'approved': return 'อนุมัติแล้ว'
      case 'confirmed': return 'ยืนยันแล้ว'
      case 'rejected': return 'ปฏิเสธ'
      case 'cancelled': return 'ยกเลิกแล้ว'
      default: return status
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black bg-opacity-50' : 'bg-transparent'
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
      }}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-500 ease-out ${
          isVisible 
            ? 'scale-100 translate-y-0 opacity-100' 
            : 'scale-95 translate-y-4 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg">📄</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">รายละเอียดการจอง</h3>
              <p className="text-sm text-gray-500">ข้อมูลการจองห้องประชุมของฉัน</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <span className="text-lg">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Grid Layout 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* 🏢 ข้อมูลห้องประชุม */}
            <div className="bg-blue-50 p-4 rounded-lg min-w-0">
              <h3 className="font-semibold text-blue-800 mb-2">🏢 ข้อมูลห้องประชุม</h3>
              <p className="text-gray-800 font-medium truncate" title={reservation.room_name}>
                {reservation.room_name || 'ไม่ระบุ'}
              </p>
              <p className="text-gray-600 text-sm truncate" title={reservation.department}>
                {reservation.department || 'ไม่ระบุคณะ/แผนก'}
              </p>
            </div>

            {/* 📅 วันที่และเวลา */}
            <div className="bg-green-50 p-4 rounded-lg min-w-0">
              <h3 className="font-semibold text-green-800 mb-2">📅 วันที่และเวลา</h3>
              <p className="text-gray-800">เริ่ม: {formatBookingDate(reservation.start_at)}</p>
              <p className="text-gray-800">สิ้นสุด: {formatBookingDate(reservation.end_at)}</p>
              <p className="text-gray-800">เวลา: {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}</p>
            </div>

            {/* 📋 สถานะ */}
            <div className="bg-yellow-50 p-4 rounded-lg min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-yellow-800">📋 สถานะ</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reservation.status)}`}>
                  {getStatusText(reservation.status)}
                </span>
              </div>
            </div>

            {/* ⏰ วันที่จอง */}
            <div className="bg-purple-50 p-4 rounded-lg min-w-0">
              <h3 className="font-semibold text-purple-800 mb-2">⏰ วันที่จอง</h3>
              <p className="text-gray-800">{formatCreatedDate(reservation.created_at)}</p>
            </div>
          </div>

          {/* 📝 รายละเอียด (เต็มความกว้าง) */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">📝 รายละเอียด</h3>
            <p className="text-gray-700 break-words">
              {reservation.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </p>
          </div>

          {/* อนุมัติโดย (ถ้ามี) */}
          {reservation.approved_by && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-green-800 mb-2">✅ อนุมัติโดย</h3>
              <p className="text-gray-800">{reservation.approved_by}</p>
            </div>
          )}

          {/* Footer - เฉพาะปุ่มปิด (ไม่มีแก้ไข/ยกเลิก) */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}