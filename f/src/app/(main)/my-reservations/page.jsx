'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils, reservationAPI } from '@/lib/fetchData'
import ReservationDetailModal from '@/components/modals/ReservationDetailModal'




// Edit Reservation Modal Component - ใช้เหมือนหน้า Dashboard
function EditReservationModal({ reservation, onClose, onSave }) {
  const router = useRouter()
  const [editData, setEditData] = useState({
    start_at: reservation.start_date || reservation.start_at,
    end_at: reservation.end_date || reservation.end_at,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    details_r: reservation.details || reservation.details_r || ''
  })
  const [conflictCheck, setConflictCheck] = useState(null)
  
  // สร้างตัวเลือกเวลา 08:00-22:00 (เต็มชั่วโมงเท่านั้น)
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 8; hour < 22; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`
      options.push(timeString)
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // Format time for display (HH:MM)
  const formatTimeForInput = (timeString) => {
    if (!timeString) return ''
    try {
      if (timeString.includes('T')) {
        const time = new Date(timeString)
        return time.toTimeString().slice(0, 5)
      }
      return timeString.slice(0, 5)
    } catch (error) {
      return timeString.slice(0, 5) || ''
    }
  }

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    } catch (error) {
      return ''
    }
  }

  // Format date display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return dateString
    }
  }

  // Get status text - รองรับทั้งภาษาอังกฤษและไทย
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'รอการอนุมัติ'
      case 'approved':
        return 'อนุมัติแล้ว'
      case 'rejected':
        return 'ปฏิเสธ'
      case 'cancelled':
        return 'ยกเลิก'
      // ถ้าเป็นภาษาไทยแล้วให้ใช้เลย
      case 'รอการอนุมัติ':
      case 'อนุมัติแล้ว':
      case 'ปฏิเสธ':
      case 'ยกเลิก':
        return status
      default:
        return status
    }
  }

  // Check for conflicts when dates/times change
  const checkConflicts = async () => {
    if (!editData.start_at || !editData.end_at || !editData.start_time || !editData.end_time) {
      setConflictCheck(null)
      return
    }

    try {

      const startTime = timeToMinutes(editData.start_time)
      const endTime = timeToMinutes(editData.end_time)

      if (endTime <= startTime) {
        setConflictCheck([{
          date: 'เวลา',
          error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
          reservations: []
        }])
        return
      }

      const startDate = new Date(editData.start_at)
      const endDate = new Date(editData.end_at)
      const dates = []

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
      
      const conflicts = []

      for (const date of dates) {
        try {
          const response = await fetch(`/api/reservations/calendar/${reservation.room_id}?date=${date}`, {
            headers: {
              'Authorization': `Bearer ${authUtils.getToken()}`
            }
          })

          if (response.ok) {
            const calendarData = await response.json()

            if (calendarData.success && calendarData.data?.reservations) {
              const overlappingReservations = calendarData.data.reservations.filter(r =>
                r.reservation_id !== reservation.reservation_id &&
                r.status !== 'cancelled' && r.status !== 'ยกเลิก' &&
                r.status !== 'rejected' && r.status !== 'ปฏิเสธ' &&
                hasTimeOverlap(editData.start_time, editData.end_time, r.start_time, r.end_time)
              )

              if (overlappingReservations.length > 0) {
                conflicts.push({
                  date: date,
                  reservations: overlappingReservations
                })
              }
            }
          }
        } catch (error) {
          console.error(`Error checking conflicts for date ${date}:`, error)
        }
      }

      setConflictCheck(conflicts)

      if (conflicts.length > 0) {
        let conflictMessage = '⚠️ พบการจองที่ขัดแย้งกัน!\n\n'
        conflicts.forEach(conflict => {
          conflictMessage += `📅 วันที่: ${formatDate(conflict.date)}\n`
          conflict.reservations.forEach(res => {
            conflictMessage += `🕐 ${res.start_time} - ${res.end_time}\n`
            conflictMessage += `👤 ผู้จอง: ${res.user_name || 'ไม่ระบุ'}\n`
            conflictMessage += `📝 รายละเอียด: ${res.details}\n`
            conflictMessage += `📊 สถานะ: ${getStatusText(res.status)}\n\n`
          })
        })
        conflictMessage += 'กรุณาเลือกวันที่และเวลาอื่น'

        setTimeout(() => {
          alert(conflictMessage)
        }, 100)
      }

    } catch (error) {
      console.error('Error checking conflicts:', error)
      setConflictCheck(null)
    }
  }

  // Helper functions
  const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + (minutes || 0)
  }

  const hasTimeOverlap = (start1, end1, start2, end2) => {
    const s1 = timeToMinutes(start1)
    const e1 = timeToMinutes(end1)
    const s2 = timeToMinutes(start2)
    const e2 = timeToMinutes(end2)

    return s1 < e2 && e1 > s2
  }

  const handleSave = async () => {
    if (!editData.start_at || !editData.end_at || !editData.start_time || !editData.end_time) {
      alert('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    const startTime = timeToMinutes(editData.start_time)
    const endTime = timeToMinutes(editData.end_time)

    if (endTime <= startTime) {
      alert('⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      return
    }

    if (conflictCheck && conflictCheck.length > 0) {
      alert('❌ ไม่สามารถแก้ไขได้เนื่องจากมีการจองที่ขัดแย้งกัน\nกรุณาเลือกวันที่และเวลาอื่น')
      return
    }

    try {
      const updateData = {
        start_date: editData.start_at,
        end_date: editData.end_at,
        start_time: editData.start_time,
        end_time: editData.end_time,
        details: editData.details_r
      }

      const response = await reservationAPI.update(reservation.reservation_id, updateData)

      if (response && response.success) {
        alert('✅ แก้ไขการจองสำเร็จ')
        onSave(response.data)
      } else {
        const errorMessage = response?.message || 'ไม่สามารถแก้ไขการจองได้'
        alert(`❌ เกิดข้อผิดพลาด: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error updating reservation:', error)

      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        alert('❌ Session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
        router.push('/login')
      } else if (error.message?.includes('404')) {
        alert('❌ ไม่พบการจองที่ต้องการแก้ไข')
      } else if (error.message?.includes('400')) {
        alert('❌ ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
      } else {
        alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง')
      }
    }
  }

  // Check conflicts when dates/times change
  useEffect(() => {
    if (editData.start_at && editData.end_at && editData.start_time && editData.end_time) {
      checkConflicts()
    }
  }, [editData.start_at, editData.end_at, editData.start_time, editData.end_time])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform animate-slideUp overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="text-2xl mr-3">✏️</span>
              แก้ไขการจอง
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Room Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-100 overflow-hidden">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
              <span className="mr-2">🏢</span>
              ห้องประชุม
            </h3>
            <p className="text-gray-800 font-medium truncate" title={reservation.room_name}>
              {reservation.room_name}
            </p>
            <p className="text-gray-600 text-sm truncate" title={reservation.department}>
              {reservation.department}
            </p>
          </div>

          {/* Edit Form */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                ข้อมูลการจอง
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">วันที่เริ่มต้น</label>
                  <input
                    type="date"
                    value={formatDateForInput(editData.start_at)}
                    onChange={(e) => setEditData({...editData, start_at: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">วันที่สิ้นสุด</label>
                  <input
                    type="date"
                    value={formatDateForInput(editData.end_at)}
                    onChange={(e) => setEditData({...editData, end_at: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center">
                <span className="mr-2">⏰</span>
                ช่วงเวลาการจอง
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">⏰ เวลาเริ่มต้น</label>
                  <select
                    value={formatTimeForInput(editData.start_time)}
                    onChange={(e) => {
                      const selectedStartTime = e.target.value
                      
                      // คำนวณเวลาสิ้นสุดอัตโนมัติ (เพิ่ม 1 ชั่วโมง)
                      let autoEndTime = ''
                      if (selectedStartTime) {
                        const [hours, minutes] = selectedStartTime.split(':')
                        const startHour = parseInt(hours)
                        const endHour = startHour + 1
                        
                        // ตรวจสอบว่าไม่เกิน 22:00
                        if (endHour <= 22) {
                          autoEndTime = `${endHour.toString().padStart(2, '0')}:${minutes}`
                        }
                      }
                      
                      setEditData({
                        ...editData, 
                        start_time: selectedStartTime,
                        end_time: autoEndTime
                      })
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">เลือกเวลาเริ่มต้น</option>
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time} น.
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">⏰ เวลาสิ้นสุด</label>
                  <select
                    value={formatTimeForInput(editData.end_time)}
                    onChange={(e) => setEditData({...editData, end_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">เลือกเวลาสิ้นสุด</option>
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time} น.
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <span className="mr-2">📋</span>
                วัตถุประสงค์การจอง
              </label>
              <textarea
                value={editData.details_r}
                onChange={(e) => setEditData({...editData, details_r: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="ระบุวัตถุประสงค์การจองห้องประชุม..."
              />
            </div>

            {/* Conflict Warning */}
            {conflictCheck && conflictCheck.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-shake">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                  <span className="mr-2">⚠️</span>
                  มีการจองที่ขัดแย้งกัน
                </h4>
                {conflictCheck.map((conflict, index) => (
                  <div key={index} className="text-sm text-red-700 mb-2">
                    <strong>📅 วันที่ {conflict.date}:</strong>
                    {conflict.reservations.map((res, idx) => (
                      <div key={idx} className="ml-4 pl-2 border-l-2 border-red-300">
                        🕐 {res.start_time} - {res.end_time} | 📝 {res.details}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={(conflictCheck && conflictCheck.length > 0)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center"
            >
              💾 บันทึกการแก้ไข
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main My Reservations Page Component
export default function MyReservationsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    total_bookings: 0,
    pending_bookings: 0,
    approved_bookings: 0,
    rejected_bookings: 0,
    this_month_bookings: 0
  })
  const [reservations, setReservations] = useState([])  // current/future reservations
  const [allReservations, setAllReservations] = useState([])  // ข้อมูลทั้งหมดรวม cancelled
  const [filteredReservations, setFilteredReservations] = useState([])
  const [currentFilter, setCurrentFilter] = useState('all')
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [isClosingModal, setIsClosingModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // Helper functions
  const getStatusColor = (status) => {
    // รองรับทั้งภาษาอังกฤษและไทย
    switch (status) {
      case 'pending':
      case 'รออนุมัติ':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
      case 'อนุมัติแล้ว':
        return 'bg-green-100 text-green-800'
      case 'rejected':
      case 'ปฏิเสธ':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
      case 'ยกเลิก':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    // ถ้า Backend ส่งมาเป็นภาษาไทยแล้ว ให้ใช้เลย
    switch (status) {
      case 'pending':
        return 'รออนุมัติ'
      case 'approved':
        return 'อนุมัติแล้ว'
      case 'rejected':
        return 'ปฏิเสธ'
      case 'cancelled':
        return 'ยกเลิก'
      // ถ้าเป็นภาษาไทยแล้วให้ใช้เลย
      case 'รออนุมัติ':
      case 'อนุมัติแล้ว':
      case 'ปฏิเสธ':
      case 'ยกเลิก':
        return status
      default:
        return status
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return dateString
    }
  }

  // Format detailed date range for reservations
  const formatDetailedDateRange = (reservation) => {
    try {
      // ฟังก์ชันจัดรูปแบบวันที่แบบสั้น (1 พ.ย. 2568)
      const formatShortDate = (date) => {
        return date.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      }
      
      let dates = []
      
      // ถ้ามี booking_dates ให้ใช้ข้อมูลนั้น (วันที่จองจริง)
      if (reservation.booking_dates && Array.isArray(reservation.booking_dates)) {
        dates = reservation.booking_dates.map(dateStr => new Date(dateStr))
      } else {
        // ถ้าไม่มี booking_dates ให้สร้างจาก start_date ถึง end_date (ระบบเก่า)
        const startDate = new Date(reservation.start_date)
        const endDate = new Date(reservation.end_date)
        const current = new Date(startDate)
        while (current <= endDate) {
          dates.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }
      }
      
      // เรียงวันที่ให้ถูกต้อง
      dates.sort((a, b) => a - b)
      
      const startDate = dates[0]
      const endDate = dates[dates.length - 1]
      
      // ถ้าจองแค่วันเดียว
      if (dates.length === 1) {
        return {
          single: true,
          bookingDates: formatShortDate(dates[0]),
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }
      }
      
      // หลายวัน - สร้างรายการวันที่จองจริง
      const bookingDatesText = dates.map(date => formatShortDate(date)).join(', ')
      
      return {
        single: false,
        bookingDates: `${bookingDatesText} (ทั้งหมด ${dates.length} วัน)`,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        totalDays: dates.length
      }
    } catch (error) {
      return {
        single: true,
        bookingDates: formatDate(reservation.start_date),
        startDate: formatDate(reservation.start_date),
        endDate: formatDate(reservation.end_date)
      }
    }
  }

  const formatDateTime = (dateTimeString) => {
    try {
      const date = new Date(dateTimeString)
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return dateTimeString
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    
    try {
      if (timeString.includes('T')) {
        const date = new Date(timeString)
        return date.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }
      
      const time = timeString.split(':')
      return `${time[0].padStart(2, '0')}:${time[1].padStart(2, '0')}`
    } catch (error) {
      return timeString
    }
  }

  // Filter reservations based on current filter
  const filterReservations = (reservations, filter) => {
    let filtered
    
    // สำหรับ cancelled ใช้ข้อมูลทั้งหมด, อื่นๆ ใช้ current/future
    if (filter === 'cancelled') {
      filtered = allReservations  // ใช้ข้อมูลทั้งหมดเพื่อดู cancelled ที่ผ่านมา
    } else {
      filtered = reservations  // ใช้ current/future สำหรับอื่นๆ
    }

    // Apply status filter - รองรับทั้งภาษาอังกฤษและไทย
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(r => r.status === 'pending' || r.status === 'รออนุมัติ')
        break
      case 'approved':
        filtered = filtered.filter(r => r.status === 'approved' || r.status === 'อนุมัติแล้ว')
        break
      case 'rejected':
        filtered = filtered.filter(r => r.status === 'rejected' || r.status === 'ปฏิเสธ')
        break
      case 'cancelled':
        filtered = filtered.filter(r => r.status === 'cancelled' || r.status === 'ยกเลิก' || r.status === 'ยกเลิกแล้ว')
        break
      case 'upcoming':
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        filtered = filtered.filter(r => (r.status === 'approved' || r.status === 'อนุมัติแล้ว') && new Date(r.start_date) >= today)
        break
      case 'all':
      default:
        break
    }

    return filtered
  }

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / itemsPerPage)) // At least 1 page
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [currentFilter])

  // Pagination Component
  const Pagination = () => {
    // Always show pagination, even with only 1 page

    const getPageNumbers = () => {
      if (totalPages <= 1) return [1] // Show at least page 1
      
      const delta = 2
      const range = []
      const rangeWithDots = []

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i)
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...')
      } else {
        rangeWithDots.push(1)
      }

      rangeWithDots.push(...range)

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages)
      } else {
        rangeWithDots.push(totalPages)
      }

      return rangeWithDots
    }

    const pageNumbers = getPageNumbers()

    return (
      <div className="flex items-center justify-between px-6 py-4">
        <div className="text-sm text-gray-700">
          ทั้งหมด {filteredReservations.length} รายการ
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            ← ก่อนหน้า
          </button>

          {pageNumbers.map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
              disabled={pageNum === '...'}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                pageNum === currentPage
                  ? 'bg-blue-500 text-white'
                  : pageNum === '...'
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            ถัดไป →
          </button>
        </div>
      </div>
    )
  }

  // Calculate stats from reservations
  const calculateStats = (reservations) => {
    const total = reservations.length
    // รองรับทั้งภาษาอังกฤษและไทย
    const pending = reservations.filter(r => r.status === 'pending' || r.status === 'รออนุมัติ').length
    const approved = reservations.filter(r => r.status === 'approved' || r.status === 'อนุมัติแล้ว').length
    const rejected = reservations.filter(r => r.status === 'rejected' || r.status === 'ปฏิเสธ').length
    
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thisMonth = reservations.filter(r => {
      const reservationDate = new Date(r.created_at || r.start_date)
      return reservationDate.getMonth() === currentMonth && reservationDate.getFullYear() === currentYear
    }).length

    return {
      total_bookings: total,
      pending_bookings: pending,
      approved_bookings: approved,
      rejected_bookings: rejected,
      this_month_bookings: thisMonth
    }
  }

  // Load user data and reservations
  const loadUserData = async (userData) => {
    try {
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/reservations/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authUtils.getToken()}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', data) // Debug log
        
        if (data.success && data.data) {
          const allReservations = data.data || []
          console.log('All Reservations:', allReservations) // Debug log
          
          // Debug: ดู status ของแต่ละ reservation
          console.log('🔍 [STATUS-DEBUG] Checking all statuses:')
          allReservations.forEach((reservation, index) => {
            console.log(`${index + 1}. ID: ${reservation.reservation_id}, Status: "${reservation.status}", Room: ${reservation.room_name}`)
          })
          
          // Debug: นับจำนวนแต่ละ status
          const statusCounts = {}
          allReservations.forEach(reservation => {
            const status = reservation.status
            statusCounts[status] = (statusCounts[status] || 0) + 1
          })
          console.log('📊 [STATUS-COUNTS]:', statusCounts)
          
          // Filter only current and future bookings (today and later)
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Set to start of today
          
          console.log('All Reservations:', allReservations) // Debug log
          
          // เก็บข้อมูลทั้งหมด (รวมการจองที่ผ่านมาแล้ว)
          setAllReservations(allReservations)  // ข้อมูลทั้งหมดรวม cancelled
          setReservations(allReservations)  // แสดงทั้งหมด (ไม่กรองตามวันที่)
          setStats(calculateStats(allReservations))
        } else {
          console.error('API returned error:', data.message)
          setReservations([])
        }
      } else {
        console.error('Failed to fetch user data:', response.status)
        setReservations([])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setReservations([])
    }
  }

  // เช็คว่าสามารถยกเลิกการจองได้หรือไม่
  const canCancelReservation = (reservation) => {
    try {
      console.log('🔍 [CANCEL-CHECK] Checking cancellation for:', {
        reservation_id: reservation.reservation_id,
        room_name: reservation.room_name,
        start_date: reservation.start_date,
        start_time: reservation.start_time,
        status: reservation.status
      })

      // สร้างวันที่และเวลาการจอง
      let reservationDateTime
      
      // ถ้า start_time เป็น ISO timestamp ให้ใช้ตรงๆ
      if (reservation.start_time && reservation.start_time.includes('T')) {
        reservationDateTime = new Date(reservation.start_time)
      } else {
        // ถ้าเป็นแบบแยกวันที่และเวลา
        let reservationDate
        
        if (typeof reservation.start_date === 'string') {
          reservationDate = new Date(reservation.start_date)
        } else {
          reservationDate = reservation.start_date
        }
        
        // เช็คว่าวันที่ valid หรือไม่
        if (isNaN(reservationDate.getTime())) {
          console.error('❌ [CANCEL-CHECK] Invalid date:', reservation.start_date)
          return false
        }
        
        // แยกเวลา (รองรับทั้งแบบ HH:mm และ ISO)
        let startHour, startMinute
        if (reservation.start_time.includes(':')) {
          [startHour, startMinute] = reservation.start_time.split(':').map(Number)
        } else {
          // ถ้าเป็น timestamp ให้แปลงก่อน
          const timeObj = new Date(reservation.start_time)
          startHour = timeObj.getHours()
          startMinute = timeObj.getMinutes()
        }
        
        // ตั้งเวลาการใช้งาน
        reservationDateTime = new Date(reservationDate)
        reservationDateTime.setHours(startHour, startMinute, 0, 0)
      }
      
      // เช็คว่า DateTime valid หรือไม่
      if (isNaN(reservationDateTime.getTime())) {
        console.error('❌ [CANCEL-CHECK] Invalid reservationDateTime')
        return false
      }
      
      // เวลาปัจจุบัน
      const now = new Date()
      
      const canCancel = now < reservationDateTime
      
      console.log('🔍 [CANCEL-CHECK] Time comparison:', {
        now: now.toLocaleString('th-TH'),
        reservationDateTime: reservationDateTime.toLocaleString('th-TH'),
        canCancel: canCancel,
        status: reservation.status,
        shouldShowButton: (reservation.status === 'approved' || reservation.status === 'อนุมัติแล้ว') && canCancel
      })
      
      // ยกเลิกได้ถ้ายังไม่ถึงเวลาใช้งาน
      return canCancel
    } catch (error) {
      console.error('❌ [CANCEL-CHECK] Error checking cancellation:', error)
      return false
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const initializeAuth = async () => {
      try {
        const userData = authUtils.getUserWithRole()
        
        if (!userData) {
          router.push('/login')
          return
        }

        setUser(userData)
        await loadUserData(userData)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      }
    }
    
    const timer = setTimeout(initializeAuth, 500)
    return () => clearTimeout(timer)
  }, [router])

  // Update filtered reservations when filter or reservations change
  useEffect(() => {
    setFilteredReservations(filterReservations(reservations, currentFilter))
  }, [reservations, allReservations, currentFilter])

  // Handle filter change
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter)
  }

  // Handle reservation actions
  const handleViewReservation = async (reservation) => {
    try {
      // ดึงข้อมูลรายละเอียดจาก API
      const response = await reservationAPI.getDetails(reservation.reservation_id)
      
      if (response.success) {
        // ใช้ข้อมูลจาก API ที่มีข้อมูลผู้อนุมัติ/ปฏิเสธและเหตุผล
        setSelectedReservation({
          ...reservation,
          approved_by: response.reservation.approval?.approved_by,
          rejected_reason: response.reservation.approval?.rejected_reason
        })
      } else {
        // ถ้าดึงข้อมูลไม่สำเร็จ ใช้ข้อมูลเดิม
        setSelectedReservation(reservation)
      }
      
      setIsClosingModal(false)
      setShowViewModal(true)
    } catch (error) {
      console.error('Error fetching reservation details:', error)
      // กรณี error ก็ใช้ข้อมูลเดิม
      setSelectedReservation(reservation)
      setIsClosingModal(false)
      setShowViewModal(true)
    }
  }

  const handleCloseModal = () => {
    setIsClosingModal(true)
    setTimeout(() => {
      setShowViewModal(false)
      setIsClosingModal(false)
      setSelectedReservation(null)
    }, 150) // ปิดเร็วๆ 150ms
  }

  const handleEditReservation = (reservation) => {
    // ไปยังหน้าแก้ไขการจองแยกต่างหาก
    router.push(`/edit-booking/${reservation.reservation_id}`)
  }

  const handleDeleteReservation = (reservation) => {
    setSelectedReservation(reservation)
    setShowDeleteModal(true)
  }

  const confirmDeleteReservation = async () => {
    if (!selectedReservation) return

    setIsDeleting(true)
    try {
      const response = await reservationAPI.cancel(selectedReservation.reservation_id)
      
      if (response && response.success) {
        // Show success animation
        showSuccessAnimation('✅ ยกเลิกการจองสำเร็จ')
        
        // Reload data
        const userData = authUtils.getUserWithRole()
        loadUserData(userData)

        // Close modal
        setShowDeleteModal(false)
        setSelectedReservation(null)
      } else {
        alert('❌ ไม่สามารถยกเลิกการจองได้')
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      alert('❌ เกิดข้อผิดพลาดในการยกเลิกการจอง')
    }
    setIsDeleting(false)
  }

  const showSuccessAnimation = (message) => {
    // สร้าง overlay สำหรับ backdrop พร้อม advanced blur effects 🎨
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-lg backdrop-saturate-150'
    overlay.style.cssText = `
      background: linear-gradient(135deg, 
        rgba(0, 0, 0, 0.4) 0%, 
        rgba(0, 0, 0, 0.2) 50%, 
        rgba(0, 0, 0, 0.3) 100%
      );
      animation: backdropFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    `

    // สร้าง success modal ตามธีมที่เพื่อนใช้
    const successDiv = document.createElement('div')
    successDiv.className = 'relative max-w-md w-full mx-4 overflow-hidden border-2 border-green-200 bg-white rounded-2xl shadow-2xl'
    successDiv.style.cssText = `
      animation: modalSlideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `
    
    successDiv.innerHTML = `
      <!-- Header สไตล์เดียวกับ Custom Alert -->
      <div style="
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1.5rem;
        margin: -0.5rem -0.5rem 1rem -0.5rem;
        position: relative;
        overflow: hidden;
      ">
        <!-- Animated Background Elements -->
        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
        "></div>
        <div style="
          position: absolute;
          top: 0;
          right: 0;
          width: 128px;
          height: 128px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          transform: translate(64px, -64px);
          animation: pulse 2s infinite;
        "></div>
        
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          z-index: 10;
        ">
          <span style="
            margin-right: 0.75rem;
            font-size: 2rem;
            animation: iconBounce 0.8s ease-out;
          ">🎉</span>
          <h3 style="
            font-size: 1.25rem;
            font-weight: bold;
            color: white;
            margin: 0;
            animation: textSlideIn 0.6s ease-out 0.2s both;
          ">สำเร็จ!</h3>
        </div>
      </div>
      
      <!-- Body Content -->
      <div style="
        padding: 0.5rem 1.5rem 1.5rem 1.5rem;
        text-align: center;
      ">
        <!-- Success Icon -->
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem auto;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
          animation: successIconScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both;
          position: relative;
        ">
          <svg style="width: 40px; height: 40px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
          
          <!-- Ripple Effects -->
          <div style="
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            border: 3px solid #10b981;
            animation: ripple 2s infinite;
            opacity: 0.6;
          "></div>
          <div style="
            position: absolute;
            inset: -16px;
            border-radius: 50%;
            border: 2px solid #34d399;
            animation: ripple 2s infinite 0.4s;
            opacity: 0.4;
          "></div>
        </div>
        
        <!-- Message -->
        <p style="
          color: #374151;
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0;
          animation: messageSlideUp 0.6s ease-out 0.5s both;
        ">${message.replace('✅ ', '')}</p>
      </div>
    `

    // เพิ่ม CSS keyframes ตามธีม
    const style = document.createElement('style')
    style.textContent = `
      @keyframes backdropFadeIn {
        from { 
          opacity: 0; 
          backdrop-filter: blur(0px) saturate(100%); 
        }
        to { 
          opacity: 1; 
          backdrop-filter: blur(16px) saturate(150%); 
        }
      }
      
      @keyframes backdropFadeOut {
        from { 
          opacity: 1; 
          backdrop-filter: blur(16px) saturate(150%); 
        }
        to { 
          opacity: 0; 
          backdrop-filter: blur(0px) saturate(100%); 
        }
      }
      
      @keyframes modalSlideIn {
        from {
          transform: scale(0.8) translateY(40px) rotate(2deg);
          opacity: 0;
        }
        to {
          transform: scale(1) translateY(0) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes modalSlideOut {
        from {
          transform: scale(1) translateY(0) rotate(0deg);
          opacity: 1;
        }
        to {
          transform: scale(0.8) translateY(40px) rotate(-2deg);
          opacity: 0;
        }
      }
      
      @keyframes iconBounce {
        0%, 20%, 53%, 80%, 100% {
          transform: scale(1) rotate(0deg);
        }
        40%, 43% {
          transform: scale(1.2) rotate(-5deg);
        }
        70% {
          transform: scale(1.1) rotate(3deg);
        }
        90% {
          transform: scale(1.05) rotate(-1deg);
        }
      }
      
      @keyframes textSlideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes successIconScale {
        from {
          transform: scale(0) rotate(-180deg);
          opacity: 0;
        }
        60% {
          transform: scale(1.15) rotate(10deg);
          opacity: 0.8;
        }
        to {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes messageSlideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes ripple {
        0% {
          transform: scale(1);
          opacity: 0.6;
        }
        50% {
          opacity: 0.3;
        }
        100% {
          transform: scale(1.8);
          opacity: 0;
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 0.4;
          transform: scale(1);
        }
        50% {
          opacity: 0.2;
          transform: scale(1.1);
        }
      }
    `
    document.head.appendChild(style)

    overlay.appendChild(successDiv)
    document.body.appendChild(overlay)

    // Auto close เร็วขึ้น (1.5 วินาที แทน 2.5 วินาที) และ animate out
    setTimeout(() => {
      overlay.style.animation = 'backdropFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
      successDiv.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
      
      setTimeout(() => {
        try {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay)
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style)
          }
        } catch (e) {
          console.log('Cleanup already done')
        }
      }, 400)
    }, 1500) // ลดจาก 2500ms เหลือ 1500ms

    // ปิดเมื่อคลิก overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.animation = 'backdropFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
        successDiv.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
        
        setTimeout(() => {
          try {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay)
            }
            if (document.head.contains(style)) {
              document.head.removeChild(style)
            }
          } catch (e) {
            console.log('Cleanup already done')
          }
        }, 400)
      }
    })
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="text-4xl mr-3">📋</span>
            ประวัติการจองของฉัน
          </h1>
          <p className="text-gray-600">จัดการและติดตามสถานะการจองห้องประชุมของคุณ</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <h3 className="text-xs font-semibold text-gray-700">ทั้งหมด</h3>
              <p className="text-xl font-bold text-blue-600">{stats.total_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-yellow-500">
            <div className="text-center">
              <div className="text-2xl mb-1">⏳</div>
              <h3 className="text-xs font-semibold text-gray-700">รออนุมัติ</h3>
              <p className="text-xl font-bold text-yellow-600">{stats.pending_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-green-500">
            <div className="text-center">
              <div className="text-2xl mb-1">✅</div>
              <h3 className="text-xs font-semibold text-gray-700">อนุมัติแล้ว</h3>
              <p className="text-xl font-bold text-green-600">{stats.approved_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-red-500">
            <div className="text-center">
              <div className="text-2xl mb-1">❌</div>
              <h3 className="text-xs font-semibold text-gray-700">ปฏิเสธ</h3>
              <p className="text-xl font-bold text-red-600">{stats.rejected_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-purple-500 col-span-2 sm:col-span-1">
            <div className="text-center">
              <div className="text-2xl mb-1">📅</div>
              <h3 className="text-xs font-semibold text-gray-700">เดือนนี้</h3>
              <p className="text-xl font-bold text-purple-600">{stats.this_month_bookings}</p>
            </div>
          </div>
        </div>

        {/* My Reservations Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="text-2xl mr-3">📋</span>
                การจองทั้งหมด
              </h2>
              <div className="text-sm text-gray-600">
                ทั้งหมด {stats.total_bookings} รายการ
              </div>
            </div>
          </div>

          {/* Filter Tabs Section */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">กรองตามสถานะ</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                onClick={() => handleFilterChange('all')}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  currentFilter === 'all'
                    ? 'bg-blue-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">📊</div>
                <div className="text-xs font-medium">ทั้งหมด</div>
                <div className="text-sm font-bold">({stats.total_bookings})</div>
              </button>

              <button
                onClick={() => handleFilterChange('pending')}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  currentFilter === 'pending'
                    ? 'bg-yellow-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">⏳</div>
                <div className="text-xs font-medium">รออนุมัติ</div>
                <div className="text-sm font-bold">({stats.pending_bookings})</div>
              </button>

              <button
                onClick={() => handleFilterChange('approved')}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  currentFilter === 'approved'
                    ? 'bg-green-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">✅</div>
                <div className="text-xs font-medium">อนุมัติแล้ว</div>
                <div className="text-sm font-bold">({stats.approved_bookings})</div>
              </button>

              <button
                onClick={() => handleFilterChange('rejected')}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  currentFilter === 'rejected'
                    ? 'bg-red-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">❌</div>
                <div className="text-xs font-medium">ปฏิเสธ</div>
                <div className="text-sm font-bold">({stats.rejected_bookings})</div>
              </button>

              <button
                onClick={() => handleFilterChange('cancelled')}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  currentFilter === 'cancelled'
                    ? 'bg-red-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">🚫</div>
                <div className="text-xs font-medium">ยกเลิกการจองผู้ใช้</div>
                <div className="text-sm font-bold">({allReservations.filter(r => r.status === 'ยกเลิก' || r.status === 'ยกเลิกแล้ว' || r.status === 'cancelled').length})</div>
              </button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            {filteredReservations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>ไม่มีข้อมูลการจองในหมวดหมู่นี้</p>
              </div>
            ) : (
              paginatedReservations.map((reservation) => (
                <div key={reservation.reservation_id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-3">
                      <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={reservation.room_name}>
                        {reservation.room_name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate" title={reservation.department}>
                        {reservation.department}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">📅 วันที่จอง:</span>
                      <span className="text-gray-900 text-xs">{formatDateTime(reservation.created_at)}</span>
                    </div>
                    {(() => {
                      const dateInfo = formatDetailedDateRange(reservation)
                      if (dateInfo.single) {
                        return (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">🗓️ วันที่:</span>
                            <span className="text-gray-900">{dateInfo.bookingDates}</span>
                          </div>
                        )
                      } else {
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-gray-600 font-medium">📅 วันที่จอง:</span>
                              <span className="text-gray-900 text-right max-w-[160px] text-xs">{dateInfo.bookingDates}</span>
                            </div>
                            <div className="flex justify-between items-center pl-4">
                              <span className="text-gray-500 text-sm">� วันที่เริ่มใช้:</span>
                              <span className="text-gray-700 text-sm">{dateInfo.startDate}</span>
                            </div>
                            <div className="flex justify-between items-center pl-4">
                              <span className="text-gray-500 text-sm">🏁 วันที่สิ้นสุด:</span>
                              <span className="text-gray-700 text-sm">{dateInfo.endDate}</span>
                            </div>
                          </div>
                        )
                      }
                    })()}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">⏰ เวลาใช้:</span>
                      <span className="text-gray-900">{formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600 font-medium">📝 รายละเอียด:</span>
                      <span className="text-gray-900 text-right max-w-[160px] break-words">{reservation.details}</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => handleViewReservation(reservation)}
                      className="text-blue-600 hover:text-blue-800 transition-colors duration-150 text-sm"
                      title="ดูข้อมูล"
                    >
                      📄 ดูข้อมูล
                    </button>
                    {(reservation.status === 'pending' || reservation.status === 'รออนุมัติ') && (
                      <>
                        <button
                          onClick={() => handleEditReservation(reservation)}
                          className="text-green-600 hover:text-green-800 transition-colors duration-150 text-sm"
                          title="แก้ไข"
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteReservation(reservation)}
                          className="text-red-600 hover:text-red-800 transition-colors duration-150 text-sm"
                          title="ยกเลิก"
                        >
                          🗑️ ลบ
                        </button>
                      </>
                    )}
                    {(reservation.status === 'approved' || reservation.status === 'อนุมัติแล้ว') && canCancelReservation(reservation) && (
                      <button
                        onClick={() => handleDeleteReservation(reservation)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-150 text-sm"
                        title="ยกเลิกการจอง"
                      >
                        🗑️ ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View with Pagination */}
          <div className="hidden lg:block border border-gray-200 rounded-lg overflow-hidden">
            {filteredReservations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>ไม่มีข้อมูลการจองในหมวดหมู่นี้</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      ห้องประชุม
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      วันที่ทำการจอง
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      วันที่ใช้
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      วันที่สิ้นสุด
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      เวลาใช้
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      สถานะ
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      รายละเอียด
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedReservations.map((reservation) => (
                    <tr key={reservation.reservation_id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-900 leading-tight max-w-[150px] truncate" title={reservation.room_name}>
                          {reservation.room_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={reservation.department}>
                          {reservation.department}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(reservation.created_at)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(reservation.start_date)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(reservation.end_date)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900 whitespace-nowrap">
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900 max-w-[160px] truncate" title={reservation.details}>
                          {reservation.details}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-center space-x-3">
                          <button 
                            onClick={() => handleViewReservation(reservation)}
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-150 text-sm"
                            title="ดูข้อมูล"
                          >
                            📄 ดู
                          </button>
                          {(reservation.status === 'pending' || reservation.status === 'รออนุมัติ') && (
                            <>
                              <button
                                onClick={() => handleEditReservation(reservation)}
                                className="text-green-600 hover:text-green-800 transition-colors duration-150 text-sm"
                                title="แก้ไข"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button
                                onClick={() => handleDeleteReservation(reservation)}
                                className="text-red-600 hover:text-red-800 transition-colors duration-150 text-sm"
                                title="ยกเลิก"
                              >
                                🗑️ ลบ
                              </button>
                            </>
                          )}
                          {(reservation.status === 'approved' || reservation.status === 'อนุมัติแล้ว') && canCancelReservation(reservation) && (
                            <button
                              onClick={() => handleDeleteReservation(reservation)}
                              className="text-red-600 hover:text-red-800 transition-colors duration-150 text-sm"
                              title="ยกเลิกการจอง"
                            >
                              🗑️ ยกเลิก
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                  </table>
                </div>
                
                {/* Pagination inside the same container */}
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                  <Pagination />
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* View Reservation Modal */}
      {showViewModal && selectedReservation && (
        <ReservationDetailModal 
          reservation={selectedReservation}
          isOpen={showViewModal}
          onClose={handleCloseModal}
          onEdit={() => {
            handleCloseModal()
            setTimeout(() => handleEditReservation(selectedReservation), 200)
          }}
          onDelete={() => {
            handleCloseModal()
            setTimeout(() => handleDeleteReservation(selectedReservation), 200)
          }}
        />
      )}

      {/* Edit Reservation Modal */}
      {showEditModal && selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          onClose={() => {
            setShowEditModal(false)
            setSelectedReservation(null)
          }}
          onSave={(updatedReservation) => {
            const userData = authUtils.getUserWithRole()
            loadUserData(userData)
            setShowEditModal(false)
            setSelectedReservation(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReservation && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <span className="text-red-600 text-2xl">🗑️</span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันการยกเลิก</h3>
                <p className="text-gray-600 mb-4">
                  คุณต้องการยกเลิกการจองห้องประชุม <br />
                  <strong 
                    className="block truncate max-w-full mx-auto mt-1" 
                    title={selectedReservation.room_name}
                    style={{ maxWidth: '250px' }}
                  >
                    {selectedReservation.room_name?.length > 20 
                      ? selectedReservation.room_name.slice(0, 20) + '...' 
                      : selectedReservation.room_name}  <span>ใช่หรือไม่?</span>   
                  </strong>        
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedReservation(null)
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDeleteReservation}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังลบ...
                    </>
                  ) : (
                    '🗑️ ยืนยันลบ'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
