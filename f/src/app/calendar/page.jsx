'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { calendarAPI, authUtils } from '@/lib/fetchData'
import { debugLog } from '@/utils/debug'
import { getThemeColors, getGradientBg, validateRole } from '@/utils/theme'
import DashboardLayout from '@/components/layout/DashboardLayout'





export default function CalendarPage() {
  const router = useRouter()

  // โหลด user ทันทีจาก localStorage เพื่อป้องกันการแสดงผลผิด role
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        // ลองโหลด user จาก localStorage ก่อน
        const userData = authUtils.getUserWithRole()

        if (userData && userData.role) {
          debugLog.log(`🚀 โหลด user เริ่มต้น: role=${userData.role}, id=${userData.user_id}`)
          return userData
        } else {
          debugLog.warn('⚠️ ไม่พบข้อมูล user ในการโหลดเริ่มต้น')
          return null
        }
      } catch (error) {
        debugLog.error('❌ Error โหลด user เริ่มต้น:', error)
        return null
      }
    }
    return null
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [rooms, setRooms] = useState([])
  const [calendarData, setCalendarData] = useState(null)
  const [additionalMonthsData, setAdditionalMonthsData] = useState({}) // เก็บข้อมูลของเดือนอื่น ๆ
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalAnimation, setModalAnimation] = useState(false)

  // เอา showHistoryMode ออก - แสดงประวัติย้อนหลังเสมอตามคำสั่งอาจารย์

  // 🔍 Search states สำหรับ room selector
  const [roomSearchQuery, setRoomSearchQuery] = useState('')
  const [showRoomDropdown, setShowRoomDropdown] = useState(false)
  const [filteredRooms, setFilteredRooms] = useState([])

  // Helper function สำหรับจัดการ error และ token
  const handleError = (error, context) => {
    debugLog.error(`❌ ${context}:`, error)

    // ตรวจสอบว่าเป็น error ที่เกี่ยวข้องกับ authentication หรือไม่
    if (error.message?.includes('Token expired') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Invalid token') ||
      error.response?.status === 401) {

      debugLog.warn('🔐 Token หมดอายุหรือไม่ถูกต้อง - เด้งไปหน้า login')

      // ล้างข้อมูลและ redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      return
    }

    // Error อื่นๆ
    setError(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'}`)
  }

  // ตรวจสอบ authentication เมื่อ component mount
  useEffect(() => {
    const checkAuth = async () => {
      // ลด delay เพื่อให้เร็วขึ้น
      await new Promise(resolve => setTimeout(resolve, 50))

      const token = localStorage.getItem('token')

      if (!token) {
        debugLog.warn('🔐 ไม่พบ token - เด้งไปหน้า login')
        router.push('/login')
        return false
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)

        if (payload.exp && payload.exp < currentTime) {
          debugLog.warn('🔐 Token หมดอายุ - เด้งไปหน้า login')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          return false
        }

        // โหลดข้อมูล user อีกครั้งเพื่อให้แน่ใจว่าเป็นข้อมูลล่าสุด
        const userData = authUtils.getUserWithRole()
        if (userData) {
          // อัพเดท user state เฉพาะเมื่อข้อมูลสำคัญเปลี่ยนแปลงจริงๆ
          setUser(prevUser => {
            if (!prevUser || 
                prevUser.role !== userData.role || 
                prevUser.user_id !== userData.user_id ||
                prevUser.first_name !== userData.first_name ||
                prevUser.last_name !== userData.last_name ||
                prevUser.email !== userData.email) {
              debugLog.log(`🔄 อัพเดท user data: ${prevUser?.role || 'null'} → ${userData.role}`)
              return userData
            } else {
              debugLog.log(`✅ User data ไม่เปลี่ยนแปลง: ${userData.role}`)
              return prevUser // ใช้ object เดิมเพื่อป้องกัน re-render
            }
          })
        } else {
          // ถ้าไม่มี user data ให้ redirect ไป login
          debugLog.warn('🔐 ไม่พบข้อมูล user - เด้งไปหน้า login')
          router.push('/login')
          return false
        }

        // ลด delay เพื่อให้โหลดเร็วขึ้น
        await new Promise(resolve => setTimeout(resolve, 50))

        // เสร็จสิ้นการโหลดหน้า


        return true
      } catch (error) {
        debugLog.error('🔐 Token ไม่ถูกต้อง - เด้งไปหน้า login')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return false
      }
    }

    checkAuth()
  }, [router])

  // Debug: ติดตาม user state changes
  useEffect(() => {
    if (user) {
      debugLog.log(`👤 User state อัพเดท: role=${user.role}, id=${user.user_id}, name=${user.first_name}`)
    } else {
      debugLog.warn('👤 User state: null')
    }
  }, [user])

  // ดึงรายการห้องเมื่อ component mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const result = await calendarAPI.getAllRooms()
        setRooms(result.rooms || [])
        // ❌ ไม่เลือกห้องใดเป็นค่าเริ่มต้น ให้ user เลือกเอง
        // if (result.rooms && result.rooms.length > 0) {
        //   setSelectedRoom(result.rooms[0])
        // }
      } catch (error) {
        handleError(error, 'ไม่สามารถดึงรายการห้องได้')
      }
    }

    fetchRooms()
  }, [])

  // 🔍 Filter rooms based on search query
  useEffect(() => {
    if (!roomSearchQuery.trim()) {
      setFilteredRooms(rooms)
    } else {
      const query = roomSearchQuery.toLowerCase().trim()
      const filtered = rooms.filter(room => {
        return (
          room.room_name?.toLowerCase().includes(query) ||
          room.department?.toLowerCase().includes(query) ||
          room.location_m?.toLowerCase().includes(query) ||
          room.capacity?.toString().includes(query)
        )
      })
      setFilteredRooms(filtered)
    }
  }, [roomSearchQuery, rooms])

  // 🔒 ป้องกัน body scroll เมื่อ dropdown เปิด
  useEffect(() => {
    if (showRoomDropdown) {
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      return () => {
        // Unlock body scroll when cleanup
        document.body.style.overflow = 'unset'
      }
    }
  }, [showRoomDropdown])

  // ดึงข้อมูลปฏิทินเมื่อเปลี่ยนห้องหรือเดือน
  useEffect(() => {
    if (!selectedRoom) return

    const fetchCalendarData = async () => {
      setLoading(true)
      setError(null)

      try {
        const month = currentDate.getMonth() + 1 // JavaScript month is 0-indexed
        const year = currentDate.getFullYear()

        debugLog.log(`📅 ดึงข้อมูลปฏิทิน: ห้อง ${selectedRoom.room_id}, เดือน ${month}/${year}`)

        const result = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, month, year, {
          timestamp: Date.now(),
          source: 'calendar-page',
          forceRefresh: true,
          _cache_bust: Math.random()
        })

        // Debug: เพิ่ม logging เพื่อเปรียบเทียบข้อมูล
        console.log('🔍 [CALENDAR] Calendar API Response:', {
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
          console.log('🔍 [CALENDAR] Calendar structure:', {
            isArray: Array.isArray(result.calendar),
            type: typeof result.calendar,
            keys: Object.keys(result.calendar || {}),
            calendar: result.calendar,
            fullAPIResponse: result,
            timestamp: Date.now(),
            apiUrl: '/reservations/calendar/' + selectedRoom.room_id + '?month=' + month + '&year=' + year + '&detailed=true'
          })          // ตรวจสอบว่า calendar เป็น array หรือไม่
          let day17Data = null
          if (Array.isArray(result.calendar)) {
            day17Data = result.calendar.find(day => day.date === '2025-08-17')
          } else if (result.calendar.daily_availability) {
            day17Data = result.calendar.daily_availability.find(day => day.date === '2025-08-17')
          }

          if (day17Data) {
            console.log('🔍 [CALENDAR] Raw Day 17 Data:', day17Data)
            console.log('🔍 [CALENDAR] Day 17 Slots:', day17Data.slots)
            console.log('🔍 [CALENDAR] Day 17 Reservations:', day17Data.reservations)
          }
        }

        // Debug: ตรวจสอบข้อมูลวันที่ 30 กันยายน
        let day30Data = null
        if (Array.isArray(result.calendar)) {
          day30Data = result.calendar.find(day => day.date === '2025-09-30')
        } else if (result.calendar && result.calendar.daily_availability) {
          day30Data = result.calendar.daily_availability.find(day => day.date === '2025-09-30')
        }

        console.log('🔍 [CALENDAR-API] Calendar Data Structure:', {
          hasCalendar: !!result.calendar,
          hasDailyAvailability: !!(result.calendar && result.calendar.daily_availability),
          totalDays: result.calendar?.daily_availability?.length || 0,
          allDates: result.calendar?.daily_availability?.map(day => day.date).slice(0, 5) || [],
          day30Data: day30Data
        })

        setCalendarData(result)
      } catch (error) {
        handleError(error, 'ไม่สามารถดึงข้อมูลปฏิทินได้')
      } finally {
        setLoading(false)
      }
    }

    fetchCalendarData()
  }, [selectedRoom, currentDate])

  // ฟังก์ชันสำหรับดึงการจองในวันนั้น ๆ เพื่อแสดงในช่องปฏิทิน
  const getDayBookings = (dayAvailability) => {
    if (!dayAvailability || !dayAvailability.slots) {
      return []
    }

    // ดึงการจองจาก slots - รองรับทั้ง reservations (plural) และ reservation (singular)
    const bookings = []
    dayAvailability.slots.forEach(slot => {
      if (!slot.available) {
        // รองรับทั้ง reservations (array) และ reservation (single object)
        const reservationList = slot.reservations || (slot.reservation ? [slot.reservation] : [])

        reservationList.forEach(booking => {
          // หาชื่อผู้จองจาก field ต่าง ๆ ที่เป็นไปได้
          const userName = booking.reserved_by ||
            booking.user_name ||
            `${booking.first_name || ''} ${booking.last_name || ''}`.trim() ||
            `${booking.users?.first_name || ''} ${booking.users?.last_name || ''}`.trim() ||
            'ไม่ระบุชื่อ'

          const timeRange = `${slot.start_time?.substring(0, 5)}-${slot.end_time?.substring(0, 5)}`
          bookings.push({
            name: userName,
            time: timeRange,
            status: booking.status_r || booking.status || 'pending'
          })
        })
      }
    })

    // ส่งคืน 4 รายการแรก และปรับชื่อให้พอดีกับพื้นที่
    return bookings.slice(0, 4).map(booking => {
      // ตัดชื่อให้สั้นลงเพื่อให้เวลายังเห็นได้ชัดเจน
      let displayName = booking.name

      // ถ้าชื่อยาวเกิน 12 ตัวอักษร ให้ตัดและใส่ ...
      if (displayName.length > 12) {
        displayName = displayName.substring(0, 12) + '...'
      }

      return {
        ...booking,
        name: displayName
      }
    })
  }

  // สร้างปฏิทิน Grid
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // วันแรกของเดือนและวันสุดท้าย
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // วันแรกของสัปดาห์ที่แสดง (อาจเป็นเดือนก่อนหน้า)
    const startDay = new Date(firstDay)
    startDay.setDate(startDay.getDate() - firstDay.getDay())

    // สร้าง array ของวันทั้งหมดที่จะแสดง (6 สัปดาห์ = 42 วัน)
    const days = []
    const currentDay = new Date(startDay)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return days
  }

  // ดึงข้อมูลวันจาก calendar data - รองรับการแสดงข้ามเดือน
  const getDayData = (date) => {
    // ตรวจสอบว่าวันนี้อยู่ในเดือนปัจจุบันหรือไม่
    const isCurrentMonth = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
    const localDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    // ถ้าเป็นเดือนปัจจุบัน ใช้ข้อมูลจาก calendarData
    if (isCurrentMonth && calendarData && calendarData.calendar && calendarData.calendar.daily_availability) {
      const dayData = calendarData.calendar.daily_availability.find(day => day.date === localDateString)
      return dayData
    }

    // ถ้าไม่ใช่เดือนปัจจุบัน ดูจาก additionalMonthsData
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthData = additionalMonthsData[monthYear]
    
    if (monthData && monthData.calendar && monthData.calendar.daily_availability) {
      const dayData = monthData.calendar.daily_availability.find(day => day.date === localDateString)
      return dayData
    }

    // ถ้าไม่มีข้อมูล ให้โหลดแบบ lazy loading
    if (!isCurrentMonth) {
      // โหลดข้อมูลเดือนนั้น ๆ แบบ background
      const loadMonthData = async () => {
        if (!selectedRoom || loading) return
        
        try {
          const monthToLoad = date.getMonth() + 1
          const yearToLoad = date.getFullYear()
          const monthKey = `${yearToLoad}-${String(monthToLoad).padStart(2, '0')}`
          
          // ตรวจสอบว่าโหลดแล้วหรือไม่
          if (additionalMonthsData[monthKey]) return
          
          const result = await calendarAPI.getDetailedCalendar(selectedRoom.room_id, monthToLoad, yearToLoad)
          
          if (result.success) {
            setAdditionalMonthsData(prev => ({
              ...prev,
              [monthKey]: result
            }))
          }
        } catch (error) {
          console.error('Error loading additional month data:', error)
        }
      }
      
      loadMonthData()
    }

    return null

    // Debug: เพิ่ม logging เฉพาะวันที่ 17, 18, 19, 30
    const dayOfMonth = date.getDate()
    if ([17, 18, 19, 30].includes(dayOfMonth)) {
      console.log(`🔍 [CALENDAR-MAIN] getDayData วันที่ ${dayOfMonth}:`, {
        dateString: localDateString, // ใช้ local date
        hasData: !!dayData,
        isCurrentMonth,
        totalSlots: dayData?.slots?.length || 0,
        availableSlots: dayData?.slots?.filter(s => s.available)?.length || 0,
        bookedSlots: dayData?.total_reservations || 0, // ใช้ total_reservations แทน
        slotsNotAvailable: dayData?.slots?.filter(s => !s.available)?.length || 0, // เพิ่มเพื่อเปรียบเทียบ
        reservationCount: dayData?.slots?.flatMap(s => s.reservations || [])?.length || 0,
        fullDayData: dayData
      })
    }

    return dayData
  }

  // เปลี่ยนเดือน
  const changeMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  // เปลี่ยนห้อง
  const changeRoom = (room) => {
    setSelectedRoom(room)
    setCalendarData(null) // Reset calendar data to force reload
    setAdditionalMonthsData({}) // ล้างข้อมูลเดือนอื่น ๆ
  }

  // จัดการการคลิกวันที่
  const handleDayClick = async (date, dayData) => {
    const today = new Date()
    const clickedDate = new Date(date)
    today.setHours(0, 0, 0, 0)
    clickedDate.setHours(0, 0, 0, 0)

    // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
    const isPastDate = clickedDate < today

    // ถ้าไม่มี dayData (เช่น คลิกวันที่ของเดือนอื่น) ให้โหลดข้อมูลใหม่
    let finalDayData = dayData
    if (!dayData) {
      try {
        setLoading(true)
        // โหลดข้อมูลสำหรับเดือนที่มีวันที่นั้น ๆ 
        const roomId = selectedRoom?.room_id || 1
        const clickedMonth = date.getMonth() + 1
        const clickedYear = date.getFullYear()
        
        const response = await calendarAPI.getDetailedCalendar(roomId, clickedMonth, clickedYear)
        
        if (response.success && response.calendar && response.calendar.daily_availability) {
          const dateStr = `${clickedYear}-${String(clickedMonth).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          finalDayData = response.calendar.daily_availability.find(day => day.date === dateStr)
        }
      } catch (error) {
        console.error('Error loading day data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Debug: เพิ่ม logging เพื่อดูข้อมูลวันที่คลิก
    console.log('🔍 [CALENDAR-MAIN] Day Click Data:', {
      clickedDate: date.toLocaleDateString('th-TH'),
      hasData: !!finalDayData,
      totalSlots: finalDayData?.slots?.length || 0,
      availableSlots: finalDayData?.slots?.filter(s => s.available)?.length || 0,
      bookedSlots: finalDayData?.total_reservations || 0,
      slotsNotAvailable: finalDayData?.slots?.filter(s => !s.available)?.length || 0,
      allReservations: finalDayData?.slots?.flatMap(s => s.reservations || []) || [],
      slotsWithReservations: finalDayData?.slots?.filter(s => s.reservations && s.reservations.length > 0) || [],
      fullDayData: finalDayData,
      showHistoryAlways: true,
      isPastDate: isPastDate
    })

    setSelectedDate({ date, dayData: finalDayData, isHistoryMode: isPastDate })
    setShowModal(true)
    setTimeout(() => setModalAnimation(true), 10) // เริ่ม animation หลังจาก render
  }

  // ปิด Modal พร้อม Animation
  const closeModal = () => {
    setModalAnimation(false)
    setTimeout(() => {
      setShowModal(false)
      setSelectedDate(null)
    }, 200) // รอ animation เสร็จก่อน
  }

  const calendarDays = generateCalendarGrid()
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]



  // เตรียม theme colors ตาม user role
  const userRole = validateRole(user?.role)
  const themeColors = getThemeColors(userRole)

  // สร้าง className สำหรับ background ตาม role
  const getBgClassName = () => {
    switch (userRole) {
      case 'officer': return 'bg-gradient-to-br from-blue-50 to-blue-100'
      case 'admin': return 'bg-gradient-to-br from-red-50 to-red-100'
      case 'executive': return 'bg-gradient-to-br from-purple-50 to-purple-100'
      case 'user':
      default: return 'bg-gradient-to-br from-green-50 to-green-100'
    }
  }

  return (
    <DashboardLayout user={user}>
      <div className={`${getBgClassName()} min-h-full -m-4 lg:-m-6 p-4 lg:p-6`}>
        <div className="max-w-none mx-auto overflow-x-auto">

          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="text-3xl mr-3">📅</span>
              ปฏิทินการจองห้องประชุม
            </h1>

            {/* Room Selector */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Left Column - Room Selection */}
              <div className="xl:col-span-2">
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">เลือกห้องประชุม:</label>

                {/* 🔍 Searchable Room Selector */}
                <div className="relative">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                      <span className="text-lg">🔍</span>
                    </div>
                    <input
                      type="text"
                      value={showRoomDropdown ? roomSearchQuery : (selectedRoom ? `${selectedRoom.room_name} (${selectedRoom.capacity} คน) - ${selectedRoom.department}` : '')}
                      onChange={(e) => {
                        const value = e.target.value
                        setRoomSearchQuery(value)
                        setShowRoomDropdown(true)

                        // ถ้า clear ข้อความ ให้ clear selectedRoom ด้วย
                        if (!value.trim()) {
                          changeRoom(null) // ใช้ changeRoom function เหมือนเดิม
                        }
                      }}
                      onFocus={() => {
                        setShowRoomDropdown(true)
                        // ถ้ามีห้องที่เลือกอยู่ ให้ clear เพื่อให้ search ได้ และ clear selectedRoom ชั่วคราว
                        if (selectedRoom) {
                          setRoomSearchQuery('')
                          changeRoom(null) // Clear selectedRoom เพื่อให้ dropdown แสดง
                        }
                      }}
                      placeholder="พิมพ์ชื่อห้อง, คณะ, สถานที่ หรือความจุ เพื่อค้นหา..."
                      className="w-full pl-12 pr-10 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-white shadow-sm hover:shadow-md transition-all duration-300 font-medium placeholder-gray-500 text-sm"
                    />
                    {(selectedRoom || roomSearchQuery) && (
                      <button
                        onClick={() => {
                          changeRoom(null) // ใช้ changeRoom function เหมือนเดิม
                          setRoomSearchQuery('')
                          setShowRoomDropdown(false)
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                        title="ล้างการเลือก"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {showRoomDropdown && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto overscroll-contain"
                      onWheel={(e) => {
                        // ป้องกันการ scroll ของหน้าหลักเมื่อเลื่อนใน dropdown
                        e.stopPropagation()
                        const element = e.currentTarget
                        const atTop = element.scrollTop === 0
                        const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight

                        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                          e.preventDefault()
                        }
                      }}
                    >
                      {filteredRooms.length > 0 ? (
                        <>
                          <div className="p-3 border-b border-gray-100 bg-gray-50">
                            <span className="text-xs text-gray-600 font-medium">
                              พบ {filteredRooms.length} ห้อง {roomSearchQuery && `จากการค้นหา "${roomSearchQuery}"`}
                            </span>
                          </div>
                          {filteredRooms.map((room) => (
                            <button
                              key={room.room_id}
                              onClick={() => {
                                changeRoom(room) // ใช้ changeRoom function เหมือนเดิม
                                setRoomSearchQuery('')
                                setShowRoomDropdown(false)
                              }}
                              className="w-full text-left p-3 hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">
                                    {room.room_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    👥 {room.capacity} คน • 🏢 {room.department} • 📍 {room.location_m}
                                  </div>
                                  <div className="flex items-center mt-1 space-x-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${room.status_m === 'available' ? 'bg-green-400' : 'bg-red-400'
                                      }`}></div>
                                    <span className={`text-xs font-medium ${room.status_m === 'available' ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                      {room.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  เลือก
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <div className="text-2xl mb-2">🔍</div>
                          <div className="text-sm">ไม่พบห้องประชุมที่ตรงกับการค้นหา</div>
                          {roomSearchQuery && (
                            <div className="text-xs text-gray-400 mt-1">
                              คำค้นหา: "{roomSearchQuery}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Click outside to close dropdown */}
                  {showRoomDropdown && (
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowRoomDropdown(false)}
                    />
                  )}
                </div>

                {/* Help Text - Always Show */}
                <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="text-sm sm:text-lg">ℹ️</span>
                    <span className="text-xs sm:text-sm leading-relaxed">
                      {selectedRoom
                        ? `กำลังแสดงปฏิทินการจองและความพร้อมใช้งานของ "${selectedRoom.room_name}"`
                        : "กรุณาเลือกห้องประชุมที่ต้องการดูปฏิทิน เพื่อดูการจองและความพร้อมใช้งาน"
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column - Room Info */}
              {selectedRoom && (
                <div className="xl:col-span-1">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm h-fit">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-blue-600 text-sm">🏢</span>
                      </div>
                      <h4 className="text-base font-bold text-gray-900 truncate">{selectedRoom.room_name}</h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 text-xs">📍</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">ตำแหน่ง</div>
                          <div className="text-sm font-medium text-gray-900 break-words">{selectedRoom.location_m}</div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-purple-600 text-xs">👥</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">ความจุ</div>
                          <div className="text-sm font-medium text-gray-900">{selectedRoom.capacity} คน</div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-orange-600 text-xs">🏛️</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">คณะ</div>
                          <div className="text-sm font-medium text-gray-900">{selectedRoom.department}</div>
                        </div>
                      </div>
                    </div>

                    {/* Room Status Badge */}
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">สถานะห้อง</span>
                        <div className="flex items-center space-x-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${selectedRoom.status_m === 'available' ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                          <span className={`text-xs font-medium ${selectedRoom.status_m === 'available' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {selectedRoom.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ minWidth: '1200px', width: '100%' }}>

            {/* Calendar Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <div className="flex items-center justify-between text-white">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <span className="text-xl">←</span>
                </button>

                <div className="flex flex-col items-center space-y-2">
                  <h2 className="text-xl lg:text-2xl font-bold">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>


                </div>

                <button
                  onClick={() => changeMonth(1)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <span className="text-xl">→</span>
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => {
                const fullNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
                return (
                  <div key={day} className="p-2 md:p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                    <span className="hidden sm:inline">{fullNames[index]}</span>
                    <span className="sm:hidden">{day}</span>
                  </div>
                )
              })}
            </div>

            {/* Calendar Grid */}
            {error ? (
              <div className="flex items-center justify-center py-20 text-red-600">
                <span className="text-xl mr-2">❌</span>
                {error}
              </div>
            ) : !selectedRoom ? (
              /* Empty Calendar - No Room Selected */
              <div className="grid grid-cols-7">
                {calendarDays.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()

                  return (
                    <div
                      key={index}
                      className={`
                      min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0
                      ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : 'bg-white'}
                    `}
                    >
                      {/* Date Number */}
                      <div className={`text-sm sm:text-base lg:text-lg font-bold ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Calendar with Data - Room Selected */
              <div className="grid grid-cols-7" key={`${selectedRoom?.room_id}-${currentDate.getMonth()}-${currentDate.getFullYear()}`}>
                {calendarDays.map((date, index) => {
                  const dayData = getDayData(date)
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
                  const isToday = date.toDateString() === new Date().toDateString()

                  // Debug logging สำหรับวันสุดท้ายของเดือน
                  if (date.getDate() === 30 && date.getMonth() === 8) { // กันยายน = เดือนที่ 8
                    console.log('🔍 [CALENDAR-DEBUG] วันที่ 30 กันยายน:', {
                      date: date.toDateString(),
                      dateMonth: date.getMonth(),
                      currentMonth: currentDate.getMonth(),
                      dateYear: date.getFullYear(),
                      currentYear: currentDate.getFullYear(),
                      isCurrentMonth,
                      dayData: !!dayData
                    })
                  }

                  // ตรวจสอบว่าเป็นวันที่ผ่านมาแล้วหรือไม่
                  const today = new Date()
                  const currentDateOnly = new Date(date)
                  today.setHours(0, 0, 0, 0)
                  currentDateOnly.setHours(0, 0, 0, 0)
                  const isPastDate = currentDateOnly < today

                  return (
                    <div
                      key={index}
                      className={`
                      min-h-[120px] sm:min-h-[140px] lg:min-h-[160px] p-1 sm:p-2 border-r border-b border-gray-200 last:border-r-0
                      ${isToday ? 'bg-blue-50 border-blue-200' : 
                        !isCurrentMonth ? 'bg-gray-100 text-gray-400' : 'bg-white'}
                      ${!isToday ? 'hover:bg-gray-50' : ''} transition-all cursor-pointer
                    `}
                      onClick={() => {
                        // คลิกได้ทุกวัน รวมถึงวันที่ของเดือนอื่น ๆ ที่แสดงในปฏิทิน
                        handleDayClick(date, dayData)
                      }}
                      title={
                        // แสดง tooltip ได้ทุกวัน ไม่ว่าจะเป็นเดือนไหน
                        isPastDate ? `วันที่ ${date.getDate()} - ประวัติการจอง (คลิกเพื่อดูรายละเอียด)` :
                          dayData ? (() => {
                              // สร้าง tooltip ที่แสดงข้อมูลการจองแบบละเอียด
                              const allBookings = []
                              if (dayData.slots) {
                                dayData.slots.forEach(slot => {
                                  if (slot.reservations && slot.reservations.length > 0) {
                                    slot.reservations.forEach(reservation => {
                                      if (!allBookings.find(booking => booking.reservation_id === reservation.reservation_id)) {
                                        // เพิ่มเวลาจาก slot เข้าไปใน booking object
                                        allBookings.push({
                                          ...reservation,
                                          slot_start_time: slot.start_time,
                                          slot_end_time: slot.end_time
                                        })
                                      }
                                    })
                                  }
                                })
                              }

                              let tooltip = `วันที่ ${date.getDate()}`
                              if (isToday) tooltip += ' - วันนี้'
                              if (allBookings.length > 0) {
                                tooltip += `\n\nรายชื่อผู้จอง (${allBookings.length} คน):`
                                allBookings.forEach((booking, index) => {
                                  const bookerName = booking.reserved_by || booking.user_name ||
                                    `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'ไม่ระบุชื่อ'

                                  // หาเวลาจาก slot หรือ booking - แก้ไข undefined
                                  let timeRange = 'ไม่ระบุเวลา'
                                  if (booking.slot_start_time && booking.slot_end_time) {
                                    timeRange = `${booking.slot_start_time.substring(0, 5)}-${booking.slot_end_time.substring(0, 5)}`
                                  } else if (booking.start_time && booking.end_time) {
                                    timeRange = `${booking.start_time.substring(0, 5)}-${booking.end_time.substring(0, 5)}`
                                  } else if (booking.time_range) {
                                    timeRange = booking.time_range
                                  }

                                  tooltip += `\n${index + 1}. ${bookerName} (${timeRange})`
                                })
                              }
                              tooltip += '\n\nคลิกเพื่อดูรายละเอียดเต็ม'
                              return tooltip
                            })() : `วันที่ ${date.getDate()} (คลิกเพื่อดูรายละเอียด)`
                      }
                    >
                      {/* Date Number */}
                      <div className={`text-sm sm:text-base lg:text-lg font-bold ${isToday ? 'text-blue-700' :
                          isCurrentMonth ?
                            (isPastDate ? 'text-gray-500' : 'text-gray-800') :
                            'text-gray-400'
                        }`}>
                        {date.getDate()}
                      </div>

                      {/* แสดงรายการจองในช่องวัน - แสดงได้ทุกวันไม่จำกัดเดือน */}
                      {dayData && (
                        <div className="mt-1 space-y-1 overflow-hidden flex flex-col h-full">
                          {(() => {
                            const bookings = getDayBookings(dayData)

                            // สีสำหรับรายชื่อผู้จอง - เลือกสีที่ไม่ทับกับตัวหนังสือ
                            const colors = [
                              { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
                              { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
                              { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
                              { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
                              { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
                              { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
                              { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
                              { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' }
                            ]

                            if (bookings.length > 0) {
                              return (
                                <div className="text-xs space-y-1 flex-1">
                                  {bookings.map((booking, index) => {
                                    const color = colors[index % colors.length]
                                    return (
                                      <div
                                        key={index}
                                        className={`${color.bg} ${color.text} ${color.border} px-1 py-0.5 rounded border font-medium shadow-sm`}
                                        title={`${booking.name} ${booking.time}`}
                                        style={{ fontSize: '0.7rem', lineHeight: '1.1', minHeight: '20px' }}
                                      >
                                        <div className="flex justify-between items-center gap-1">
                                          <span className="font-semibold truncate flex-shrink min-w-0" style={{ maxWidth: '60%' }}>{booking.name}</span>
                                          <span className="text-gray-700 font-medium flex-shrink-0" style={{ fontSize: '0.7rem', minWidth: 'max-content' }}>
                                            {booking.time}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )}


                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          {/* เอาคำอธิบายสีออก - ตามคำสั่งของอาจารย์ */}

          {/* Modal แสดงรายละเอียดวันที่ - ปรับปรุงใหม่ Animation สวยขึ้น */}
          {showModal && selectedDate && (
            <div
              className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-500 ${modalAnimation ? 'backdrop-blur-md bg-black/20' : 'backdrop-blur-none bg-transparent'
                }`}
              onClick={closeModal}
            >
              <div
                className={`bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${modalAnimation ? 'scale-100 opacity-100 translate-y-0 rotate-0' : 'scale-50 opacity-0 translate-y-16 rotate-3'
                  }`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  filter: modalAnimation ? 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))' : 'none'
                }}
              >
                {/* Modal Header - ปรับปรุงใหม่ พร้อมไล่โทนสวยขึ้น */}
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-6 relative overflow-hidden">
                  {/* Background Pattern - เพิ่มลายใหม่ */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 animate-pulse delay-1000"></div>
                  <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/20 rounded-full animate-bounce delay-500"></div>
                  <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-white/15 rounded-full animate-bounce delay-700"></div>

                  <div className="relative flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3 flex-1 pr-4">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg animate-pulse">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold mb-1">
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
                          <div className={`w-2 h-2 rounded-full ${selectedRoom?.status_m === 'available' ? 'bg-green-300' : 'bg-red-300'
                            }`}></div>
                          <span className={`text-sm font-medium ${selectedRoom?.status_m === 'available' ? 'text-green-200' : 'text-red-200'
                            }`}>
                            {selectedRoom?.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                          </span>
                        </div>
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

                {/* Modal Content - เลื่อนได้ พร้อม Custom Scrollbar สวย */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(80vh-180px)] custom-scrollbar">
                  <style jsx>{`
                  .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-track {
                    background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
                    border-radius: 10px;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                  }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%);
                    background-clip: content-box;
                  }
                  .custom-scrollbar::-webkit-scrollbar-corner {
                    background: transparent;
                  }
                `}</style>

                  {/* กล่องเตือนห้องไม่พร้อมใช้งาน - ด้านบนสุด */}
                  {selectedRoom?.status_m !== 'available' && (
                    <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl shadow-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-red-100 rounded-full">
                          <span className="text-3xl">⚠️</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-red-800 mb-2">ห้องไม่พร้อมใช้งาน</h4>
                          <p className="text-red-700 font-medium text-lg leading-relaxed">
                            ห้องนี้ไม่สามารถจองได้ในขณะนี้ กรุณาเลือกห้องอื่นหรือติดต่อเจ้าหน้าที่
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Room Info - ปรับปรุงใหม่ สวยขึ้น */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0 shadow-sm">
                        <span className="text-xl">🏢</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-lg truncate mb-1">{selectedRoom?.room_name}</h4>
                        <p className="text-sm text-gray-600">
                          ความจุ {selectedRoom?.capacity} คน •
                          <span className={`font-medium ${selectedRoom?.status_m === 'available' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {selectedRoom?.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

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
                        const totalBookings = dayData.total_reservations || 0 // ใช้ total_reservations

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
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md mt-1 bg-blue-500"
                              >
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

                      // Debug: ดูข้อมูล slots ที่มี
                      console.log('🔍 [POPUP] Slots data:', {
                        totalSlots: selectedDate.dayData.slots.length,
                        slotsWithReservations: selectedDate.dayData.slots.filter(s => s.reservations && s.reservations.length > 0).length,
                        allSlots: selectedDate.dayData.slots,
                        firstSlotWithReservation: selectedDate.dayData.slots.find(s => s.reservations && s.reservations.length > 0)
                      })

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
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${(booking.status_r === 'confirmed' || booking.status === 'confirmed' || booking.status_r === 'approved' || booking.status === 'approved')
                                      ? 'bg-green-200 text-green-800'
                                      : (booking.status_r === 'pending' || booking.status === 'pending')
                                        ? 'bg-yellow-200 text-yellow-800'
                                        : 'bg-gray-200 text-gray-800'
                                      }`}>
                                      {(booking.status_r === 'confirmed' || booking.status === 'confirmed' || booking.status_r === 'approved' || booking.status === 'approved') ? 'อนุมัติแล้ว' :
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
                                <span className="mr-2 text-lg"></span>
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
                                <span className="mr-2 text-lg"></span>
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

                {/* Action Button - ปรับปรุงใหม่ เอาไอคอนนิ้วโป้งออก */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 border-t border-gray-200">
                  <div className="flex space-x-3">
                    {/* ปุ่มจอง - แสดงเฉพาะเมื่อห้องพร้อมใช้งาน และไม่ใช่โหมดประวัติ และ role เป็น user เท่านั้น */}
                    {selectedRoom?.status_m === 'available' && !selectedDate.isHistoryMode && user?.role === 'user' && (
                      <button
                        onClick={() => {
                          console.log('🔍 [CALENDAR] Navigating to reserve page:', {
                            room_id: selectedRoom.room_id,
                            room_name: selectedRoom.room_name
                          })
                          router.push(`/reserve?room_id=${selectedRoom.room_id}`)
                        }}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 flex items-center justify-center text-sm sm:text-base"
                      >
                        <span className="mr-2">📝</span>
                        <span className="text-sm sm:text-base">จองห้องนี้</span>
                      </button>
                    )}

                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 flex items-center justify-center text-sm sm:text-base"
                    >
                      <span className="text-sm sm:text-base">ปิดหน้าต่าง</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  )
}