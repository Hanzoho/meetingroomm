'use client'

import { useState, useEffect } from 'react'

export default function ReservationDetailModal({ 
  isOpen, 
  onClose, 
  reservation,
  onEdit,
  onDelete 
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

  // Debug: ดูข้อมูลที่ส่งมา Modal
  console.log('🔍 [MODAL-DEBUG] Reservation data:', reservation)

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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
    return timeString
  }

  // รองรับ field names จาก My Reservations page และ notification
  const getReservationData = () => {
    return {
      room_name: reservation.room_name || reservation.room?.room_name || 'ไม่ระบุ',
      department: reservation.department || reservation.room?.department || 'ไม่ระบุ',
      location: reservation.location || reservation.room?.location || 'ไม่ระบุ',
      start_date: reservation.start_date || reservation.start_at || reservation.booking_details?.start_at,
      end_date: reservation.end_date || reservation.end_at || reservation.booking_details?.end_at,
      start_time: reservation.start_time || reservation.booking_details?.start_time,
      end_time: reservation.end_time || reservation.booking_details?.end_time,
      details: reservation.details || reservation.details_r || reservation.booking_details?.details,
      status: reservation.status || reservation.status_r || reservation.booking_details?.status,
      created_at: reservation.created_at || reservation.booking_details?.created_at,
      approved_by: reservation.approved_by || reservation.booking_details?.approved_by,
      rejected_reason: reservation.rejected_reason || reservation.booking_details?.rejected_reason,
      // ✅ เพิ่ม booking_dates และ is_multi_day
      booking_dates: reservation.booking_dates || reservation.booking_details?.booking_dates,
      is_multi_day: reservation.is_multi_day || reservation.booking_details?.is_multi_day
    }
  }

  const data = getReservationData()

  // ตรวจสอบสิทธิ์การแก้ไข/ลบ - รองรับทั้งภาษาอังกฤษและไทย
  const canEdit = data.status === 'pending' || data.status === 'รออนุมัติ'
  const canDelete = (data.status === 'pending' || data.status === 'รออนุมัติ') || ((data.status === 'approved' || data.status === 'อนุมัติแล้ว') && new Date(data.start_date) > new Date())

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รออนุมัติ'
      case 'approved': return 'อนุมัติแล้ว'
      case 'confirmed': return 'ยืนยันแล้ว'
      case 'rejected': return 'ปฏิเสธ'
      default: return status
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-out ${
        isVisible ? 'backdrop-blur-sm bg-black/50' : 'backdrop-blur-none bg-transparent'
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transition-all duration-500 ease-out transform ${
          isVisible 
            ? 'scale-100 translate-y-0 opacity-100' 
            : 'scale-95 translate-y-4 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            รายละเอียดการจอง
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(data.status)}`}>
              {getStatusText(data.status)}
            </span>
          </div>

          {/* Reservation Details - Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Room Info Card */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                <span className="mr-2">🏢</span>
                ข้อมูลห้องประชุม
              </h3>
              <div className="space-y-2">
                <p className="text-gray-800 font-medium truncate" title={data.room_name}>
                  {data.room_name}
                </p>
                <p className="text-gray-600 text-sm truncate" title={data.department}>
                  {data.department}
                </p>
                {data.location && (
                  <p className="text-gray-600 text-sm truncate">
                    📍 {data.location}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Time Card */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                <span className="mr-2">📅</span>
                วันที่และเวลา
              </h3>
              <div className="space-y-2">
                {(() => {
                  const formatShortDate = (date) => {
                    return date.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  }
                  
                  let dates = []
                  
                  // ถ้ามี booking_dates ให้ใช้ข้อมูลนั้น (วันที่จองจริง)
                  if (data.booking_dates && Array.isArray(data.booking_dates)) {
                    dates = data.booking_dates.map(dateStr => new Date(dateStr))
                  } else {
                    // ถ้าไม่มี booking_dates ให้สร้างจาก start_date ถึง end_date (ระบบเก่า)
                    const startDate = new Date(data.start_date)
                    const endDate = new Date(data.end_date)
                    const current = new Date(startDate)
                    while (current <= endDate) {
                      dates.push(new Date(current))
                      current.setDate(current.getDate() + 1)
                    }
                  }
                  
                  // เรียงวันที่ให้ถูกต้อง
                  dates.sort((a, b) => a - b)
                  
                  if (dates.length === 1) {
                    return (
                      <p className="text-gray-800">
                        <span className="font-medium">วันที่:</span> {formatBookingDate(dates[0])}
                      </p>
                    )
                  } else {
                    const bookingDatesText = dates.map(date => formatShortDate(date)).join(', ')
                    return (
                      <div className="space-y-2">
                        <p className="text-gray-800 text-sm">
                          <span className="font-medium">📅 วันที่จอง:</span> {bookingDatesText} (ทั้งหมด {dates.length} วัน)
                        </p>
                        <p className="text-gray-800 text-sm">
                          <span className="font-medium">📊 วันที่เริ่มใช้:</span> {formatBookingDate(dates[0])}
                        </p>
                        <p className="text-gray-800 text-sm">
                          <span className="font-medium">🏁 วันที่สิ้นสุด:</span> {formatBookingDate(dates[dates.length - 1])}
                        </p>
                      </div>
                    )
                  }
                })()}
                <p className="text-gray-800">
                  <span className="font-medium">⏰ เวลา:</span> {formatTime(data.start_time)} - {formatTime(data.end_time)}
                </p>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
                <span className="mr-2">📋</span>
                สถานะการจอง
              </h3>
              <div className="space-y-2">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(data.status)}`}>
                  {getStatusText(data.status)}
                </span>
                {/* แสดงใครอนุมัติ/ปฏิเสธ */}
                {data.approved_by && (data.status === 'approved' || data.status === 'อนุมัติแล้ว' || data.status === 'rejected' || data.status === 'ปฏิเสธ') && (
                  <p className="text-gray-600 text-sm">
                    {(data.status === 'approved' || data.status === 'อนุมัติแล้ว') ? 'อนุมัติโดย' : 'ปฏิเสธโดย'}: {data.approved_by}
                  </p>
                )}
                {/* แสดงเหตุผลที่ปฏิเสธ */}
                {(data.status === 'rejected' || data.status === 'ปฏิเสธ') && data.rejected_reason && (
                  <p className="text-red-600 text-sm mt-2">
                    เหตุผลที่ปฏิเสธ: {data.rejected_reason}
                  </p>
                )}
              </div>
            </div>

            {/* Created Date Card */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                <span className="mr-2">⏰</span>
                วันที่จอง
              </h3>
              <p className="text-gray-800">
                {formatCreatedDate(data.created_at)}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📝</span>
              รายละเอียดเพิ่มเติม
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {data.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </p>
          </div>

          {/* Rejected Reason */}
          {(data.status === 'rejected' || data.status === 'ปฏิเสธ') && data.rejected_reason && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center">
                <span className="mr-2">❌</span>
                เหตุผลที่ปฏิเสธ
              </h3>
              <p className="text-red-900 whitespace-pre-wrap">
                {data.rejected_reason}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
            >
              ✏️ แก้ไข
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
            >
              🗑️ ยกเลิก
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
