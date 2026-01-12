'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { calendarAPI, authUtils, reservationAPI, roomAPI } from '@/lib/fetchData'
import { debugLog } from '@/utils/debug'
import AlertModal from '@/components/ui/alert-modal'
// import { toast } from 'sonner' // ไม่ใช้ toast แล้ว

// =============================================
// UTILITY COMPONENTS
// =============================================

function SimpleCustomSelect({ value, onChange, options, className, placeholder, required, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSelect = (selectedValue) => {
    onChange(selectedValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
    }
  }

  // ✨ ปรับปรุงการค้นหาให้ smart และแม่นยำขึ้น
  const smartSearch = (searchTerm, optionLabel) => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase().trim()
    const label = optionLabel.toLowerCase()

    // 1. ค้นหาแบบ exact match ก่อน (ให้ความสำคัญสูงสุด)
    if (label.includes(search)) {
      return true
    }

    // 2. ลบคำที่ไม่จำเป็นและค้นหา
    const cleanSearch = search
      .replace(/ห้อง/g, '')
      .replace(/ประชุม/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (cleanSearch && cleanSearch.length >= 2 && label.includes(cleanSearch)) {
      return true
    }

    // 3. แยกคำค้นหา - ต้องมีทุกคำที่สำคัญ
    const searchWords = search.split(/\s+/).filter(word => word.length >= 2)
    if (searchWords.length > 1) {
      // ต้องมีคำสำคัญอย่างน้อย 70% ของคำค้นหา
      const importantWords = searchWords.filter(word =>
        !['ห้อง', 'ประชุม'].includes(word)
      )

      if (importantWords.length > 0) {
        const matchCount = importantWords.filter(word => label.includes(word)).length
        const matchRatio = matchCount / importantWords.length

        if (matchRatio >= 0.7) {
          return true
        }
      }
    }

    return false
  }

  // Filter options based on smart search - เฉพาะห้องประชุม
  const filteredOptions = placeholder?.includes('ห้อง')
    ? options.filter(option => smartSearch(searchTerm, option.label))
    : options // สำหรับเลือกเวลา ไม่ต้องกรอง

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={handleToggle}
        className={className}
        required={required}
      >
        <span className="block truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Search Input - เฉพาะสำหรับห้องประชุม */}
          {placeholder?.includes('ห้อง') && (
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 ค้นหาห้องประชุม..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900 placeholder-gray-500 bg-white"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 ${index === 0 ? '' : ''
                    } ${index === filteredOptions.length - 1 ? 'rounded-b-xl' : ''
                    } ${value === option.value ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-900'
                    }`}
                >
                  <span className={`${value === option.value ? 'text-green-800' : 'text-gray-900'}`}>
                    {option.label}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <span className="text-2xl mb-2 block">🔍</span>
                <p>ไม่พบห้องประชุมที่ตรงกับ "{searchTerm}"</p>
                <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตรวจสอบการสะกด</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="text-center">
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">กำลังโหลด...</p>
      </div>
    </div>
  )
}

export default function EditBookingPage({ params }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const bookingId = resolvedParams.id

  // State management
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [existingBooking, setExistingBooking] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedDates, setSelectedDates] = useState([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [purpose, setPurpose] = useState('')

  // Alert modal
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  })

  // Calendar modal states
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalAnimation, setModalAnimation] = useState('enter')
  const [showTimeDetails, setShowTimeDetails] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState(null)

  // Helper functions for calendar modal
  const getDayData = (day) => {
    if (!day || !calendarData || !calendarData.calendar || !calendarData.calendar.daily_availability) {
      return null
    }

    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return calendarData.calendar.daily_availability.find(d => d.date === dateStr) || null
  }

  const calculateDayColor = (dayData) => {
    if (!dayData || !dayData.slots) {
      return { color: '#10B981', text: 'ว่างทั้งวัน' }
    }

    const slots = dayData.slots
    const availableSlots = slots.filter(slot => !slot.reservations || slot.reservations.length === 0).length
    const totalSlots = slots.length

    if (totalSlots === 0 || availableSlots === totalSlots) {
      return { color: '#10B981', text: 'ว่างทั้งวัน' }
    } else if (availableSlots === 0) {
      return { color: '#EF4444', text: 'เต็มทั้งวัน' }
    } else {
      return { color: '#F59E0B', text: 'ว่างบางช่วง' }
    }
  }

  // Generate calendar days for modal
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }

  const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth])

  // Load calendar data when modal opens
  useEffect(() => {
    if (showCalendarModal && selectedRoom) {
      const fetchCalendarData = async () => {
        try {
          const month = currentMonth.getMonth() + 1
          const year = currentMonth.getFullYear()

          const result = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, month, year, {
            timestamp: Date.now(),
            source: 'edit-booking-modal',
            forceRefresh: true,
            _cache_bust: Math.random()
          })

          setCalendarData(result)
        } catch (error) {
          console.error('❌ Error fetching calendar data:', error)
        }
      }

      fetchCalendarData()
    }
  }, [showCalendarModal, selectedRoom, currentMonth])

  // Load existing booking data
  const loadBookingData = async () => {
    try {
      setLoading(true)

      // ตรวจสอบ auth
      const userData = authUtils.getUserWithRole()
      if (!userData) {
        router.push('/login')
        return
      }
      setUser(userData)

      // โหลดข้อมูลการจองเดิม
      const bookingResponse = await reservationAPI.getById(bookingId)

      if (!bookingResponse?.success || !bookingResponse.reservation) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'ข้อผิดพลาด',
          message: 'ไม่พบข้อมูลการจองที่ต้องการแก้ไข',
          onConfirm: () => router.push('/my-reservations')
        })
        return
      }

      const booking = bookingResponse.reservation
      setExistingBooking(booking)

      // Backend จะตรวจสอบสิทธิ์ให้อยู่แล้ว ถ้าไม่ใช่เจ้าของจะได้ 403 error

      // ตรวจสอบสถานะการจอง - รองรับทั้งภาษาอังกฤษและไทย
      const isPendingStatus = booking.booking_details.status === 'pending' || booking.booking_details.status === 'รออนุมัติ'
      if (!isPendingStatus) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'ไม่สามารถแก้ไขได้',
          message: `ไม่สามารถแก้ไขการจองที่มีสถานะ "${booking.booking_details.status}" ได้\nสามารถแก้ไขได้เฉพาะการจองที่มีสถานะ "รออนุมัติ" เท่านั้น`,
          onConfirm: () => router.push('/my-reservations')
        })
        return
      }

      // โหลดข้อมูลห้องทั้งหมด
      console.log('Loading rooms...')
      const roomsResponse = await roomAPI.getAll()
      console.log('Rooms response:', roomsResponse)

      if (roomsResponse?.success && roomsResponse.rooms) {
        console.log('Setting rooms:', roomsResponse.rooms)
        setRooms(roomsResponse.rooms)

        // หาห้องที่ถูกจองเดิม (ใช้ชื่อห้องในการค้นหา)
        console.log('Looking for room:', booking.room?.room_name)
        console.log('Available room names:', roomsResponse.rooms.map(r => r.room_name))

        const originalRoom = roomsResponse.rooms.find(room =>
          room.room_name === booking.room?.room_name ||
          room.room_id === booking.room?.room_id
        )
        console.log('Original room found:', originalRoom)

        if (originalRoom) {
          setSelectedRoom(originalRoom)
        } else {
          // ถ้าไม่เจอ ลองใช้ห้องแรก
          console.log('Room not found, using first room as fallback')
          setSelectedRoom(roomsResponse.rooms[0])
        }
      } else {
        console.error('Failed to load rooms:', roomsResponse)
      }

      // ตั้งค่าข้อมูลเดิมในฟอร์ม - ใช้วันที่จริงที่ผู้ใช้เลือกไว้
      let dates = []
      
      console.log('🔍 Raw booking data:', booking.booking_details)
      
      // ตรวจสอบว่าใน booking มี booking_dates หรือไม่ (สำหรับ multi-day non-consecutive)
      if (booking.booking_details.booking_dates && booking.booking_details.booking_dates.trim()) {
        // ใช้วันที่ที่ผู้ใช้เลือกไว้จริงๆ
        console.log('🔍 Found booking_dates:', booking.booking_details.booking_dates)
        dates = booking.booking_details.booking_dates
          .split(',')
          .map(dateStr => dateStr.trim())
          .filter(Boolean)
          .map(dateStr => {
            const date = new Date(dateStr)
            return date.toISOString().split('T')[0]
          })
      } else {
        // สำหรับการจองแบบวันเดียว - ใช้เฉพาะ start_date
        console.log('🔍 No booking_dates found, using single date from start_at')
        const startDate = new Date(booking.booking_details.start_at)
        dates = [startDate.toISOString().split('T')[0]]
      }

      setSelectedDates(dates)
      console.log('🔍 Setting selectedDates (corrected):', dates)
      console.log('🔍 Expected dates count:', dates.length)

      // ✅ แปลงเวลาให้เป็นรูปแบบ HH:00 (เช่น 10:30 -> 10:00)
      const originalStartTime = booking.booking_details.start_time
      const originalEndTime = booking.booking_details.end_time

      console.log('Original times from DB:', { originalStartTime, originalEndTime })

      // แปลงเวลาให้เป็นรูปแบบชั่วโมง (HH:00)
      const formatTimeToHourly = (timeStr) => {
        if (!timeStr) return ''

        // ถ้าเป็น ISO datetime format
        if (timeStr.includes('T')) {
          const date = new Date(timeStr)
          const hour = date.getHours()
          return `${hour.toString().padStart(2, '0')}:00`
        }

        // ถ้าเป็น time format แล้ว
        const hour = timeStr.split(':')[0]
        return `${hour.padStart(2, '0')}:00`
      }

      const formattedStartTime = formatTimeToHourly(originalStartTime)
      const formattedEndTime = formatTimeToHourly(originalEndTime)

      console.log('Formatted times for dropdown:', { formattedStartTime, formattedEndTime })

      setStartTime(formattedStartTime)
      setEndTime(formattedEndTime)
      setPurpose(booking.booking_details.details || '')

    } catch (error) {
      debugLog.error('Error loading booking data:', error)
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง',
        onConfirm: () => router.push('/my-reservations')
      })
    } finally {
      await new Promise(resolve => setTimeout(resolve, 150)) // Loading delay
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (bookingId) {
      loadBookingData()
    }
  }, [bookingId])

  // Handle date selection (toggle)
  const handleDateSelect = useCallback((dateStr) => {
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(date => date !== dateStr)
      } else {
        return [...prev, dateStr].sort()
      }
    })

    // รีเซ็ตเวลาเมื่อเปลี่ยนวันที่
    setStartTime('')
    setEndTime('')
  }, [])

  // Handle day click for popup (จากหน้า Reserve)
  const handleDayClick = useCallback(async (day) => {
    if (!day || !selectedRoom) return

    try {
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()

      const detailedResult = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, month, year, {
        timestamp: Date.now(),
        source: 'edit-booking-day-click',
        forceRefresh: true,
        _cache_bust: Math.random()
      })

      setCalendarData(detailedResult)

      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      let dayData = null

      if (detailedResult?.calendar?.daily_availability) {
        dayData = detailedResult.calendar.daily_availability.find(d => d.date === dateStr)
      }

      const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      setSelectedDate({ date: clickedDate, dayData })
      setModalAnimation('entering') // เริ่มต้นด้วย entering state

      console.log('🔍 Setting selectedDate:', {
        clickedDate,
        dayData,
        selectedDateObj: { date: clickedDate, dayData }
      })

      // ให้ DOM render ก่อน จากนั้นค่อยเริ่ม animation
      setTimeout(() => {
        setModalAnimation('enter')
      }, 50)
    } catch (error) {
      console.error('❌ Error fetching detailed calendar:', error)
    }
  }, [currentMonth, selectedRoom])

  // Close modal with animation
  const closeModal = useCallback(() => {
    setModalAnimation('exit')
    setTimeout(() => {
      setSelectedDate(null)
      setModalAnimation('enter')
    }, 500)
  }, [])

  // Handle form submission
  const handleSubmit = async () => {
    console.log('🔍 Submit validation check:', {
      selectedRoom: selectedRoom?.room_name,
      selectedRoom_id: selectedRoom?.room_id,
      selectedDates: selectedDates,
      selectedDates_length: selectedDates.length,
      startTime,
      endTime,
      purpose: purpose?.slice(0, 20) + '...'
    })

    // Validation
    if (!selectedRoom) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาเลือกห้องประชุม'
      })
      return
    }

    if (selectedDates.length === 0) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาเลือกวันที่'
      })
      return
    }

    if (!startTime || !endTime) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุด'
      })
      return
    }

    if (!purpose.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาระบุวัตถุประสงค์การจอง'
      })
      return
    }
        // Validation passed, proceed to submit
    try {
      setSubmitting(true)

      // 🚨 ขั้นตอนที่ 1: ตรวจสอบความพร้อมของทุกวันก่อนแก้ไขจริง (Copy จากหน้า Reserve)
      console.log('🔍 [EDIT-BOOKING] กำลังตรวจสอบความพร้อมของทุกวัน...')

      let token = authUtils.getToken()
      if (!token) {
        token = localStorage.getItem('token')
      }

      const conflictDates = []

      for (const date of selectedDates) {
        // ดึงข้อมูลปฏิทินสำหรับวันที่นั้น
        const dateObj = new Date(date)
        const month = dateObj.getMonth() + 1
        const year = dateObj.getFullYear()

        console.log(`🔍 [EDIT-BOOKING] ตรวจสอบวันที่ ${date}, room ${selectedRoom.room_id}`)

        try {
          const calendarResponse = await fetch(
            `/api/reservations/calendar/${selectedRoom.room_id}?month=${month}&year=${year}&detailed=true`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          )

          console.log(`📡 [EDIT-BOOKING] Calendar API response: ${calendarResponse.status}`)

          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json()
            console.log(`📊 [EDIT-BOOKING] Calendar data for ${date}:`, calendarData)

            // หาข้อมูลวันที่เฉพาะ
            const targetDateStr = date // format: "2025-08-18"
            let dayData = null

            if (calendarData.calendar?.daily_availability) {
              dayData = calendarData.calendar.daily_availability.find(d => d.date === targetDateStr)
              console.log(`📅 [EDIT-BOOKING] Day data for ${targetDateStr}:`, dayData)
            }

            if (dayData && dayData.slots) {
              // ตรวจสอบว่าช่วงเวลาที่เลือกว่างไหม
              const [startHour, startMinute] = startTime.split(':').map(Number)
              const [endHour, endMinute] = endTime.split(':').map(Number)

              console.log(`⏰ [EDIT-BOOKING] ตรวจสอบเวลา ${startHour}:00-${endHour}:00`)

              // หา slot ที่ตรงกับเวลาที่เลือก และเก็บเวลาที่ชนกัน
              const conflictingSlots = []
              
              dayData.slots.forEach(slot => {
                if (!slot.start_time || !slot.end_time) return

                const slotStartHour = parseInt(slot.start_time.split(':')[0])
                const slotEndHour = parseInt(slot.end_time.split(':')[0])

                console.log(`🔎 [EDIT-BOOKING] Checking slot ${slotStartHour}:00-${slotEndHour}:00, available: ${slot.available}`)

                // ตรวจสอบว่าเวลาทับซ้อนและ slot ไม่ว่าง
                const timeOverlap = (startHour < slotEndHour) && (slotStartHour < endHour)
                
                // 🔥 สำคัญ: ถ้า slot มีการจองที่เป็นการจองเดิมของเรา (excludeReservationId) ให้ถือว่าไม่ conflict
                let isOwnReservation = false
                
                // 🔍 Debug: ตรวจสอบข้อมูล slot reservations
                console.log(`🔍 [EDIT-BOOKING-DEBUG] Slot reservations data:`, {
                  slotTime: `${slotStartHour}:00-${slotEndHour}:00`,
                  hasReservations: !!slot.reservations,
                  reservationsLength: slot.reservations?.length || 0,
                  reservations: slot.reservations,
                  bookingId: bookingId,
                  timeOverlap
                })
                
                if (slot.reservations && slot.reservations.length > 0) {
                  isOwnReservation = slot.reservations.some(res => {
                    const isOwn = res.reservation_id == bookingId
                    console.log(`🔍 [EDIT-BOOKING-DEBUG] Checking reservation:`, {
                      resId: res.reservation_id,
                      bookingId: bookingId,
                      isOwn: isOwn
                    })
                    return isOwn
                  })
                }
                
                console.log(`🔍 [EDIT-BOOKING-DEBUG] Final check:`, {
                  timeOverlap,
                  slotAvailable: slot.available,
                  isOwnReservation,
                  willHaveConflict: timeOverlap && !slot.available && !isOwnReservation
                })
                
                const conflict = timeOverlap && !slot.available && !isOwnReservation

                if (conflict) {
                  console.log(`⚠️ [EDIT-BOOKING] Conflict detected! Slot ${slotStartHour}:00-${slotEndHour}:00 is not available`)
                  // เก็บเวลาที่จองแล้วจริงๆ (ไม่ใช่เวลาที่ user ขอจอง)
                  conflictingSlots.push({
                    start: slot.start_time,
                    end: slot.end_time
                  })
                }
              })
              
              const hasConflict = conflictingSlots.length > 0

              if (hasConflict) {
                console.log(`❌ [EDIT-BOOKING] วันที่ ${date} มีการจองซ้อน`)
                // แสดงเวลาที่จองจริงๆ (ไม่ใช่เวลาที่ user ขอจอง) และตัดวินาทีออก
                const conflictTimeRanges = conflictingSlots.map(s => 
                  `${s.start.substring(0, 5)}-${s.end.substring(0, 5)}`
                ).join(', ')
                
                conflictDates.push({
                  date: date,
                  dateLabel: dateObj.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                  }),
                  time: conflictTimeRanges,
                  error: 'มีการจองแล้ว'
                })
              } else {
                console.log(`✅ [EDIT-BOOKING] วันที่ ${date} ยังว่าง`)
              }
            } else {
              console.log(`📭 [EDIT-BOOKING] ไม่มีข้อมูล slots สำหรับวันที่ ${date}`)
            }
          } else {
            console.error(`❌ [EDIT-BOOKING] Calendar API failed: ${calendarResponse.status}`)
            // ถ้า API ล้มเหลว ให้ถือว่ามี conflict เพื่อความปลอดภัย (ไม่ให้แก้ไข)
            conflictDates.push({
              date: date,
              dateLabel: dateObj.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short'
              }),
              time: `${startTime}-${endTime}`,
              error: 'ไม่สามารถตรวจสอบความพร้อมได้'
            })
          }
        } catch (error) {
          console.error(`❌ [EDIT-BOOKING] Error checking date ${date}:`, error)
          // Network error - ถือว่ามี conflict เพื่อความปลอดภัย (ไม่ให้แก้ไข)
          conflictDates.push({
            date: date,
            dateLabel: dateObj.toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short'
            }),
            time: `${startTime}-${endTime}`,
            error: 'ไม่สามารถตรวจสอบความพร้อมได้'
          })
        }
      }

      // 🚨 ถ้ามีวันที่ขัดแย้ง แสดง Alert และหยุดการแก้ไข (Copy จากหน้า Reserve)
      if (conflictDates.length > 0) {
        console.log('❌ [EDIT-BOOKING] พบความขัดแย้ง:', conflictDates)

        // สร้างข้อความแสดงความขัดแย้งแบบเรียบง่าย
        let conflictMessage = ''

        if (conflictDates.length === 1) {
          const conflict = conflictDates[0]

          if (conflict.error.includes('มีการจองแล้ว')) {
            conflictMessage = `วันที่ ${conflict.dateLabel} เวลา ${conflict.time} มีการจองแล้ว\n\nกรุณาเลือกเวลาใหม่`
          } else {
            conflictMessage = `ไม่สามารถตรวจสอบความพร้อมของวันที่ ${conflict.dateLabel} ได้\n\nกรุณาลองใหม่อีกครั้ง`
          }
        } else {
          // หลายวัน - แสดงเหมือนวันเดียว แยกแต่ละวัน เรียงบรรทัด
          const bookedDates = conflictDates.filter(c => c.error.includes('มีการจองแล้ว'))
          const errorDates = conflictDates.filter(c => !c.error.includes('มีการจองแล้ว'))

          if (bookedDates.length > 0) {
            // แสดงวันที่มีการจองแล้วแต่ละวัน แยกบรรทัด
            bookedDates.forEach((conflict, index) => {
              conflictMessage += `วันที่ ${conflict.dateLabel} เวลา ${conflict.time} มีการจองแล้ว\n`
            })
            conflictMessage += '\nกรุณาเลือกเวลาใหม่'

            if (errorDates.length > 0) {
              conflictMessage += `\n\n(และไม่สามารถตรวจสอบวันที่อื่นได้)`
            }
          } else {
            conflictMessage = `ไม่สามารถตรวจสอบความพร้อมได้\n\nกรุณาลองใหม่อีกครั้ง`
          }
        }

        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'ไม่สามารถแก้ไขได้',
          message: conflictMessage
        })

        setSubmitting(false)
        return
      }

      // 🎉 ขั้นตอนที่ 2: ถ้าทุกวันผ่านการตรวจสอบแล้ว จึงแก้ไขจริง
      console.log('✅ [EDIT-BOOKING] ทุกวันพร้อมแก้ไข เริ่มการแก้ไขจริง...')

      // สร้าง DateTime objects ที่ถูก timezone (แบบ local time)
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)
      
      // สร้าง Date แบบ local time (ไม่ใช่ UTC)
      const startDateString = selectedDates[0] // "2025-09-12"
      const endDateString = selectedDates[selectedDates.length - 1] // "2025-09-15"
      const startTimeString = `${startDateString}T${startTime}:00` // "2025-09-12T08:00:00"
      const endTimeString = `${endDateString}T${endTime}:00`     // "2025-09-15T09:00:00"

      // สร้าง booking_dates สำหรับ multi-day booking
      const bookingDates = selectedDates.length > 1 ? selectedDates.join(',') : null

      const updateData = {
        room_id: selectedRoom.room_id,
        start_at: selectedDates[0],
        end_at: selectedDates[selectedDates.length - 1],
        start_time: startTimeString,
        end_time: endTimeString,
        details_r: purpose.trim(),
        booking_dates: bookingDates // เพิ่มข้อมูลวันที่ที่เลือกไว้
      }

      console.log('📤 Update data being sent:', updateData)

      const response = await reservationAPI.update(bookingId, updateData)

      if (response?.success) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'แก้ไขการจองสำเร็จ!',
          message: `แก้ไขการจอง ${selectedRoom.room_name} เรียบร้อยแล้ว`,
          onConfirm: () => {
            // เพิ่ม timestamp เพื่อ force refresh ข้อมูล
            router.push(`/my-reservations?refresh=${Date.now()}`)
          }
        })
      } else {
        throw new Error(response?.message || 'เกิดข้อผิดพลาดในการแก้ไขการจอง')
      }

    } catch (error) {
      debugLog.error('Error updating booking:', error)
      
      let errorTitle = 'เกิดข้อผิดพลาด'
      let errorMessage = 'เกิดข้อผิดพลาดในการแก้ไขการจอง'

      // 🔍 ตรวจสอบ error type เบื้องต้น (เนื่องจากเราตรวจสอบ conflict ข้างต้นแล้ว)
      if (error.message?.includes('401')) {
        errorTitle = 'Session หมดอายุ'
        errorMessage = 'กรุณาเข้าสู่ระบบใหม่'
      } else if (error.message?.includes('409') || error.message?.includes('ซ้อนทับ') || error.message?.includes('จองซ้อน')) {
        errorTitle = 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
        errorMessage = 'ระบบตรวจพบการจองซ้อนทับหลังจากการตรวจสอบ\n\nอาจมีคนอื่นจองไปพร้อมกัน กรุณาลองใหม่อีกครั้ง'
      }

      setAlertModal({
        isOpen: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const canSubmit = selectedRoom && selectedDates.length > 0 && startTime && endTime && purpose.trim() && !submitting

  // Debug log for canSubmit
  console.log('🔍 canSubmit check:', {
    hasSelectedRoom: !!selectedRoom,
    selectedRoom_name: selectedRoom?.room_name,
    selectedDates_length: selectedDates.length,
    selectedDates: selectedDates,
    hasStartTime: !!startTime,
    startTime,
    hasEndTime: !!endTime,
    endTime,
    hasPurpose: !!purpose.trim(),
    purpose: purpose?.slice(0, 20),
    submitting,
    canSubmit
  })

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes modal-bounce {
            0% { transform: scale(0.8) translateY(100px); opacity: 0; }
            50% { transform: scale(1.05) translateY(-10px); opacity: 0.8; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          
          @keyframes smooth-entrance {
            0% { 
              opacity: 0; 
              transform: scale(0.85) translateY(30px) rotate(1deg);
              filter: blur(10px);
            }
            50% { 
              opacity: 0.7; 
              transform: scale(0.95) translateY(10px) rotate(0.5deg);
              filter: blur(5px);
            }
            100% { 
              opacity: 1; 
              transform: scale(1) translateY(0) rotate(0deg);
              filter: blur(0);
            }
          }
          
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
          .animate-modal-bounce { animation: modal-bounce 0.8s ease-out; }
          .animate-smooth-entrance { animation: smooth-entrance 0.8s ease-out forwards; }
          .delay-100 { animation-delay: 0.1s; }
          .delay-200 { animation-delay: 0.2s; }
          .delay-300 { animation-delay: 0.3s; }
          .delay-400 { animation-delay: 0.4s; }
          .delay-500 { animation-delay: 0.5s; }
        `
      }} />



      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <span className="text-3xl mr-3">✏️</span>
                แก้ไขการจอง
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                แก้ไขข้อมูลการจองห้องประชุมของคุณ
              </p>
            </div>
            <button
              onClick={() => router.push('/my-reservations')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center"
            >
              ← กลับ
            </button>
          </div>
        </div>

        {existingBooking && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📋</span>
              ข้อมูลการจองเดิม
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-gray-700">
              <div className="bg-white/80 p-3 rounded-lg border border-gray-100 min-w-0">
                <span className="font-bold text-gray-900 text-base">ห้อง</span>
                <p className="mt-1 text-gray-800 font-medium truncate" title={existingBooking.room?.room_name}>
                  {existingBooking.room?.room_name}
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 text-base">วันที่เริ่มต้น</span>
                <p className="mt-1 text-gray-800 font-medium">{new Date(existingBooking.booking_details?.start_at).toLocaleDateString('th-TH')}</p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 text-base">วันที่สิ้นสุด</span>
                <p className="mt-1 text-gray-800 font-medium">{new Date(existingBooking.booking_details?.end_at).toLocaleDateString('th-TH')}</p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 text-base">เวลา</span>
                <p className="mt-1 text-gray-800 font-medium">{
                  (() => {
                    const startTime = existingBooking.booking_details?.start_time;
                    const endTime = existingBooking.booking_details?.end_time;

                    // ถ้าเป็น ISO timestamp ให้แปลงเป็นเวลาท้องถิ่น
                    if (startTime && startTime.includes('T')) {
                      const start = new Date(startTime).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Bangkok'
                      });
                      const end = new Date(endTime).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Bangkok'
                      });
                      return `${start} - ${end}`;
                    }

                    // ถ้าเป็น string เวลาธรรมดาแล้วให้ใช้ตรงๆ
                    return `${startTime} - ${endTime}`;
                  })()
                } น.</p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-gray-100 md:col-span-2 lg:col-span-2">
                <span className="font-bold text-gray-900 text-base">วัตถุประสงค์</span>
                <p className="mt-1 text-gray-800 font-medium break-words">
                  <span className="break-all">{existingBooking.booking_details?.details}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Room Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-3">🏢</span>
              ห้องประชุม
            </h2>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                เลือกห้องประชุมที่ต้องการแก้ไข
              </label>

              <SimpleCustomSelect
                value={selectedRoom?.room_id || ''}
                onChange={(roomId) => {
                  console.log('Room changed to:', roomId);
                  const room = rooms.find(r => r.room_id === parseInt(roomId))
                  console.log('Selected room:', room) // Debug
                  console.log('Available rooms:', rooms) // Debug
                  setSelectedRoom(room)
                }}
                options={[
                  { value: '', label: 'กรุณาเลือกห้องประชุม' },
                  ...rooms
                    .filter((room, index, arr) =>
                      arr.findIndex(r => r.room_id === room.room_id) === index
                    )
                    .map(room => ({
                      value: room.room_id,
                      label: `${room.room_name} (รองรับ ${room.capacity} คน)`
                    }))
                ]}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-white appearance-none cursor-pointer text-gray-900"
                placeholder="เลือกห้องประชุม"
                required
              />

              {/* แสดงข้อมูลห้องที่เลือกด้านล่าง */}
              {selectedRoom && (
                <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-green-600 text-sm">📍</span>
                      <span className="text-sm font-medium text-green-800">ห้องประชุมที่เลือก:</span>
                      <span className="text-sm font-medium text-green-800">{selectedRoom.room_name}</span>
                    </div>
                    <div className="ml-5 space-y-0.5">
                      <p className="text-xs text-green-600">ความจุ: {selectedRoom.capacity} คน</p>
                      {selectedRoom.location_m && (
                        <p className="text-xs text-green-600">สถานที่: {selectedRoom.location_m}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Responsive Layout: มือถือใช้ layout ใหม่, คอมใช้ layout เดิม */}

          {/* Layout สำหรับมือถือ (lg:hidden) */}
          <div className="lg:hidden space-y-4">

            {/* 1. Calendar Section - เลือกวันก่อนบนมือถือ */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <span className="text-xl mr-2">📅</span>
                  <span>เลือกวันที่ต้องการแก้ไข</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">กรุณาเลือกวันที่ที่ต้องการแก้ไขการจองก่อน</p>
              </div>

              <div className="p-4">
                <EditCalendarView
                  selectedRoom={selectedRoom}
                  selectedDates={selectedDates}
                  setSelectedDates={setSelectedDates}
                  onDateSelect={handleDateSelect}
                  loading={loading}
                  setAlertModal={setAlertModal}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  showCalendarModal={showCalendarModal}
                  setShowCalendarModal={setShowCalendarModal}
                  modalAnimation={modalAnimation}
                  setModalAnimation={setModalAnimation}
                  handleDayClick={handleDayClick}
                />
              </div>
            </div>

            {/* 2. Form Section - รายละเอียดและเวลาบนมือถือ */}
            <div className="space-y-4">

              {/* ข้อมูลที่ต้องการแก้ไข */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xl">📝</span>
                  <h2 className="text-lg font-semibold text-gray-800">
                    ข้อมูลที่ต้องการแก้ไข
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Time Selection - Stack บนมือถือ */}
                  <div className="space-y-4">
                    <SimpleCustomSelect
                      value={startTime}
                      onChange={(selectedValue) => {
                        setStartTime(selectedValue)
                        
                        // Auto-select end time (1 hour later)
                        if (selectedValue) {
                          const [hours, minutes] = selectedValue.split(':')
                          const startHour = parseInt(hours)
                          const endHour = startHour + 1
                          
                          // ตรวจสอบว่าไม่เกิน 22:00
                          if (endHour <= 22) {
                            const autoEndTime = `${endHour.toString().padStart(2, '0')}:${minutes}`
                            setEndTime(autoEndTime)
                          }
                        }
                        
                        // Reset end time if new start time is later than current end time (fallback)
                        const timeSlots = Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)
                        const validEndTimes = timeSlots.filter(time => {
                          const timeMinutes = time.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                          const startMinutes = selectedValue.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                          return timeMinutes > startMinutes
                        })
                        if (endTime && !validEndTimes.includes(endTime)) {
                          setEndTime('')
                        }
                      }}
                      options={Array.from({ length: 15 }, (_, i) => {
                        const hour = String(8 + i).padStart(2, '0')
                        return { value: `${hour}:00`, label: `${hour}:00 น.` }
                      })}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md relative"
                      placeholder="เลือกเวลาเริ่มต้น"
                      label="⏰ เวลาเริ่มต้น"
                      required
                    />

                    <SimpleCustomSelect
                      value={endTime}
                      onChange={(selectedValue) => setEndTime(selectedValue)}
                      options={startTime ? Array.from({ length: 15 }, (_, i) => {
                        const hour = String(8 + i).padStart(2, '0')
                        return { value: `${hour}:00`, label: `${hour}:00 น.` }
                      }).filter(option => {
                        const optionMinutes = option.value.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                        const startMinutes = startTime.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                        return optionMinutes > startMinutes
                      }) : []}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md relative"
                      placeholder="เลือกเวลาสิ้นสุด"
                      label="⏰ เวลาสิ้นสุด"
                      disabled={!startTime}
                      required
                    />
                  </div>

                  {/* วัตถุประสงค์ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📋 วัตถุประสงค์การจอง
                    </label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                      rows="3"
                      placeholder="ระบุวัตถุประสงค์การใช้ห้องประชุม..."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xl">✅</span>
                  <h2 className="text-lg font-semibold text-gray-800">
                    ยืนยันการแก้ไข
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* ข้อมูลสรุป */}
                  <div className="bg-gray-50 p-4 rounded-lg overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">สรุปการแก้ไข:</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center min-w-0">
                        <span className="flex-shrink-0 mr-2">🏢 ห้อง:</span>
                        <span 
                          className="truncate min-w-0 flex-1 max-w-[100px]" 
                          title={selectedRoom?.room_name || 'ยังไม่เลือก'}
                        >
                          {selectedRoom?.room_name ? 
                            (selectedRoom.room_name.length > 10 ? 
                              selectedRoom.room_name.slice(0, 10) + '...' : 
                              selectedRoom.room_name
                            ) : 'ยังไม่เลือก'
                          }
                        </span>
                      </div>
                      <div>📅 วันที่: {selectedDates.length > 0 ? `${selectedDates.length} วัน` : 'ยังไม่เลือก'}</div>
                      <div>⏰ เวลา: {startTime && endTime ? `${startTime} - ${endTime}` : 'ยังไม่เลือก'}</div>
                      <div>📝 วัตถุประสงค์: {purpose ? purpose.slice(0, 30) + (purpose.length > 30 ? '...' : '') : 'ยังไม่ระบุ'}</div>
                    </div>
                  </div>

                  {/* คำแนะนำ */}
                  <div className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">ℹ️</span>
                    <span>กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก การแก้ไขจะส่งไปยังเจ้าหน้าที่เพื่อพิจารณาอนุมัติ</span>
                  </div>

                  {/* ปุ่มกด - สลับตำแหน่งบนมือถือ */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || submitting}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg disabled:shadow-md text-sm"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>กำลังบันทึก...</span>
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✅</span>
                          <span>ยืนยันการแก้ไข</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => router.push('/my-reservations')}
                      className="w-full px-5 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
                    >
                      ← ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout เดิมสำหรับคอม (hidden lg:block) */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Time Selection and Purpose - Left Side (1/3) */}
              <div className="xl:col-span-1 xl:order-1 order-1 space-y-4">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xl">📝</span>
                    <h2 className="text-lg font-semibold text-gray-800">
                      ข้อมูลที่ต้องการแก้ไข
                    </h2>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {/* Time Selection - Side by side บนคอม */}
                    <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                      <SimpleCustomSelect
                        value={startTime}
                        onChange={(selectedValue) => {
                          setStartTime(selectedValue)
                          
                          // Auto-select end time (1 hour later)
                          if (selectedValue) {
                            const [hours, minutes] = selectedValue.split(':')
                            const startHour = parseInt(hours)
                            const endHour = startHour + 1
                            
                            // ตรวจสอบว่าไม่เกิน 22:00
                            if (endHour <= 22) {
                              const autoEndTime = `${endHour.toString().padStart(2, '0')}:${minutes}`
                              setEndTime(autoEndTime)
                            }
                          }
                          
                          // Reset end time if new start time is later than current end time (fallback)
                          const timeSlots = Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)
                          const validEndTimes = timeSlots.filter(time => {
                            const timeMinutes = time.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                            const startMinutes = selectedValue.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                            return timeMinutes > startMinutes
                          })
                          if (endTime && !validEndTimes.includes(endTime)) {
                            setEndTime('')
                          }
                        }}
                        options={Array.from({ length: 15 }, (_, i) => {
                          const hour = String(8 + i).padStart(2, '0')
                          return { value: `${hour}:00`, label: `${hour}:00 น.` }
                        })}
                        className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md relative"
                        placeholder="เลือกเวลาเริ่มต้น"
                        label="⏰ เวลาเริ่มต้น"
                        required
                      />

                      <SimpleCustomSelect
                        value={endTime}
                        onChange={(selectedValue) => setEndTime(selectedValue)}
                        options={startTime ? Array.from({ length: 15 }, (_, i) => {
                          const hour = String(8 + i).padStart(2, '0')
                          return { value: `${hour}:00`, label: `${hour}:00 น.` }
                        }).filter(option => {
                          const optionMinutes = option.value.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                          const startMinutes = startTime.split(':').reduce((acc, val, idx) => acc + (idx === 0 ? Number(val) * 60 : Number(val)), 0)
                          return optionMinutes > startMinutes
                        }) : []}
                        className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md relative"
                        placeholder="เลือกเวลาสิ้นสุด"
                        label="⏰ เวลาสิ้นสุด"
                        disabled={!startTime}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📋 วัตถุประสงค์การจอง
                      </label>
                      <textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                        rows="3"
                        placeholder="ระบุวัตถุประสงค์การใช้ห้องประชุม..."
                        required
                      />
                    </div>

                    {/* Submit Button - ภายในฟอร์ม */}
                    <div className="pt-2">
                      {/* ข้อมูลสรุป - เพิ่มในเวอร์ชั่นคอม */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4 overflow-hidden">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">สรุปการแก้ไข:</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center min-w-0">
                            <span className="flex-shrink-0 mr-2">🏢 ห้อง:</span>
                            <span 
                              className="truncate min-w-0 flex-1 max-w-[150px]" 
                              title={selectedRoom?.room_name || 'ยังไม่เลือก'}
                            >
                              {selectedRoom?.room_name ? 
                                (selectedRoom.room_name.length > 12 ? 
                                  selectedRoom.room_name.slice(0, 12) + '...' : 
                                  selectedRoom.room_name
                                ) : 'ยังไม่เลือก'
                              }
                            </span>
                          </div>
                          <div>📅 วันที่: {selectedDates.length > 0 ? `${selectedDates.length} วัน` : 'ยังไม่เลือก'}</div>
                          <div>⏰ เวลา: {startTime && endTime ? `${startTime} - ${endTime}` : 'ยังไม่เลือก'}</div>
                          <div>📝 วัตถุประสงค์: {purpose ? purpose.slice(0, 30) + (purpose.length > 30 ? '...' : '') : 'ยังไม่ระบุ'}</div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 flex items-center mb-3">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        <span>กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก การแก้ไขจะส่งไปยังเจ้าหน้าที่เพื่อพิจารณาอนุมัติ</span>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => router.push('/my-reservations')}
                          className="px-5 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm"
                        >
                          ← ยกเลิก
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={!canSubmit || submitting}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg disabled:shadow-md text-sm"
                        >
                          {submitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              <span>กำลังบันทึก...</span>
                            </>
                          ) : (
                            <>
                              <span className="mr-2">✅</span>
                              <span>ยืนยันการแก้ไข</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar - Right Side (2/3) */}
              <div className="xl:col-span-2 xl:order-2 order-2">
                <EditCalendarView
                  selectedRoom={selectedRoom}
                  selectedDates={selectedDates}
                  setSelectedDates={setSelectedDates}
                  onDateSelect={handleDateSelect}
                  loading={loading}
                  setAlertModal={setAlertModal}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  showCalendarModal={showCalendarModal}
                  setShowCalendarModal={setShowCalendarModal}
                  modalAnimation={modalAnimation}
                  setModalAnimation={setModalAnimation}
                  handleDayClick={handleDayClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day Detail Modal - เมื่อคลิกวันที่ในปฏิทินแล้ว */}
      {(() => {
        const shouldShow = selectedDate && selectedRoom
        console.log('🔍 Day Detail Modal Check:', {
          selectedDate,
          selectedRoom: selectedRoom?.room_name,
          shouldShow,
          modalAnimation
        })
        if (shouldShow) {
          console.log('🎯 Modal should be visible now!')
        }
        return shouldShow
      })() && (
          <div
            className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ease-out ${modalAnimation === 'enter'
              ? 'bg-black/60 backdrop-blur-md transition-all duration-700'
              : modalAnimation === 'entering'
                ? 'bg-black/30 backdrop-blur-sm transition-all duration-700'
                : modalAnimation === 'exit'
                  ? 'bg-black/10 backdrop-blur-none transition-all duration-300'
                  : 'bg-black/60 backdrop-blur-md transition-all duration-700'
              }`}
            style={{
              backdropFilter: modalAnimation === 'enter' ? 'blur(8px)' : modalAnimation === 'entering' ? 'blur(4px)' : 'blur(8px)',
            }}
            onClick={() => {
              console.log('🔽 Closing modal from backdrop click')
              setModalAnimation('exit')
              setTimeout(() => {
                setSelectedDate(null)
                setShowTimeDetails(false)
              }, 250) // ลดจาก 700ms เหลือ 250ms
            }}
          >
            <div
              className={`
              bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden
              transform ease-out
              ${modalAnimation === 'enter'
                  ? 'scale-100 opacity-100 translate-y-0 rotate-0 transition-all duration-700'
                  : modalAnimation === 'exit'
                    ? 'scale-90 opacity-0 translate-y-8 rotate-2 transition-all duration-300'
                    : modalAnimation === 'entering'
                      ? 'scale-95 opacity-0 translate-y-4 rotate-1 transition-all duration-700'
                      : 'scale-85 opacity-0 translate-y-12 rotate-3 transition-all duration-300'
                }
            `}
              onClick={(e) => e.stopPropagation()}
              style={{
                filter: modalAnimation === 'enter'
                  ? 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.25))'
                  : 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15))',
                transformOrigin: 'center center'
              }}
            >
              {/* Modal Header - เหมือนหน้าจองทุกประการ */}
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-6 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 animate-pulse delay-500"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/3 rounded-full animate-bounce delay-300"></div>

                <div className="relative flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3 flex-1 pr-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg transform transition-all duration-500 hover:scale-110 hover:rotate-12">
                      <span className="text-2xl animate-bounce">📅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold mb-1 animate-fade-in-up">รายละเอียดการจอง</h3>
                      <p className="text-blue-100 text-sm font-medium animate-fade-in-up delay-100">
                        {selectedDate?.date?.toLocaleDateString('th-TH', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔽 Closing modal from X button')
                      setModalAnimation('exit')
                      setTimeout(() => {
                        setSelectedDate(null)
                        setShowTimeDetails(false)
                      }, 250) // ลดจาก 700ms เหลือ 250ms
                    }}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm group hover:scale-110 hover:rotate-90 active:scale-95 flex-shrink-0 transform"
                  >
                    <span className="text-xl group-hover:rotate-180 transition-transform duration-300 block">✕</span>
                  </button>
                </div>
              </div>

              {/* Modal Body - เหมือนหน้าจองทุกประการ */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(80vh-180px)] scrollbar-hide"
                style={{
                  scrollbarWidth: 'none', /* Firefox */
                  msOverflowStyle: 'none', /* Internet Explorer 10+ */
                }}>
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .scrollbar-hide::-webkit-scrollbar { 
                      display: none; /* Safari and Chrome */
                    }
                  `
                }} />
                {/* Room Info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0 shadow-sm">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-lg truncate mb-1">{selectedRoom?.room_name}</h4>
                      <p className="text-sm text-gray-600">ความจุ {selectedRoom?.capacity} คน • <span className="text-green-600 font-medium">ใช้งานได้</span></p>
                    </div>
                  </div>
                </div>

                {/* Day Status - เหมือนหน้าจองทุกประการ */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                    <span className="mr-2 text-xl">📊</span>
                    สถานะ
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const dayData = selectedDate?.dayData

                      if (!dayData) {
                        return (
                          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-green-500 rounded-lg flex-shrink-0"></div>
                              <div>
                                <span className="font-bold text-green-800">ว่างทั้งวัน</span>
                                <p className="text-sm text-green-700">สามารถจองได้ทุกช่วงเวลา</p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      const slots = dayData.slots || []
                      const availableSlots = slots.filter(slot => !slot.reservations || slot.reservations.length === 0).length
                      const totalSlots = slots.length
                      const colorInfo = calculateDayColor(dayData)

                      // แยกช่วงเช้า/บ่าย เพื่อตรวจสอบสถานะ
                      const morningSlots = slots.filter(slot => {
                        if (!slot?.start_time) return false
                        const hour = parseInt(slot.start_time.split(':')[0])
                        return hour < 12
                      })
                      const afternoonSlots = slots.filter(slot => {
                        if (!slot?.start_time) return false
                        const hour = parseInt(slot.start_time.split(':')[0])
                        return hour >= 12
                      })

                      const morningAvailable = morningSlots.filter(slot => !slot.reservations || slot.reservations.length === 0).length
                      const afternoonAvailable = afternoonSlots.filter(slot => !slot.reservations || slot.reservations.length === 0).length

                      const morningStatus = morningSlots.length === 0 ? 'ไม่มีข้อมูล' :
                        (morningAvailable > 0 ? 'ยังว่าง' : 'เต็มแล้ว')
                      const afternoonStatus = afternoonSlots.length === 0 ? 'ไม่มีข้อมูล' :
                        (afternoonAvailable > 0 ? 'ยังว่าง' : 'เต็มแล้ว')

                      return (
                        <div className="p-4 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-300" style={{
                          borderColor: colorInfo.color,
                          backgroundColor: colorInfo.color + '10'
                        }}>
                          <div className="flex items-start space-x-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1"
                              style={{ backgroundColor: colorInfo.color }}
                            >
                              <span className="text-white text-sm font-bold">
                                {availableSlots === totalSlots ? '✓' :
                                  availableSlots === 0 ? '✕' :
                                    Math.round((availableSlots / totalSlots) * 100) + '%'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-lg font-bold text-gray-900 block mb-2">{colorInfo.text}</span>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="text-yellow-600 font-medium">🌅 ช่วงเช้า:</span>
                                  <span className={`font-bold ${morningStatus === 'ยังว่าง' ? 'text-green-600' : morningStatus === 'เต็มแล้ว' ? 'text-red-600' : 'text-gray-500'}`}>
                                    {morningStatus}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-orange-600 font-medium">🌇 ช่วงบ่าย:</span>
                                  <span className={`font-bold ${afternoonStatus === 'ยังว่าง' ? 'text-green-600' : afternoonStatus === 'เต็มแล้ว' ? 'text-red-600' : 'text-gray-500'}`}>
                                    {afternoonStatus}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* รายชื่อผู้จองทั้งหมดในวันนี้ - เหมือนหน้าจองทุกประการ */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                    <span className="mr-2 text-xl">👥</span>
                    รายชื่อผู้จองทั้งหมด
                  </h4>
                  {(() => {
                    const dayData = selectedDate?.dayData

                    if (!dayData || !dayData.slots) {
                      return (
                        <div className="text-center py-4 text-gray-500">
                          <span className="text-2xl mb-2 block">📋</span>
                          <p>ยังไม่มีการจองในวันนี้</p>
                        </div>
                      )
                    }

                    // รวมรายการจองทั้งหมด
                    const allBookings = []
                    dayData.slots.forEach(slot => {
                      if (slot.reservations && slot.reservations.length > 0) {
                        slot.reservations.forEach(reservation => {
                          if (!allBookings.find(booking => booking.reservation_id === reservation.reservation_id)) {
                            allBookings.push({
                              ...reservation,
                              slot_time: slot.start_time && slot.end_time ?
                                `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}` :
                                reservation.time_range || 'ไม่ระบุเวลา'
                            })
                          }
                        })
                      }
                    })

                    if (allBookings.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500">
                          <span className="text-2xl mb-2 block">📋</span>
                          <p>ยังไม่มีการจองในวันนี้</p>
                        </div>
                      )
                    }

                    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4']

                    return (
                      <div className="space-y-3">
                        {allBookings.map((booking, index) => (
                          <div
                            key={booking.reservation_id}
                            className="p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300"
                            style={{
                              borderLeft: `4px solid ${colors[index % colors.length]}`,
                              backgroundColor: colors[index % colors.length] + '05'
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: colors[index % colors.length] }}
                                  ></div>
                                  <span className="font-bold text-gray-900">
                                    {booking.reserved_by || booking.user_name || `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'ไม่ระบุชื่อ'}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed'
                                    ? 'bg-green-200 text-green-800'
                                    : booking.status === 'pending'
                                      ? 'bg-yellow-200 text-yellow-800'
                                      : 'bg-gray-200 text-gray-800'
                                    }`}>
                                    {booking.status === 'confirmed' ? 'อนุมัติแล้ว' :
                                      booking.status === 'pending' ? 'รออนุมัติ' : 'ไม่ระบุสถานะ'}
                                  </span>
                                </div>

                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-2">
                                    <span>🕐</span>
                                    <span>{booking.slot_time}</span>
                                  </div>

                                  {booking.department && (
                                    <div className="flex items-center space-x-2">
                                      <span>🏢</span>
                                      <span>{booking.department}</span>
                                      {booking.position && <span>• {booking.position}</span>}
                                    </div>
                                  )}

                                  {booking.purpose && (
                                    <div className="flex items-center space-x-2">
                                      <span>📝</span>
                                      <span>{booking.purpose}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Time Slots - เหมือนหน้าจองทุกประการ */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                    <span className="mr-2 text-xl">⏰</span>
                    ช่วงเวลาการจอง
                  </h4>

                  {(() => {
                    const dayData = selectedDate?.dayData
                    const slots = dayData?.slots || []

                    if (slots.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <span className="text-4xl mb-3 block animate-bounce">📅</span>
                          <p className="text-lg font-medium">ไม่มีข้อมูลช่วงเวลาสำหรับวันนี้</p>
                        </div>
                      )
                    }

                    const morningSlots = slots.filter(slot => {
                      if (!slot || !slot.start_time) return false
                      const hour = parseInt(slot.start_time.split(':')[0])
                      return hour < 12
                    })
                    const afternoonSlots = slots.filter(slot => {
                      if (!slot || !slot.start_time) return false
                      const hour = parseInt(slot.start_time.split(':')[0])
                      return hour >= 12
                    })

                    return (
                      <div className="space-y-6">
                        {/* ช่วงเช้า */}
                        {morningSlots.length > 0 && (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-md hover:shadow-lg transition-all duration-300">
                            <h5 className="font-bold text-yellow-800 mb-3 flex items-center text-base">
                              <span className="mr-2 text-lg">🌅</span>
                              ช่วงเช้า (8:00-11:59 น.)
                              <span className="ml-3 text-xs bg-gradient-to-r from-yellow-200 to-orange-200 text-yellow-800 px-3 py-1 rounded-full font-bold">
                                {morningSlots.filter(s => s.available !== undefined ? s.available : (!s.reservations || s.reservations.length === 0)).length > 0 ? 'ยังว่าง' : 'เต็มแล้ว'}
                              </span>
                            </h5>

                            <div className="space-y-2 mb-3">
                              {morningSlots.map((slot, index) => {
                                const isAvailable = slot.available !== undefined ? slot.available : (!slot.reservations || slot.reservations.length === 0)
                                return (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg transition-all duration-200 ${isAvailable
                                      ? 'bg-green-100 text-green-800 border border-green-200'
                                      : 'bg-red-100 text-red-800 border border-red-200'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between text-sm font-medium mb-2">
                                      <span className="flex items-center space-x-2">
                                        <span className="text-base">
                                          {isAvailable ? '✅' : '❌'}
                                        </span>
                                        <span>
                                          {slot.start_time && slot.end_time ?
                                            `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}` :
                                            'ไม่มีข้อมูลเวลา'
                                          }
                                        </span>
                                      </span>
                                      <span className="font-bold">
                                        {isAvailable ? 'ยังว่าง' : 'จองแล้ว'}
                                      </span>
                                    </div>

                                    {/* แสดงรายชื่อผู้จอง */}
                                    {!isAvailable && slot.reservations && slot.reservations.length > 0 && (
                                      <div className="space-y-1">
                                        {slot.reservations.map((reservation, resIndex) => (
                                          <div key={resIndex} className="text-xs bg-white bg-opacity-80 p-2 rounded border">
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold text-gray-900">
                                                👤 {reservation.reserved_by}
                                              </span>
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${reservation.status === 'approved'
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-yellow-200 text-yellow-800'
                                                }`}>
                                                {reservation.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                                              </span>
                                            </div>
                                            {(reservation.user_department || reservation.department) && (
                                              <div className="text-gray-600 mt-1">
                                                🏢 {reservation.user_department || reservation.department}
                                                {(reservation.user_position || reservation.position) && ` • ${reservation.user_position || reservation.position}`}
                                              </div>
                                            )}
                                            {(reservation.details || reservation.purpose) && (
                                              <div className="text-gray-600 mt-1 break-words">
                                                📝 <span className="break-all">{reservation.details || reservation.purpose}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* ช่วงบ่าย */}
                        {afternoonSlots.length > 0 && (
                          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200 shadow-md hover:shadow-lg transition-all duration-300">
                            <h5 className="font-bold text-orange-800 mb-3 flex items-center text-base">
                              <span className="mr-2 text-lg">🌇</span>
                              ช่วงบ่าย (12:00-22:00 น.)
                              <span className="ml-3 text-xs bg-gradient-to-r from-orange-200 to-red-200 text-orange-800 px-3 py-1 rounded-full font-bold">
                                {afternoonSlots.filter(s => s.available !== undefined ? s.available : (!s.reservations || s.reservations.length === 0)).length > 0 ? 'ยังว่าง' : 'เต็มแล้ว'}
                              </span>
                            </h5>

                            <div className="space-y-2 mb-3">
                              {afternoonSlots.map((slot, index) => {
                                const isAvailable = slot.available !== undefined ? slot.available : (!slot.reservations || slot.reservations.length === 0)
                                return (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg transition-all duration-200 ${isAvailable
                                      ? 'bg-green-100 text-green-800 border border-green-200'
                                      : 'bg-red-100 text-red-800 border border-red-200'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between text-sm font-medium mb-2">
                                      <span className="flex items-center space-x-2">
                                        <span className="text-base">
                                          {isAvailable ? '✅' : '❌'}
                                        </span>
                                        <span>
                                          {slot.start_time && slot.end_time ?
                                            `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}` :
                                            'ไม่มีข้อมูลเวลา'
                                          }
                                        </span>
                                      </span>
                                      <span className="font-bold">
                                        {isAvailable ? 'ยังว่าง' : 'จองแล้ว'}
                                      </span>
                                    </div>

                                    {/* แสดงรายชื่อผู้จอง */}
                                    {!isAvailable && slot.reservations && slot.reservations.length > 0 && (
                                      <div className="space-y-1">
                                        {slot.reservations.map((reservation, resIndex) => (
                                          <div key={resIndex} className="text-xs bg-white bg-opacity-80 p-2 rounded border">
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold text-gray-900">
                                                👤 {reservation.reserved_by}
                                              </span>
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${reservation.status === 'approved'
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-yellow-200 text-yellow-800'
                                                }`}>
                                                {reservation.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                                              </span>
                                            </div>
                                            {(reservation.user_department || reservation.department) && (
                                              <div className="text-gray-600 mt-1">
                                                🏢 {reservation.user_department || reservation.department}
                                                {(reservation.user_position || reservation.position) && ` • ${reservation.user_position || reservation.position}`}
                                              </div>
                                            )}
                                            {(reservation.details || reservation.purpose) && (
                                              <div className="text-gray-600 mt-1 break-words">
                                                📝 <span className="break-all">{reservation.details || reservation.purpose}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Modal Footer - เหมือนหน้าจองทุกประการ */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50/80 via-blue-50/80 to-indigo-50/80 border-t border-gray-200/50 backdrop-blur-sm">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      console.log('🔽 Closing modal from footer button')
                      setModalAnimation('exit')
                      setTimeout(() => {
                        setSelectedDate(null)
                        setShowTimeDetails(false)
                      }, 250) // ลดจาก 700ms เหลือ 250ms
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 active:scale-95 flex items-center justify-center text-sm sm:text-base group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="text-sm sm:text-base relative z-10 flex items-center">
                      <span className="mr-2 transition-transform duration-300 group-hover:scale-110">🚪</span>
                      ปิดหน้าต่าง
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Calendar Modal - เหมือนหน้า reserve ทุกประการ พร้อม background blur */}
      {
        showCalendarModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ease-out bg-black/60 backdrop-blur-md"
            style={{ backdropFilter: 'blur(8px)' }}
            onClick={() => setShowCalendarModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-700 ease-out scale-100 opacity-100"
              style={{
                filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.25))',
                transformOrigin: 'center center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 p-6 text-white relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 animate-pulse delay-500"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 animate-pulse delay-1000"></div>

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg transform transition-all duration-500 hover:scale-110 hover:rotate-12">
                      <span className="text-2xl animate-bounce">📋</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold animate-fade-in-up">ปฏิทินการจอง</h3>
                      <p className="text-blue-100 animate-fade-in-up delay-100">{selectedRoom?.room_name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCalendarModal(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm group hover:scale-110 hover:rotate-90 active:scale-95 transform"
                  >
                    <span className="text-xl group-hover:rotate-180 transition-transform duration-300 block">✕</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}>
                <style dangerouslySetInnerHTML={{
                  __html: `
                    div::-webkit-scrollbar { 
                      display: none; 
                    }
                  `
                }} />

                <div className="text-center mb-4">
                  <p className="text-gray-600 text-sm">
                    คลิกวันที่เพื่อดูรายละเอียดการจองและช่วงเวลาที่ว่าง
                  </p>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={async () => {
                      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                      setCurrentMonth(newMonth)
                    }}
                    className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                  >
                    <span className="text-xl group-hover:-translate-x-1 transition-transform duration-200 block">←</span>
                  </button>

                  <h4 className="text-xl font-bold text-gray-900 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">{currentMonth.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}</h4>

                  <button
                    onClick={async () => {
                      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                      setCurrentMonth(newMonth)
                    }}
                    className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                  >
                    <span className="text-xl group-hover:translate-x-1 transition-transform duration-200 block">→</span>
                  </button>
                </div>

                {/* Calendar Grid - ดึงมาจากหน้า Calendar หลักทั้งหมด */}
                <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                  {/* Days header */}
                  {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day, index) => {
                    const shortNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
                    return (
                      <div key={day} className="p-2 md:p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0 bg-gray-50">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{shortNames[index]}</span>
                      </div>
                    )
                  })}

                  {/* Calendar days - แก้ไขให้แสดงสีและข้อมูลถูกต้อง */}
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0 bg-gray-100"></div>
                    }

                    const dayData = getDayData(day)
                    const colorInfo = calculateDayColor(dayData)

                    // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
                    const today = new Date()
                    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                    today.setHours(0, 0, 0, 0)
                    checkDate.setHours(0, 0, 0, 0)
                    const isPastDate = checkDate < today
                    const isToday = checkDate.toDateString() === new Date().toDateString()

                    // ใช้สีตามข้อมูลจริง
                    const backgroundColor = isPastDate ? '#D1D5DB' : colorInfo.color

                    return (
                      <div
                        key={day}
                        className={`
                        min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0
                        ${isPastDate
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer hover:shadow-lg transition-all duration-300'
                          }
                      `}
                        style={{ backgroundColor }}
                        onClick={() => {
                          if (!isPastDate) {
                            handleDayClick(day)
                          }
                        }}
                      >
                        {/* วันที่ */}
                        <div className={`text-sm sm:text-base lg:text-lg font-bold ${isPastDate ? 'text-gray-500' : 'text-white'
                          }`}>
                          {day}
                        </div>

                        {/* Status Text - แสดงเฉพาะวันที่ไม่ผ่านมา */}
                        {!isPastDate && (
                          <div className="text-xs text-center mt-1 px-1 py-1 rounded text-white font-medium hidden sm:block">
                            {colorInfo.text}
                          </div>
                        )}

                        {/* Booking Details - แสดงรายชื่อผู้จองในโมดัล */}
                        {!isPastDate && dayData && dayData.slots && (
                          <div className="mt-1 space-y-0.5">
                            {(() => {
                              // รวมรายชื่อผู้จองทั้งหมดในวันนี้
                              const allBookings = []
                              dayData.slots.forEach(slot => {
                                if (slot.reservations && slot.reservations.length > 0) {
                                  slot.reservations.forEach(reservation => {
                                    if (!allBookings.find(booking => booking.reservation_id === reservation.reservation_id)) {
                                      allBookings.push(reservation)
                                    }
                                  })
                                }
                              })

                              // แสดงสูงสุด 3 รายการในโมดัล เหมือนหน้าปฏิทินหลัก
                              const displayBookings = allBookings.slice(0, 3)
                              const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']

                              return displayBookings.map((booking, index) => (
                                <div
                                  key={booking.reservation_id}
                                  className="text-xs px-1 py-0.5 rounded text-white font-medium truncate hidden sm:block"
                                  style={{
                                    backgroundColor: colors[index % colors.length],
                                    fontSize: '0.55rem',
                                    lineHeight: '0.7rem'
                                  }}
                                  title={`${booking.reserved_by} - ${booking.time_range}`}
                                >
                                  {booking.reserved_by}
                                </div>
                              ))
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-6 h-6 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: '#10B981' }}></div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-gray-900 block">ว่างทั้งวัน</span>
                      <span className="text-xs text-gray-600">สามารถจองได้ทุกช่วงเวลา (8:00-22:00)</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="w-6 h-6 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: '#F59E0B' }}></div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-gray-900 block">ว่างบางช่วง</span>
                      <span className="text-xs text-gray-600">มีช่วงเวลาว่างและช่วงที่จองแล้วปะปน</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-6 h-6 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: '#EF4444' }}></div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-gray-900 block">เต็มทั้งวัน</span>
                      <span className="text-xs text-gray-600">ไม่มีช่วงเวลาว่างให้จอง (จองหมดแล้ว)</span>
                    </div>
                  </div>
                </div>

                {/* Info Sections */}
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-600 text-lg flex-shrink-0">📅</span>
                      <div>
                        <p className="text-sm text-blue-800 font-medium mb-1">
                          <span className="font-bold">เวลาให้บริการ:</span> จันทร์-อาทิตย์ ตั้งแต่ 8:00-22:00 น.
                        </p>
                        <p className="text-xs text-blue-700 mb-2">
                          แบ่งเป็น 14 ช่วงเวลา (ชั่วโมงละ 1 ช่วง) สามารถจองได้ทุกวันรวมทั้งวันหยุดเสาร์-อาทิตย์
                        </p>
                        <p className="text-xs text-blue-700">
                          <span className="font-semibold">⚠️ หมายเหตุ:</span> ช่วง 12:00-13:00 น. เป็นช่วงพักเที่ยง อาจมีข้อจำกัดในการจองตามนโยบายของแต่ละหน่วยงาน
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-purple-600 text-lg flex-shrink-0">💡</span>
                      <div>
                        <p className="text-sm text-purple-800 font-medium mb-1">
                          <span className="font-bold">วิธีใช้:</span> คลิกที่วันที่ต้องการเพื่อดูรายละเอียดการจอง
                        </p>
                        <p className="text-xs text-purple-700">
                          จะแสดงสถานะของแต่ละช่วงเวลา แบ่งเป็นช่วงเช้า (8:00-11:59) และช่วงบ่าย (12:00-22:00)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-600 text-lg flex-shrink-0">🚫</span>
                      <div>
                        <p className="text-sm text-gray-800 font-medium mb-1">
                          <span className="font-bold">วันที่ผ่านมาแล้ว:</span> แสดงเป็นสีเทาและไม่สามารถคลิกได้
                        </p>
                        <p className="text-xs text-gray-700">
                          ระบบจะไม่อนุญาตให้จองย้อนหลังหรือดูรายละเอียดของวันที่ผ่านมาแล้ว
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200/50 p-4 bg-gradient-to-r from-gray-50/80 via-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 hover:from-blue-700 hover:via-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 active:scale-95 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center">
                    <span className="mr-2 transition-transform duration-300 group-hover:scale-110">🚪</span>
                    ปิดหน้าต่าง
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  )
}

// EditCalendarView Component (copy มาจากหน้า reserve ทุกอย่าง)
function EditCalendarView({ selectedRoom, selectedDates, setSelectedDates, onDateSelect, loading, setAlertModal, selectedDate, setSelectedDate, showCalendarModal, setShowCalendarModal, modalAnimation, setModalAnimation, handleDayClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  // ย้ายฟังก์ชัน getDaysInMonth มาไว้ก่อน useMemo
  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }, [])

  // ย้าย useMemo มาไว้ก่อน - เพื่อไม่ให้ขัดกับ Rules of Hooks
  const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth, getDaysInMonth])
  const monthNames = useMemo(() => [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ], [])

  // ดึงข้อมูลปฏิทินเมื่อเปลี่ยนห้องหรือเดือน - ใช้ getDetailedCalendar เหมือนหน้าปฏิทินหลักทุกประการ
  const fetchCalendarData = useCallback(async () => {
    if (!selectedRoom) return

    setCalendarLoading(true)
    try {
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()

      // ใช้ getDetailedCalendar เหมือนหน้าปฏิทินหลักเพื่อให้ได้ข้อมูlเหมือนกัน
      const result = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, month, year, {
        timestamp: Date.now(),
        source: 'edit-booking-page',
        forceRefresh: true,
        _cache_bust: Math.random()
      })

      // Debug: เพิ่ม logging เพื่อตรวจสอบข้อมูล
      console.log('🔍 [EDIT-BOOKING] Calendar API Response:', {
        roomId: selectedRoom.room_id,
        month,
        year,
        hasData: !!result,
        hasCalendar: !!(result?.calendar),
        hasDailyAvailability: !!(result?.calendar?.daily_availability),
        totalDays: result?.calendar?.daily_availability?.length || 0,
        fullResponse: result
      })

      setCalendarData(result)
    } catch (error) {
      console.error('❌ [EDIT-BOOKING] Error fetching calendar data:', error)
    } finally {
      setCalendarLoading(false)
    }
  }, [selectedRoom, currentMonth])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  // ฟังก์ชันคำนวณสีตาม logic ใหม่ - ให้ตรงกับความเป็นจริง
  const calculateDayColor = useCallback((dayAvailability) => {
    // ถ้าไม่มีข้อมูล หมายความว่าห้องว่างทั้งวัน (สามารถจองได้)
    if (!dayAvailability || !dayAvailability.slots || dayAvailability.slots.length === 0) {
      return { color: '#10B981', status: 'available', text: 'ว่าง' }
    }

    const { slots = [] } = dayAvailability

    // นับ slots ที่ว่าง
    const availableSlots = slots.filter(slot => slot.available).length
    const totalSlots = slots.length

    // ถ้าไม่มี slots เลย = ห้องว่างทั้งวัน
    if (totalSlots === 0) {
      return { color: '#10B981', status: 'available', text: 'ว่าง' }
    }

    // ถ้าทุก slots ว่าง = ว่างทั้งวัน
    if (availableSlots === totalSlots) {
      return { color: '#10B981', status: 'available', text: 'ว่าง' }
    } 
    // ถ้าไม่มี slots ว่างเลย = เต็มทั้งวัน
    else if (availableSlots === 0) {
      return { color: '#EF4444', status: 'full', text: 'เต็ม' }
    } 
    // ถ้ามีบาง slots ว่าง = ยังว่างบางช่วง
    else {
      return { color: '#F59E0B', status: 'partial', text: 'บางช่วง' }
    }
  }, [])

  // ฟังก์ชันสำหรับดึงข้อมูลวัน - ใช้โครงสร้างเดียวกับหน้า calendar หลัก (ไม่สร้าง default slots)
  const getDayData = useCallback((day) => {
    if (!day || !calendarData || !calendarData.calendar || !calendarData.calendar.daily_availability) {
      return null
    }

    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // ใช้ข้อมูลจาก API เท่านั้น - เหมือนหน้า calendar หลัก
    const existingData = calendarData.calendar.daily_availability.find(d => d.date === dateStr)
    return existingData || null

  }, [calendarData, currentMonth])

  const getDateStatus = useCallback((day) => {
    if (!day) return 'available'

    // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
    const today = new Date()
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    today.setHours(0, 0, 0, 0)
    checkDate.setHours(0, 0, 0, 0)

    if (checkDate < today) {
      return 'past' // วันที่ผ่านมาแล้ว
    }

    // ดึงข้อมูลวันนั้น (ใช้ getDayData ที่สร้าง default slots แล้ว)
    const dayData = getDayData(day)

    if (!dayData) {
      return 'available' // ถ้าไม่มีข้อมูล = ว่างทั้งวัน
    }

    // ใช้ฟังก์ชัน calculateDayColor เพื่อตรวจสอบสถานะ
    const colorInfo = calculateDayColor(dayData)

    return colorInfo.status
  }, [currentMonth, getDayData, calculateDayColor])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'available':
        return 'text-white font-semibold border-2 border-white' // กลับไปใช้สีขาวในปฏิทิน
      case 'partial':
        return 'text-white font-semibold border-2 border-white' // กลับไปใช้สีขาวในปฏิทิน
      case 'full':
        return 'text-white font-semibold border-2 border-white cursor-not-allowed' // กลับไปใช้สีขาวในปฏิทิน
      case 'past':
        return 'bg-gray-700 text-white border-2 border-gray-800 cursor-not-allowed' // วันที่ผ่านมาแล้ว
      case 'no-data':
      case 'unknown':
      default:
        return 'bg-gray-200 text-gray-600 border-2 border-gray-300'
    }
  }, [])

  const getStatusBgColor = useCallback((status) => {
    switch (status) {
      case 'available': return '#10B981' // เขียว
      case 'partial': return '#F59E0B'   // ส้ม
      case 'full': return '#EF4444'      // แดง
      case 'past': return '#374151'      // เทาเข้ม (วันที่ผ่านมาแล้ว)
      case 'no-data':
      case 'unknown':
      default: return '#6B7280'          // เทา
    }
  }, [])

  // ฟังก์ชันสำหรับเลือกวันที่ (รองรับหลายวัน)
  const handleDateSelect = useCallback((day) => {
    if (!day) return

    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const status = getDateStatus(day)

    // ไม่ให้เลือกวันที่ผ่านมาแล้ว
    if (status === 'past') {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'ไม่สามารถเลือกได้',
        message: 'ไม่สามารถเลือกวันที่ผ่านมาแล้วได้'
      })
      return
    }

    // Alert และไม่ให้เลือกวันที่เต็ม
    if (status === 'full') {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'วันที่เต็มแล้ว',
        message: 'วันที่นี้ถูกจองเต็มแล้ว กรุณาเลือกวันอื่น'
      })
      return
    }

    onDateSelect(dateStr)
  }, [currentMonth, getDateStatus, onDateSelect, setAlertModal])

  const isDateSelected = useCallback((day) => {
    if (!day) return false
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return selectedDates.includes(dateStr)
  }, [currentMonth, selectedDates])

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  // ฟังก์ชันจัดการการคลิกวันที่ - เหมือนหน้า calendar หลัก

  // ปิด Modal พร้อม Animation - เหมือนหน้า calendar หลัก
  const closeModal = () => {
    setModalAnimation(false)
    setTimeout(() => {
      setSelectedDate(null)
      setShowTimeDetails(false)
    }, 300)
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
          <span className="mr-2">📅</span>
          เลือกวันที่แก้ไข
        </h2>

        <div className="flex items-center justify-end space-x-2 sm:space-x-4">    
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevMonth}
              disabled={!selectedRoom}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              ←
            </button>
            <h3 className="text-sm sm:text-lg font-medium text-gray-800 min-w-[100px] sm:min-w-[140px] text-center">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={goToNextMonth}
              disabled={!selectedRoom}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              →
            </button>
          </div>
        </div>
      </div>



      {calendarLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">กำลังโหลดปฏิทิน...</p>
        </div>
      )}

      {!calendarLoading && !selectedRoom && (
        <div className="text-center py-12">
          <div className="mb-4">
            <span className="text-6xl">🏢</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            กรุณาเลือกห้องประชุมก่อน
          </h3>
          <p className="text-gray-500">
            เลือกห้องประชุมที่ต้องการแก้ไขเพื่อแสดงปฏิทินการจอง
          </p>
        </div>
      )}

      {!calendarLoading && selectedRoom && (
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 rounded-lg overflow-hidden border border-gray-200">
          {/* หัวตาราง - วันในสัปดาห์ */}
          {dayNames.map((dayName) => (
            <div
              key={dayName}
              className="h-8 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-medium text-gray-600 bg-gray-50"
            >
              {dayName}
            </div>
          ))}

          {/* วันที่ในเดือน - ปรับให้ responsive */}
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-10 sm:h-12"></div>
            }

            const dayData = getDayData(day)
            const colorInfo = calculateDayColor(dayData)
            const status = getDateStatus(day)
            const isSelected = isDateSelected(day)
            const isDisabled = status === 'full' || status === 'past'

            // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
            const today = new Date()
            const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            today.setHours(0, 0, 0, 0)
            checkDate.setHours(0, 0, 0, 0)
            const isPastDate = checkDate < today
            const isToday = checkDate.toDateString() === new Date().toDateString()

            // ใช้สีเขียวเหมือนหน้าจองห้องประชุม - แบบเดียวกันทุกประการ
            const backgroundColor = isPastDate ? '#D1D5DB' : '#10B981'
            const textColor = isPastDate ? 'text-gray-500' : 'text-white'

            return (
              <div
                key={day}
                className={`
                  h-10 sm:h-14 p-1 sm:p-1.5 transition-all duration-200 relative
                  ${isPastDate
                    ? 'cursor-not-allowed border border-gray-200'
                    : 'cursor-pointer hover:scale-105 hover:shadow-md'
                  }
                  ${isSelected
                    ? 'border-2 border-blue-500 shadow-lg transform scale-105'
                    : 'border border-gray-200'
                  }
                  ${!isPastDate && !isSelected ? 'hover:border-blue-300' : ''}
                  rounded-lg ${textColor}
                `}
                style={{ backgroundColor }}
                onClick={(e) => {
                  // คลิกขวา/shift+คลิก = ดูรายละเอียด
                  // คลิกปกติ = เลือกวันที่
                  if (e.shiftKey) {
                    handleDayClick(day)
                  } else {
                    handleDateSelect(day)
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  handleDayClick(day)
                }}
                onTouchStart={(e) => {
                  // สำหรับมือถือ - แตะค้างไว้
                  const touchTimer = setTimeout(() => {
                    handleDayClick(day)
                  }, 800) // 800ms = 0.8 วินาที

                  e.currentTarget.setAttribute('data-touch-timer', touchTimer)
                }}
                onTouchEnd={(e) => {
                  // ยกเลิก timer ถ้าปล่อยเร็วกว่า 800ms
                  const touchTimer = e.currentTarget.getAttribute('data-touch-timer')
                  if (touchTimer) {
                    clearTimeout(parseInt(touchTimer))
                    e.currentTarget.removeAttribute('data-touch-timer')
                  }
                }}
                onTouchMove={(e) => {
                  // ยกเลิก timer ถ้าขยับนิ้ว
                  const touchTimer = e.currentTarget.getAttribute('data-touch-timer')
                  if (touchTimer) {
                    clearTimeout(parseInt(touchTimer))
                    e.currentTarget.removeAttribute('data-touch-timer')
                  }
                }}
                title={`${day} ${monthNames[currentMonth.getMonth()]} - ${isPastDate ? 'วันที่ผ่านมาแล้ว' : colorInfo.text
                  } | มือถือ: แตะ=เลือกจอง, แตะค้าง=ดูรายละเอียด | คอม: คลิก=เลือกจอง, คลิกขวา=ดูรายละเอียด`}
              >
                {/* วันที่ */}
                <div className={`text-sm sm:text-base font-semibold text-center ${textColor} leading-tight`}>
                  {day}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedDates.length > 0 && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 rounded-xl border-2 border-blue-200 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-md">
                <span className="text-white text-xs sm:text-sm font-bold">📅</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-gray-800">
                วันที่เลือก: <span className="text-blue-600">{selectedDates.length}</span> วัน
              </p>
            </div>
            <div className="flex-1"></div>
            <button
              onClick={() => {
                // ล้างทุกวันที่ในรายการ
                selectedDates.forEach(date => onDateSelect(date))
              }}
              className="text-xs px-2 sm:px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-full transition-colors duration-200 font-medium self-start sm:self-auto"
              title="ล้างทั้งหมด"
            >
              ล้างทั้งหมด
            </button>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {selectedDates.map((date, index) => (
              <div
                key={date}
                className="group relative inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg sm:rounded-xl border-2 border-blue-300 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
              >
                {/* Hover effect overlay - ย้ายมาไว้ด้านบนเพื่อไม่ทับปุ่ม */}
                <div className="absolute inset-0 rounded-lg sm:rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>

                <div className="flex items-center space-x-1 sm:space-x-2 relative z-10">
                  <div
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shadow-sm bg-blue-500"
                  ></div>
                  <span className="text-xs sm:text-sm font-bold text-gray-800">
                    {new Date(date).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // ลบวันที่นี้ออกจากรายการ
                      setSelectedDates(prev => prev.filter(d => d !== date))
                    }}
                    className="flex items-center justify-center w-4 h-4 sm:w-6 sm:h-6 ml-1 sm:ml-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-md hover:shadow-lg group-hover:animate-pulse z-20"
                    title="ลบวันที่นี้"
                  >
                    <span className="text-xs font-bold leading-none">✕</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* คำอธิบายวิธีใช้ - ย้ายมาไว้ด้านล่าง */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-lg sm:text-xl flex-shrink-0">💡</span>
          <div className="text-sm text-blue-800 flex-1 min-w-0">
            <p className="font-medium mb-2">วิธีใช้:</p>

            {/* Desktop */}
            <div className="hidden sm:block">
              <ul className="space-y-1 text-xs">
                <li>• <strong>คลิกเดียว</strong> = เลือกวันที่สำหรับแก้ไข</li>
                <li>• <strong>คลิกขวา</strong> = ดูรายละเอียดการจองในวันนั้น</li>
              </ul>
            </div>

            {/* Mobile */}
            <div className="sm:hidden">
              <ul className="space-y-1 text-xs">
                <li>• <strong>แตะครั้งเดียว</strong> = เลือกวันที่สำหรับแก้ไข</li>
                <li>• <strong>แตะค้างไว้</strong> = ดูรายละเอียดการจองในวันนั้น</li>
                <li>• <strong>หรือใช้ปุ่ม "ดูปฏิทินการจอง"</strong> ด้านบน</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal - เหมือนหน้า reserve ทุกอย่าง */}
      {showCalendarModal && selectedDate && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-500 ${modalAnimation ? 'backdrop-blur-md bg-black/20' : 'backdrop-blur-none bg-transparent'
            }`}
          onClick={closeModal}
        >
          <div
            className={`bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${modalAnimation ? 'scale-100 opacity-100 translate-y-0 rotate-0' : 'scale-50 opacity-0 translate-y-16 rotate-3'
              }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              filter: modalAnimation ? 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))' : 'none'
            }}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 animate-pulse delay-1000"></div>

              <div className="relative flex items-center justify-between text-white">
                <div className="flex items-center space-x-3 flex-1 pr-4">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg animate-pulse">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold mb-1">รายละเอียดการจอง</h3>
                    <p className="text-blue-100 text-sm font-medium">
                      {selectedDate.date.toLocaleDateString('th-TH', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm group hover:scale-110 active:scale-95 flex-shrink-0"
                >
                  <span className="text-xl group-hover:rotate-90 transition-transform duration-300 block">✕</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(80vh-180px)]">
              {/* Room Info */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0 shadow-sm">
                    <span className="text-xl">🏢</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg truncate mb-1">{selectedRoom?.room_name}</h4>
                    <p className="text-sm text-gray-600">ความจุ {selectedRoom?.capacity} คน • <span className="text-green-600 font-medium">ใช้งานได้</span></p>
                  </div>
                </div>
              </div>

              {/* Day Status */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                  <span className="mr-2 text-xl">📊</span>
                  สถานะ
                </h4>
                <div className="space-y-3">
                  {(() => {
                    if (!selectedDate.dayData) {
                      return (
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-500 rounded-lg flex-shrink-0"></div>
                            <div>
                              <span className="font-bold text-green-800">ว่างทั้งวัน</span>
                              <p className="text-sm text-green-700">สามารถจองได้ทุกช่วงเวลา</p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    const dayData = selectedDate.dayData
                    const slots = dayData.slots || []
                    const availableSlots = slots.filter(slot => slot.available).length
                    const totalSlots = slots.length
                    const colorInfo = calculateDayColor(dayData)

                    // แยกช่วงเช้า/บ่าย เพื่อตรวจสอบสถานะ
                    const morningSlots = slots.filter(slot => {
                      if (!slot?.start_time) return false
                      const hour = parseInt(slot.start_time.split(':')[0])
                      return hour < 12
                    })
                    const afternoonSlots = slots.filter(slot => {
                      if (!slot?.start_time) return false
                      const hour = parseInt(slot.start_time.split(':')[0])
                      return hour >= 12
                    })

                    const morningAvailable = morningSlots.filter(slot => slot.available).length
                    const afternoonAvailable = afternoonSlots.filter(slot => slot.available).length

                    const morningStatus = morningSlots.length === 0 ? 'ไม่มีข้อมูล' :
                      (morningAvailable > 0 ? 'ยังว่าง' : 'เต็มแล้ว')
                    const afternoonStatus = afternoonSlots.length === 0 ? 'ไม่มีข้อมูล' :
                      (afternoonAvailable > 0 ? 'ยังว่าง' : 'เต็มแล้ว')

                    return (
                      <div className="p-4 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-300" style={{
                        borderColor: colorInfo.color,
                        backgroundColor: colorInfo.color + '10'
                      }}>
                        <div className="flex items-start space-x-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1"
                            style={{ backgroundColor: colorInfo.color }}
                          >
                            <span className="text-white text-sm font-bold">
                              {availableSlots === totalSlots ? '✓' :
                                availableSlots === 0 ? '✕' :
                                  Math.round((availableSlots / totalSlots) * 100) + '%'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-lg font-bold text-gray-900 block mb-2">{colorInfo.text}</span>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-yellow-600 font-medium">🌅 ช่วงเช้า:</span>
                                <span className={`font-bold ${morningStatus === 'ยังว่าง' ? 'text-green-600' : morningStatus === 'เต็มแล้ว' ? 'text-red-600' : 'text-gray-500'}`}>
                                  {morningStatus}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-orange-600 font-medium">🌇 ช่วงบ่าย:</span>
                                <span className={`font-bold ${afternoonStatus === 'ยังว่าง' ? 'text-green-600' : afternoonStatus === 'เต็มแล้ว' ? 'text-red-600' : 'text-gray-500'}`}>
                                  {afternoonStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Footer Button */}
              <div className="text-center">
                <button
                  onClick={closeModal}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 hover:from-blue-700 hover:via-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 active:scale-95 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center">
                    <span className="mr-2 transition-transform duration-300 group-hover:scale-110">🚪</span>
                    ปิดหน้าต่าง
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal - เหมือนหน้า reserve ทุกอย่าง */}
      {showCalendarModal && !selectedDate && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ease-out transition-all duration-700 ${showCalendarModal
            ? 'bg-black/60 backdrop-blur-md opacity-100'
            : 'bg-black/20 backdrop-blur-none opacity-0'
            }`}
          style={{
            backdropFilter: showCalendarModal ? 'blur(8px)' : 'blur(0px)',
          }}
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-700 ease-out ${showCalendarModal
              ? 'scale-100 opacity-100 translate-y-0 rotate-0'
              : 'scale-85 opacity-0 translate-y-12 rotate-3'
              }`}
            style={{
              filter: showCalendarModal
                ? 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.25))'
                : 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15))',
              transformOrigin: 'center center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 p-6 text-white relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 animate-pulse delay-500"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/3 rounded-full animate-bounce delay-300"></div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg transform transition-all duration-500 hover:scale-110 hover:rotate-12">
                    <span className="text-2xl animate-bounce">📋</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold animate-fade-in-up">ปฏิทินการจอง</h3>
                    <p className="text-blue-100 animate-fade-in-up delay-100">{selectedRoom?.room_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm group hover:scale-110 hover:rotate-90 active:scale-95 transform"
                >
                  <span className="text-xl group-hover:rotate-180 transition-transform duration-300 block">✕</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-hide"
              style={{
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* Internet Explorer 10+ */
              }}>
              <style dangerouslySetInnerHTML={{
                __html: `
                  .scrollbar-hide::-webkit-scrollbar { 
                    display: none; /* Safari and Chrome */
                  }
                `
              }} />
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm">
                  คลิกวันที่เพื่อดูรายละเอียดการจองและช่วงเวลาที่ว่าง
                </p>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goToPrevMonth}
                  className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                >
                  <span className="text-xl group-hover:-translate-x-1 transition-transform duration-200 block">←</span>
                </button>

                <h4 className="text-xl font-bold text-gray-900 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>

                <button
                  onClick={goToNextMonth}
                  className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                >
                  <span className="text-xl group-hover:translate-x-1 transition-transform duration-200 block">→</span>
                </button>
              </div>

              {/* Calendar Grid - ดึงมาจากหน้า Calendar หลักทั้งหมด */}
              <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                {/* Days header */}
                {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day, index) => {
                  const shortNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
                  return (
                    <div key={day} className="p-2 md:p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0 bg-gray-50">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{shortNames[index]}</span>
                    </div>
                  )
                })}

                {/* Calendar days - แก้ไขให้ใช้ข้อมูลที่มีอยู่ */}
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0 bg-gray-100"></div>
                  }

                  const dayData = getDayData(day)
                  const colorInfo = calculateDayColor(dayData)

                  // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
                  const today = new Date()
                  const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  today.setHours(0, 0, 0, 0)
                  checkDate.setHours(0, 0, 0, 0)
                  const isPastDate = checkDate < today

                  // ใช้สีตามข้อมูลจริง
                  const backgroundColor = isPastDate ? '#D1D5DB' : colorInfo.color

                  return (
                    <div
                      key={day}
                      className={`
                        min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0
                        ${isPastDate
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer hover:shadow-lg transition-all duration-300'
                        }
                      `}
                      style={{ backgroundColor }}
                      onClick={() => {
                        if (!isPastDate) {
                          // ปิด calendar modal แล้วเปิด day detail modal
                          setShowCalendarModal(false)
                          handleDayClick(day)
                        }
                      }}
                    >
                      {/* วันที่ */}
                      <div className={`text-sm sm:text-base lg:text-lg font-bold ${isPastDate ? 'text-gray-500' : 'text-white'}`}>
                        {day}
                      </div>

                      {/* Status Text - แสดงเฉพาะวันที่ไม่ผ่านมา */}
                      {!isPastDate && (
                        <div className="text-xs text-center mt-1 px-1 py-1 rounded text-white font-medium hidden sm:block">
                          {colorInfo.text}
                        </div>
                      )}

                      {/* Mobile Status Indicator */}
                      {!isPastDate && (
                        <div className="sm:hidden flex justify-center mt-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorInfo.color }}></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend - ดึงมาจากหน้า Calendar หลักทั้งหมด */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-6 h-6 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: '#10B981' }}></div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 block">ว่างทั้งวัน</span>
                    <span className="text-xs text-gray-600">สามารถจองได้ทุกช่วงเวลา (8:00-22:00)</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-6 h-6 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: '#F59E0B' }}></div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 block">ว่างบางช่วง</span>
                    <span className="text-xs text-gray-600">มีช่วงเวลาว่างและช่วงที่จองแล้วปะปน</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-6 h-6 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: '#EF4444' }}></div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-gray-900 block">เต็มทั้งวัน</span>
                    <span className="text-xs text-gray-600">ไม่มีช่วงเวลาว่างให้จอง (จองหมดแล้ว)</span>
                  </div>
                </div>
              </div>

              {/* เพิ่มส่วนอธิบายเพิ่มเติม - ดึงมาจากหน้า Calendar หลัก */}
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 text-lg flex-shrink-0">📅</span>
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        <span className="font-bold">เวลาให้บริการ:</span> จันทร์-อาทิตย์ ตั้งแต่ 8:00-22:00 น.
                      </p>
                      <p className="text-xs text-blue-700 mb-2">
                        แบ่งเป็น 12 ช่วงเวลา (ชั่วโมงละ 1 ช่วง) สามารถจองได้ทุกวันรวมทั้งวันหยุดเสาร์-อาทิตย์
                      </p>
                      <p className="text-xs text-blue-700">
                        <span className="font-semibold">⚠️ หมายเหตุ:</span> ช่วง 12:00-13:00 น. เป็นช่วงพักเที่ยง อาจมีข้อจำกัดในการจองตามนโยบายของแต่ละหน่วยงาน
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-600 text-lg flex-shrink-0">💡</span>
                    <div>
                      <p className="text-sm text-purple-800 font-medium mb-1">
                        <span className="font-bold">วิธีใช้:</span> คลิกที่วันที่ต้องการเพื่อดูรายละเอียดการจอง
                      </p>
                      <p className="text-xs text-purple-700">
                        จะแสดงสถานะของแต่ละช่วงเวลา แบ่งเป็นช่วงเช้า (8:00-11:59) และช่วงบ่าย (12:00-22:00)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-600 text-lg flex-shrink-0">🚫</span>
                    <div>
                      <p className="text-sm text-gray-800 font-medium mb-1">
                        <span className="font-bold">วันที่ผ่านมาแล้ว:</span> แสดงเป็นสีเทาและไม่สามารถคลิกได้
                      </p>
                      <p className="text-xs text-gray-700">
                        ระบบจะไม่อนุญาตให้จองย้อนหลังหรือดูรายละเอียดของวันที่ผ่านมาแล้ว
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200/50 p-4 bg-gradient-to-r from-gray-50/80 via-blue-50/80 to-indigo-50/80 backdrop-blur-sm">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 hover:from-blue-700 hover:via-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center justify-center">
                  <span className="mr-2 transition-transform duration-300 group-hover:scale-110">🚪</span>
                  ปิดหน้าต่าง
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};