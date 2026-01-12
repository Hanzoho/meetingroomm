'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { calendarAPI, authUtils } from '@/lib/fetchData'
import { debugLog } from '@/utils/debug'
import AlertModal from '@/components/ui/alert-modal'

// Simple Custom Select Component that looks like native select but dropdown goes down
// ⏰ Simple Select สำหรับเวลา (ไม่มี search)
function SimpleTimeSelect({ value, onChange, options, className, placeholder, required, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (selectedValue) => {
    onChange({ target: { value: selectedValue } })
    setIsOpen(false)
  }

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
        onClick={() => setIsOpen(!isOpen)}
        className={className}
        required={required}
        style={{
          backgroundImage: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
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
          {/* Options List - ไม่มีส่วนค้นหา */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 ${index === options.length - 1 ? 'rounded-b-xl' : ''
                  } ${value === option.value ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-900'
                  }`}
              >
                <span className={`${value === option.value ? 'text-green-800' : 'text-gray-900'}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
    onChange({ target: { value: selectedValue } })
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

  // Filter options based on smart search
  const filteredOptions = options.filter(option =>
    smartSearch(searchTerm, option.label)
  )

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
        style={{
          backgroundImage: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
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
          {/* Search Input */}
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

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
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





// Main Component
export default function ReservePage() {
  const searchParams = useSearchParams()
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedDates, setSelectedDates] = useState([])


  // Alert Modal states
  const [showAlert, setShowAlert] = useState(false)
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'warning',
    showCancel: false,
    onConfirm: null
  })

  // ฟังก์ชันแสดง Alert
  const showAlertModal = (title, message, type = 'warning', onConfirm = null) => {
    setAlertConfig({
      title,
      message,
      type,
      showCancel: false,
      onConfirm
    })
    setShowAlert(true)
  }

  // ดึงข้อมูลห้องเมื่อ component mount - ใช้ calendarAPI เหมือนหน้าปฏิทินหลัก
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const result = await calendarAPI.getAllRooms()
        const allRooms = result.rooms || []
        setRooms(allRooms)

        // เช็คว่ามี room_id ใน URL parameters หรือไม่
        const roomId = searchParams.get('room_id')
        if (roomId && allRooms.length > 0) {
          const targetRoom = allRooms.find(room => room.room_id === parseInt(roomId))
          if (targetRoom) {
            setSelectedRoom(targetRoom)
            console.log('🎯 [RESERVE] Auto-selected room from URL:', targetRoom.room_name)
          } else {
            console.warn('⚠️ [RESERVE] Room ID not found:', roomId)
          }
        }
      } catch (error) {
        debugLog.error('Error fetching rooms:', error)
      } finally {
        // เพิ่ม delay standard เพื่อให้เห็นหน้าโหลด

      }
    }

    fetchRooms()
  }, [searchParams])

  // จัดการการเลือกวันที่ (toggle)
  const handleDateSelect = useCallback((dateStr) => {
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        // ถ้ามีอยู่แล้ว ให้ลบออก
        return prev.filter(date => date !== dateStr)
      } else {
        // ถ้ายังไม่มี ให้เพิ่มเข้าไป
        return [...prev, dateStr].sort()
      }
    })
  }, [])



  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            📅 จองห้องประชุม
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            เลือกห้องประชุมและวันที่ที่ต้องการจอง
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Room Selection - แสดงก่อนเสมอ */}
          <div className="order-1">
            <RoomSelector
              rooms={rooms}
              selectedRoom={selectedRoom}
              onRoomSelect={setSelectedRoom}
            />
          </div>

          {/* Layout for Calendar and Booking Info */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Calendar - แสดงที่ 2 ใน mobile, ขวาใน desktop */}
            <div className="xl:col-span-2 xl:order-2 order-2">
              <CalendarView
                selectedRoom={selectedRoom}
                selectedDates={selectedDates}
                setSelectedDates={setSelectedDates}
                onDateSelect={handleDateSelect}
                showAlertModal={showAlertModal}
              />
            </div>

            {/* Booking Info - แสดงที่ 3 ใน mobile, ซ้ายใน desktop */}
            <div className="xl:col-span-1 xl:order-1 order-3">
              <BookingInfo
                selectedRoom={selectedRoom}
                selectedDates={selectedDates}
                showAlertModal={showAlertModal}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  )
}

// Room Selector Component
function RoomSelector({ rooms, selectedRoom, onRoomSelect }) {

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-xl">🏢</span>
        <h2 className="text-lg font-semibold text-gray-800">
          เลือกห้องประชุม
        </h2>
      </div>

      <SimpleCustomSelect
        value={selectedRoom?.room_id || ''}
        onChange={(e) => {
          const roomId = e.target.value
          const room = rooms.find(r => r.room_id === parseInt(roomId))
          onRoomSelect(room)
        }}
        options={[
          { value: '', label: 'กรุณาเลือกห้องประชุม...' },
          ...rooms
            .filter((room, index, arr) =>
              arr.findIndex(r => r.room_id === room.room_id) === index
            )
            .filter(room => room.status_m === 'available') // เฉพาะห้องที่พร้อมใช้งาน
            .map(room => ({
              value: room.room_id,
              label: `${room.room_name} (รองรับ ${room.capacity} คน)`
            }))
        ]}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-white appearance-none cursor-pointer text-gray-900"
        placeholder="เลือกห้องประชุม"
        required
      />

      {selectedRoom && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-start space-x-2">
            <span className="text-green-600 text-sm">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">{selectedRoom.room_name}</p>
              <p className="text-xs text-green-600">ความจุ: {selectedRoom.capacity} คน</p>
              {selectedRoom.location_m && (
                <p className="text-xs text-green-600 truncate">สถานที่: {selectedRoom.location_m}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Booking Info Component
function BookingInfo({ selectedRoom, selectedDates, showAlertModal }) {
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [purpose, setPurpose] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeOptions = useMemo(() => {
    const options = []
    // เวลาทำการใหม่ 08:00-22:00 (ตามที่อาจารย์กำหนด)
    // รวมถึงช่วงเที่ยง 12:00-13:00
    for (let hour = 8; hour <= 22; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      options.push(timeStr)
    }
    return options
  }, [])

  // สร้าง endTimeOptions ที่เริ่มจากชั่วโมงถัดไปของ startTime
  const endTimeOptions = useMemo(() => {
    const startHour = parseInt(startTime.split(':')[0])
    const options = []

    // เริ่มจากชั่วโมงถัดไปของ startTime จนถึง 22:00 (ช่วงสุดท้าย 21:00-22:00)
    for (let hour = startHour + 1; hour <= 22; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`
      options.push(timeStr)
    }
    return options
  }, [startTime])

  // Auto-update endTime เมื่อ startTime เปลี่ยน
  useEffect(() => {
    const startHour = parseInt(startTime.split(':')[0])
    const endHour = parseInt(endTime.split(':')[0])

    // ถ้า endTime น้อยกว่าหรือเท่ากับ startTime ให้อัปเดตเป็นชั่วโมงถัดไป
    if (endHour <= startHour) {
      const nextHour = startHour + 1
      if (nextHour <= 22) {
        setEndTime(`${nextHour.toString().padStart(2, '0')}:00`)
      }
    }
  }, [startTime, endTime])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedRoom) {
      showAlertModal(
        'ข้อมูลไม่ครบถ้วน',
        'กรุณาเลือกห้องประชุม',
        'warning'
      )
      return
    }

    if (selectedDates.length === 0) {
      showAlertModal(
        'ข้อมูลไม่ครบถ้วน',
        'กรุณาเลือกวันที่จอง',
        'warning'
      )
      return
    }

    if (!purpose.trim()) {
      showAlertModal(
        'ข้อมูลไม่ครบถ้วน',
        'กรุณาระบุวัตถุประสงค์การจอง',
        'warning'
      )
      return
    }

    if (startTime >= endTime) {
      showAlertModal(
        'เวลาไม่ถูกต้อง',
        'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด',
        'warning'
      )
      return
    }

    setIsSubmitting(true)

    try {
      let token = authUtils.getToken()

      // Fallback: ลองดึง token จาก localStorage โดยตรง
      if (!token) {
        token = localStorage.getItem('token')
      }

      if (!token) {
        showAlertModal(
          'เซสชันหมดอายุ',
          'กรุณาเข้าสู่ระบบใหม่',
          'warning',
          () => {
            window.location.href = '/login'
          }
        )
        return
      }

      // ตรวจสอบสถานะห้องก่อนจอง
      if (selectedRoom?.status_m !== 'available') {
        showAlertModal(
          'ห้องไม่พร้อมใช้งาน',
          'ห้องประชุมนี้ไม่พร้อมใช้งานในขณะนี้ กรุณาเลือกห้องอื่น',
          'warning'
        )
        return
      }

      // Debug log ข้อมูลก่อนส่ง
      console.log('🔍 [RESERVE] ข้อมูลการจอง:', {
        selectedRoom: selectedRoom,
        selectedDates: selectedDates,
        startTime: startTime,
        endTime: endTime,
        purpose: purpose.trim(),
        token: token ? 'มี token' : 'ไม่มี token'
      })

      // 🚨 ขั้นตอนที่ 1: ตรวจสอบความพร้อมของทุกวันก่อนจองจริง
      console.log('🔍 [RESERVE] กำลังตรวจสอบความพร้อมของทุกวัน...')

      const conflictDates = []

      for (const date of selectedDates) {
        // ดึงข้อมูลปฏิทินสำหรับวันที่นั้น
        const dateObj = new Date(date)
        const month = dateObj.getMonth() + 1
        const year = dateObj.getFullYear()

        console.log(`🔍 [RESERVE] ตรวจสอบวันที่ ${date}, room ${selectedRoom.room_id}`)

        try {
          const calendarResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/calendar/${selectedRoom.room_id}?month=${month}&year=${year}&detailed=true`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          )

          console.log(`📡 [RESERVE] Calendar API response: ${calendarResponse.status}`)

          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json()
            console.log(`📊 [RESERVE] Calendar data for ${date}:`, calendarData)

            // หาข้อมูลวันที่เฉพาะ
            const targetDateStr = date // format: "2025-08-18"
            let dayData = null

            if (calendarData.calendar?.daily_availability) {
              dayData = calendarData.calendar.daily_availability.find(d => d.date === targetDateStr)
              console.log(`📅 [RESERVE] Day data for ${targetDateStr}:`, dayData)
            }

            if (dayData && dayData.slots) {
              // ตรวจสอบว่าช่วงเวลาที่เลือกว่างไหม
              const [startHour, startMinute] = startTime.split(':').map(Number)
              const [endHour, endMinute] = endTime.split(':').map(Number)

              console.log(`⏰ [RESERVE] ตรวจสอบเวลา ${startHour}:00-${endHour}:00`)

              // หา slot ที่ตรงกับเวลาที่เลือก
              const hasConflict = dayData.slots.some(slot => {
                if (!slot.start_time || !slot.end_time) return false

                const slotStartHour = parseInt(slot.start_time.split(':')[0])
                const slotEndHour = parseInt(slot.end_time.split(':')[0])

                console.log(`🔎 [RESERVE] Checking slot ${slotStartHour}:00-${slotEndHour}:00, available: ${slot.available}`)

                // ตรวจสอบว่าเวลาทับซ้อนและ slot ไม่ว่าง
                const timeOverlap = (startHour < slotEndHour) && (slotStartHour < endHour)
                const conflict = timeOverlap && !slot.available

                if (conflict) {
                  console.log(`⚠️ [RESERVE] Conflict detected! Slot ${slotStartHour}:00-${slotEndHour}:00 is not available`)
                }

                return conflict
              })

              if (hasConflict) {
                console.log(`❌ [RESERVE] วันที่ ${date} มีการจองซ้อน`)
                conflictDates.push({
                  date: date,
                  dateLabel: dateObj.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                  }),
                  time: `${startTime}-${endTime}`,
                  error: 'มีการจองแล้ว'
                })
              } else {
                console.log(`✅ [RESERVE] วันที่ ${date} ยังว่าง`)
              }
            } else {
              console.log(`📭 [RESERVE] ไม่มีข้อมูล slots สำหรับวันที่ ${date}`)
            }
          } else {
            console.error(`❌ [RESERVE] Calendar API failed: ${calendarResponse.status}`)
            // ถ้า API ล้มเหลว ให้ถือว่ามี conflict เพื่อความปลอดภัย (ไม่ให้จอง)
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
          console.error(`❌ [RESERVE] Error checking date ${date}:`, error)
          // Network error - ถือว่ามี conflict เพื่อความปลอดภัย (ไม่ให้จอง)
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

      // 🚨 ถ้ามีวันที่ขัดแย้ง แสดง Alert และหยุดการจอง
      if (conflictDates.length > 0) {
        console.log('❌ [RESERVE] พบความขัดแย้ง:', conflictDates)

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

        showAlertModal(
          'ไม่สามารถจองได้',
          conflictMessage,
          'error'
        )

        setIsSubmitting(false)
        return
      }

      // 🎉 ขั้นตอนที่ 2: ถ้าทุกวันผ่านการตรวจสอบแล้ว จึงจองจริง
      console.log('✅ [RESERVE] ทุกวันพร้อมจอง เริ่มการจองจริง...')

      // แปลงเวลาให้เป็น full datetime
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)

      // หาวันที่เริ่มต้นและสิ้นสุด (สำหรับ multi-day booking)
      const sortedDates = [...selectedDates].sort()
      const startDate = sortedDates[0]
      const endDate = sortedDates[sortedDates.length - 1]

      console.log('📅 [RESERVE] Multi-day booking:', { startDate, endDate, totalDays: selectedDates.length })

      // สร้างข้อมูลการจองแบบ multi-day (ส่งครั้งเดียว)
      const startDateObj = new Date(startDate)
      startDateObj.setHours(startHour, startMinute, 0, 0)

      const endDateObj = new Date(endDate)
      endDateObj.setHours(endHour, endMinute, 0, 0)

      const bookingData = {
        room_id: selectedRoom.room_id,
        start_at: startDate, // วันที่เริ่มต้น
        end_at: endDate,     // วันที่สิ้นสุด  
        start_time: startDateObj.toISOString(),
        end_time: endDateObj.toISOString(),
        details_r: purpose.trim(),
        booking_dates: selectedDates, // ส่งรายการวันที่ทั้งหมดที่เลือก
        is_multi_day: selectedDates.length > 1 // flag สำหรับ multi-day
      }

      console.log('📤 [RESERVE] ส่งข้อมูลการจอง Multi-day:', bookingData)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/reservations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      console.log('📥 [RESERVE] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('❌ [RESERVE] Error response:', errorData)
        throw new Error(errorData.message || `เกิดข้อผิดพลาดในการจอง (${response.status})`)
      }

      const result = await response.json()
      console.log('✅ [RESERVE] จองสำเร็จ:', result)

      // แสดง Alert สำเร็จด้วย UI ที่สวย
      showAlertModal(
        'จองห้องประชุมสำเร็จ!',
        'การจองของคุณได้รับการยืนยันแล้ว',
        'success',
        () => {
          // รีเซ็ตฟอร์มและ refresh หน้า
          setStartTime('08:00')
          setEndTime('09:00')
          setPurpose('')
          window.location.reload()
        }
      )

    } catch (error) {
      debugLog.error('Error booking room:', error)

      // กำหนด error message ที่เข้าใจง่าย
      let errorTitle = '❌ เกิดข้อผิดพลาด'
      let errorMessage = error.message

      if (error.message?.includes('ไม่พร้อมใช้งาน')) {
        errorTitle = 'ห้องไม่พร้อมใช้งาน'
        errorMessage = 'ห้องประชุมนี้ไม่พร้อมใช้งานในขณะนี้\nกรุณาเลือกห้องอื่นหรือลองใหม่ภายหลัง'
      } else if (error.message?.includes('มีการจองแล้ว')) {
        errorTitle = 'เวลานี้ถูกจองแล้ว'
        errorMessage = 'ช่วงเวลาที่เลือกมีการจองแล้ว\nกรุณาเลือกเวลาใหม่'
      }

      // แสดง Error Alert ด้วย UI ที่สวย
      showAlertModal(
        errorTitle,
        errorMessage,
        'error'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-xl">📝</span>
        <h2 className="text-lg font-semibold text-gray-800">
          ข้อมูลการจอง
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Time Selection - Full width on mobile, side by side on larger screens */}
        <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
          <SimpleTimeSelect
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            options={timeOptions.map(time => ({ value: time, label: `${time} น.` }))}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md relative"
            placeholder="เลือกเวลาเริ่มต้น"
            label="⏰ เวลาเริ่มต้น"
            required
          />

          <SimpleTimeSelect
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            options={endTimeOptions.map(time => ({ value: time, label: `${time} น.` }))}
            className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:border-green-300 transition-colors duration-200 cursor-pointer shadow-sm hover:shadow-md relative"
            placeholder="เลือกเวลาสิ้นสุด"
            label="⏰ เวลาสิ้นสุด"
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

        <button
          type="submit"
          disabled={!selectedRoom || selectedDates.length === 0 || isSubmitting}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-3 sm:py-4 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl disabled:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              กำลังจอง...
            </>
          ) : (
            <>
              <span className="mr-2">📅</span>
              จองห้องประชุม
            </>
          )}
        </button>
      </form>
    </div>
  )
}

// Calendar Component (Enhanced Multi-Day Selection)
function CalendarView({ selectedRoom, selectedDates, setSelectedDates, onDateSelect, showAlertModal }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState(null)
  const [calendarLoading, setCalendarLoading] = useState(false)
  
  // Modal states สำหรับแสดงรายละเอียดการจอง
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalAnimation, setModalAnimation] = useState(false)


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

      // ใช้ getDetailedCalendar เหมือนหน้าปฏิทินหลักเพื่อให้ได้ข้อมูลเหมือนกัน
      const result = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, month, year, {
        timestamp: Date.now(),
        source: 'reserve-page',
        forceRefresh: true,
        _cache_bust: Math.random()
      })

      // Debug: เพิ่ม logging เพื่อเปรียบเทียบข้อมูล
      console.log('🔍 [RESERVE] Calendar API Response:', {
        roomId: selectedRoom.room_id,
        month,
        year,
        hasData: !!result,
        hasCalendar: !!(result?.calendar),
        hasDailyAvailability: !!(result?.calendar?.daily_availability),
        totalDays: result?.calendar?.daily_availability?.length || 0,
        // เพิ่มข้อมูลวันที่ 19
        day19Data: result?.calendar?.daily_availability?.find(d => d.date === '2025-08-19'),
        fullResponse: result
      })

      // ตรวจสอบข้อมูลดิบของวันที่ 17
      if (result?.calendar) {
        console.log('🔍 [RESERVE] Calendar structure:', {
          isArray: Array.isArray(result.calendar),
          type: typeof result.calendar,
          keys: Object.keys(result.calendar || {}),
          calendar: result.calendar,
          fullAPIResponse: result,
          timestamp: Date.now(),
          apiUrl: '/api/reservations/calendar/' + selectedRoom.room_id + '?month=' + month + '&year=' + year + '&detailed=true'
        })

        // ตรวจสอบว่า calendar เป็น array หรือไม่
        let day17Data = null
        if (Array.isArray(result.calendar)) {
          day17Data = result.calendar.find(day => day.date === '2025-08-17')
        } else if (result.calendar.daily_availability) {
          day17Data = result.calendar.daily_availability.find(day => day.date === '2025-08-17')
        }

        if (day17Data) {
          console.log('🔍 [RESERVE] Raw Day 17 Data:', day17Data)
          console.log('🔍 [RESERVE] Day 17 Slots:', day17Data.slots)
          console.log('🔍 [RESERVE] Day 17 Reservations:', day17Data.reservations)
        }
      }

      setCalendarData(result)
    } catch (error) {
      console.error('❌ [RESERVE] Error fetching calendar data:', error)
    } finally {
      setCalendarLoading(false)
    }
  }, [selectedRoom, currentMonth])

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  // ฟังก์ชันคำนวณสีตาม logic ใน calendar page - ใช้เหมือนหน้าปฏิทินหลักทุกประการ
  const getDayStatus = useCallback((dayAvailability) => {
    // ถ้าไม่มีข้อมูล ให้แสดงเป็นสีเขียว (ว่างทั้งวัน)
    if (!dayAvailability) {
      return 'available'
    }

    const { day_of_week, slots = [] } = dayAvailability

    // นับ slots ที่ว่าง (ทุกวันสามารถจองได้ รวมเสาร์-อาทิตย์)
    const availableSlots = slots.filter(slot => slot.available).length
    const totalSlots = slots.length

    if (totalSlots === 0) {
      return 'available'
    }

    if (availableSlots === totalSlots) {
      return 'available'
    } else if (availableSlots === 0) {
      return 'full'
    } else {
      return 'partial'
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

    // ดึงข้อมูลวันนั้น
    const dayData = getDayData(day)

    if (!dayData) {
      return 'available' // ถ้าไม่มีข้อมูล = ว่างทั้งวัน
    }

    // ใช้ฟังก์ชัน getDayStatus เพื่อตรวจสอบสถานะ
    return getDayStatus(dayData)
  }, [currentMonth, getDayData, getDayStatus])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'available':
        return 'text-white font-semibold border-2 border-white' // กลับไปใช้สีขาวในปฏิทิน
      case 'partial':
        return 'text-white font-semibold border-2 border-white' // กลับไปใช้สีขาวในปฏิทิน
      case 'full':
        return 'text-white font-semibold border-2 border-white cursor-not-allowed' // กลับไปใช้สีขาวในปฏิทิน
      case 'past':
        return 'bg-gray-300 text-gray-500 border-2 border-gray-400 cursor-not-allowed' // วันที่ผ่านมาแล้ว
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
      case 'past': return '#9CA3AF'      // เทา (วันที่ผ่านมาแล้ว)
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
      showAlertModal(
        '⚠️ ไม่สามารถจองได้',
        'ไม่สามารถจองวันที่ผ่านมาแล้วได้\nกรุณาเลือกวันที่ในอนาคต',
        'warning'
      )
      return
    }

    // Alert และไม่ให้เลือกวันที่เต็ม
    if (status === 'full') {
      showAlertModal(
        '⚠️ วันที่เต็มแล้ว',
        'วันที่นี้ถูกจองเต็มแล้ว\nกรุณาเลือกวันอื่น',
        'warning'
      )
      return
    }

    onDateSelect(dateStr)
  }, [currentMonth, getDateStatus, onDateSelect])

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

  // ฟังก์ชันปิด Modal
  const closeModal = () => {
    setModalAnimation(false)
    setTimeout(() => {
      setShowModal(false)
      setSelectedDate(null)
    }, 200)
  }

  // ฟังก์ชันจัดการการคลิกวันที่ - เหมือนหน้า calendar หลักแต่แสดง popup
  const handleDayClick = useCallback(async (day) => {
    if (!day) return

    const today = new Date()
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    today.setHours(0, 0, 0, 0)
    clickedDate.setHours(0, 0, 0, 0)

    // ถ้าเป็นวันที่ผ่านมาแล้ว ไม่ต้องแสดง modal
    if (clickedDate < today) return

    // Force refresh ข้อมูลรายละเอียดก่อนแสดง modal - ใช้ getDetailedCalendar เหมือนหน้า calendar หลัก
    try {
      const month = currentMonth.getMonth() + 1
      const year = currentMonth.getFullYear()

      // ใช้ getDetailedCalendar เหมือนหน้า calendar หลักเพื่อให้ได้ข้อมูลเหมือนกัน
      const detailedResult = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, month, year, {
        timestamp: Date.now(),
        source: 'reserve-page-popup',
        forceRefresh: true,
        _cache_bust: Math.random()
      })

      // อัพเดท calendarData ด้วยข้อมูลล่าสุด
      setCalendarData(detailedResult)

      // ดึงข้อมูลวันนั้นจากข้อมูลใหม่ - แก้ไขให้ใช้โครงสร้างเดียวกับหน้า calendar หลัก
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      let dayData = null

      // ค้นหาข้อมูลจาก daily_availability เหมือนหน้า calendar หลัก
      if (detailedResult?.calendar?.daily_availability) {
        dayData = detailedResult.calendar.daily_availability.find(d => d.date === dateStr)
      }

      // แสดง popup รายละเอียดการจอง
      const today = new Date()
      const isPastDate = clickedDate < today
      
      setSelectedDate({ 
        date: clickedDate, 
        dayData: dayData, 
        isHistoryMode: isPastDate 
      })
      setShowModal(true)
      setTimeout(() => setModalAnimation(true), 10)
      
    } catch (error) {
      console.error('❌ [RESERVE] Error fetching detailed calendar:', error)
      // Fallback: แสดง popup ว่าง
      const today = new Date()
      const isPastDate = clickedDate < today
      
      setSelectedDate({ 
        date: clickedDate, 
        dayData: null, 
        isHistoryMode: isPastDate 
      })
      setShowModal(true)
      setTimeout(() => setModalAnimation(true), 10)
    }
  }, [currentMonth, selectedRoom, getDayData])



  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
          <span className="mr-2">📅</span>
          เลือกวันที่จอง
        </h2>

        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
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

      {/* สถานะสี - ปรับให้ responsive */}
      {/* เอา legend สีออก - ตามคำสั่งอาจารย์ */}

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
            เลือกห้องประชุมที่ต้องการจองเพื่อแสดงปฏิทินการจอง
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

            // ใช้สีเขียวอย่างเดียว - ตามคำสั่งอาจารย์
            const backgroundColor = isPastDate ? '#D1D5DB' : '#10B981'
            const textColor = isPastDate ? 'text-gray-500' : 'text-white'

            return (
              <div
                key={`calendar-day-${index}`}
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
                  rounded-lg
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
                title={`${day} ${monthNames[currentMonth.getMonth()]} - ${isPastDate ? 'วันที่ผ่านมาแล้ว' : 'สามารถจองได้'
                  } | มือถือ: แตะ=เลือกจอง, แตะค้าง=ดูรายละเอียด | คอม: คลิก=เลือกจอง, คลิกขวา=ดูรายละเอียด`}
              >
                {/* วันที่ */}
                <div className={`text-xs sm:text-sm font-bold text-center ${textColor} leading-tight`}>
                  {day}
                </div>

                {/* เอาข้อความสถานะออก - ตามคำสั่งอาจารย์ */}
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
                key={`selected-date-${index}`}
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
                      console.log('ปุ่ม ✕ ถูกกด:', date) // เพิ่ม console.log เพื่อ debug
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
                <li>• <strong>คลิกเดียว</strong> = เลือกวันที่สำหรับจอง</li>
                <li>• <strong>คลิกขวา</strong> = ดูรายละเอียดการจองในวันนั้น</li>
              </ul>
            </div>

            {/* Mobile */}
            <div className="sm:hidden">
              <ul className="space-y-1 text-xs">
                <li>• <strong>แตะครั้งเดียว</strong> = เลือกวันที่สำหรับจอง</li>
                <li>• <strong>แตะค้างไว้</strong> = ดูรายละเอียดการจองในวันนั้น</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal แสดงรายละเอียดวันที่ - เหมือนหน้า calendar หลักทุกอย่าง */}
      {showModal && selectedDate && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-500 ${modalAnimation ? 'backdrop-blur-md bg-black/20' : 'backdrop-blur-none bg-transparent'}`}
          onClick={closeModal}
        >
          <div
            className={`bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${modalAnimation ? 'scale-100 opacity-100 translate-y-0 rotate-0' : 'scale-50 opacity-0 translate-y-16 rotate-3'}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              filter: modalAnimation ? 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))' : 'none'
            }}
          >
            {/* Modal Header - ปรับปรุงใหม่ พร้อมไล่โทนสวยขึ้น */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full transform -translate-x-12 translate-y-12"></div>

              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {selectedDate.isHistoryMode ? 'รายการย้อนหลัง' : 'รายละเอียดการจอง'}
                </h3>
                <p className="text-blue-100 text-sm font-medium">
                  {selectedDate.date.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                {/* แสดงสถานะห้องใน header */}
                <div className="mt-2 flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRoom?.status_m === 'available' ? 'bg-green-300' : 'bg-red-300'}`}></div>
                  <span className="text-blue-100 text-xs">
                    {selectedRoom?.room_name} • {selectedRoom?.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                  </span>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
              >
                <span className="text-white text-lg font-bold">×</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* ห้องที่เลือก - แสดงเฉพาะเมื่อมีห้อง */}
              {selectedRoom && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0 shadow-sm">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-lg truncate mb-1">{selectedRoom?.room_name}</h4>
                      <p className="text-sm text-gray-600">
                        ความจุ {selectedRoom?.capacity} คน •
                        <span className={`font-medium ${selectedRoom?.status_m === 'available' ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedRoom?.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability Summary - เปลี่ยนเป็น "สถานะ" */}
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
                    const totalBookings = dayData.total_reservations || 0

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
                      <div className="p-4 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-300 bg-white border-gray-200">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1 bg-blue-500">
                            <span className="text-white text-sm font-bold">
                              {availableSlots === totalSlots ? '✓' :
                                availableSlots === 0 ? '✕' :
                                  Math.round((availableSlots / totalSlots) * 100) + '%'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-lg font-bold text-gray-900 block mb-2">รายละเอียดการจอง</span>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-yellow-600 font-medium">ช่วงเช้า:</span>
                                <span className={`font-bold ${morningStatus === 'ยังว่าง' ? 'text-green-600' : morningStatus === 'เต็มแล้ว' ? 'text-red-600' : 'text-gray-500'}`}>
                                  {morningStatus}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-orange-600 font-medium">ช่วงบ่าย:</span>
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

              {/* รายชื่อผู้จองทั้งหมดในวันนี้ */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3 text-lg flex items-center">
                  <span className="mr-2 text-xl">👥</span>
                  รายชื่อผู้จองทั้งหมด ({selectedDate.dayData?.total_reservations || 0} ครั้ง)
                </h4>
                {(() => {
                  if (!selectedDate.dayData) {
                    return (
                      <div className="text-center py-4 text-gray-500">
                        <span className="text-2xl mb-2 block">❌</span>
                        <p>ไม่พบข้อมูลวันที่นี้</p>
                      </div>
                    )
                  }

                  if (!selectedDate.dayData.slots) {
                    return (
                      <div className="text-center py-4 text-gray-500">
                        <span className="text-2xl mb-2 block">⏰</span>
                        <p>ไม่มีช่วงเวลาการจอง</p>
                      </div>
                    )
                  }

                  // รวมรายการจองทั้งหมด
                  const allBookings = []
                  selectedDate.dayData.slots.forEach(slot => {
                    if (slot.reservations && slot.reservations.length > 0) {
                      slot.reservations.forEach(reservation => {
                        if (!allBookings.find(booking => booking.reservation_id === reservation.reservation_id)) {
                          allBookings.push({
                            ...reservation,
                            slot_time: `${slot.start_time?.substring(0, 5)} - ${slot.end_time?.substring(0, 5)}`
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
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${(booking.status_r === 'confirmed' || booking.status === 'confirmed')
                                  ? 'bg-green-200 text-green-800'
                                  : (booking.status_r === 'pending' || booking.status === 'pending')
                                    ? 'bg-yellow-200 text-yellow-800'
                                    : 'bg-gray-200 text-gray-800'
                                  }`}>
                                  {(booking.status_r === 'confirmed' || booking.status === 'confirmed') ? 'อนุมัติแล้ว' :
                                    (booking.status_r === 'pending' || booking.status === 'pending') ? 'รออนุมัติ' : 'ไม่ระบุสถานะ'}
                                </span>
                              </div>

                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <span>🕐</span>
                                  <span>
                                    {(() => {
                                      // ลองหาเวลาจาก field ต่างๆ เหมือนหน้าจอง
                                      if (booking.time_range) {
                                        return booking.time_range
                                      }
                                      if (booking.start_time && booking.end_time) {
                                        return `${booking.start_time?.substring(0, 5) || ''}-${booking.end_time?.substring(0, 5) || ''}`
                                      }
                                      if (booking.slot_start_time && booking.slot_end_time) {
                                        return `${booking.slot_start_time?.substring(0, 5) || ''}-${booking.slot_end_time?.substring(0, 5) || ''}`
                                      }
                                      if (booking.slot_time) {
                                        return booking.slot_time
                                      }
                                      // หาจาก created_at ถ้าไม่มีอะไรเลย
                                      if (booking.created_at) {
                                        const date = new Date(booking.created_at)
                                        return `สร้างเมื่อ ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                      }
                                      return 'ไม่ระบุเวลา'
                                    })()}
                                  </span>
                                </div>

                                {(booking.department_name || booking.user_department) && (
                                  <div className="flex items-center space-x-2">
                                    <span>🏢</span>
                                    <span>{booking.department_name || booking.user_department}</span>
                                    {(booking.role_name || booking.user_position) && <span>• {booking.role_name || booking.user_position}</span>}
                                  </div>
                                )}

                                {(booking.details_r || booking.details || booking.purpose) && (
                                  <div className="flex items-center space-x-2 break-words">
                                    <span>📝</span>
                                    <span className="break-all">{booking.details_r || booking.details || booking.purpose}</span>
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

              {/* Time Slots - แบ่งช่วงเช้า/บ่าย ปรับขนาดให้พอดี */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <span className="mr-2 text-xl">⏰</span>
                  ช่วงเวลาการจอง
                </h4>

                {(() => {
                  const slots = selectedDate.dayData?.slots || []

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
                            ช่วงเช้า (8:00-12:00 น.)
                            <span className="ml-3 text-xs bg-gradient-to-r from-yellow-200 to-orange-200 text-yellow-800 px-3 py-1 rounded-full font-bold">
                              {morningSlots.filter(s => s.available).length > 0 ? 'ยังว่าง' : 'เต็มแล้ว'}
                            </span>
                          </h5>

                          {/* แสดงสถานะแต่ละช่วงเวลา */}
                          <div className="space-y-2 mb-3">
                            {morningSlots.map((slot, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg transition-all duration-200 ${slot.available
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between text-sm font-medium mb-2">
                                  <span className="flex items-center space-x-2">
                                    <span className="text-base">
                                      {slot.available ? '✅' : '❌'}
                                    </span>
                                    <span>
                                      {slot.start_time && slot.end_time ?
                                        `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}` :
                                        'ไม่มีข้อมูลเวลา'
                                      }
                                    </span>
                                  </span>
                                  <span className="font-bold">
                                    {slot.available ? 'ยังว่าง' : 'จองแล้ว'}
                                  </span>
                                </div>

                                {/* แสดงรายชื่อผู้จอง */}
                                {!slot.available && slot.reservations && slot.reservations.length > 0 && (
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
                                        {reservation.user_department && (
                                          <div className="text-gray-600 mt-1">
                                            🏢 {reservation.user_department}
                                            {reservation.user_position && ` • ${reservation.user_position}`}
                                          </div>
                                        )}
                                        {reservation.details && (
                                          <div className="text-gray-600 mt-1 break-words">
                                            📝 <span className="break-all">{reservation.details}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
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
                              {afternoonSlots.filter(s => s.available).length > 0 ? 'ยังว่าง' : 'เต็มแล้ว'}
                            </span>
                          </h5>

                          {/* แสดงสถานะแต่ละช่วงเวลา */}
                          <div className="space-y-2 mb-3">
                            {afternoonSlots.map((slot, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg transition-all duration-200 ${slot.available
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between text-sm font-medium mb-2">
                                  <span className="flex items-center space-x-2">
                                    <span className="text-base">
                                      {slot.available ? '✅' : '❌'}
                                    </span>
                                    <span>
                                      {slot.start_time && slot.end_time ?
                                        `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}` :
                                        'ไม่มีข้อมูลเวลา'
                                      }
                                    </span>
                                  </span>
                                  <span className="font-bold">
                                    {slot.available ? 'ยังว่าง' : 'จองแล้ว'}
                                  </span>
                                </div>

                                {/* แสดงรายชื่อผู้จอง */}
                                {!slot.available && slot.reservations && slot.reservations.length > 0 && (
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
                                        {reservation.user_department && (
                                          <div className="text-gray-600 mt-1">
                                            🏢 {reservation.user_department}
                                            {reservation.user_position && ` • ${reservation.user_position}`}
                                          </div>
                                        )}
                                        {reservation.details && (
                                          <div className="text-gray-600 mt-1 break-words">
                                            📝 <span className="break-all">{reservation.details}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>


            </div>
          </div>
        </div>
      )}

    </div>
  )
}