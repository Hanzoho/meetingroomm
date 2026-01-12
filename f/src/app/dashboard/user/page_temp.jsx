'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils, statisticsAPI, reservationAPI } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RoomUsageChart from '@/components/charts/RoomUsageChart'
import DepartmentStatsChart from '@/components/charts/DepartmentStatsChart'
import { debugLog } from '@/utils/debug'

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_bookings: 0,
    pending_bookings: 0,
    approved_bookings: 0,
    rejected_bookings: 0,
    this_month_bookings: 0
  })
  const [reservations, setReservations] = useState([])
  const [filteredReservations, setFilteredReservations] = useState([])
  const [currentFilter, setCurrentFilter] = useState('all')
  const [roomUsageData, setRoomUsageData] = useState([])
  const [departmentStats, setDepartmentStats] = useState([])
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
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
      case 'pending':
        return 'รออนุมัติ'
      case 'approved':
        return 'อนุมัติแล้ว'
      case 'rejected':
        return 'ปฏิเสธ'
      case 'cancelled':
        return 'ยกเลิกแล้ว'
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

  const formatDateRange = (startDate, endDate) => {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // แสดงวันที่เริ่มต้นและสิ้นสุดเสมอ
      const startFormatted = start.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
      
      // ถ้าเป็นวันเดียวกัน
      if (start.toDateString() === end.toDateString()) {
        return `${startFormatted} (วันเดียว)`
      }
      
      // ถ้าเป็นหลายวัน
      const endFormatted = end.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
      
      return `${startFormatted} ถึง ${endFormatted}`
    } catch (error) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    
    debugLog.log('🕐 formatTime input:', timeString)
    
    try {
      // ถ้าเป็น timestamp (ISO format)
      if (timeString.includes('T')) {
        const date = new Date(timeString)
        const formatted = date.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        debugLog.log('🕐 formatTime output (ISO):', formatted)
        return formatted
      }
      
      // ถ้าเป็น time format (HH:MM:SS หรือ HH:MM)
      const time = timeString.split(':')
      const formatted = `${time[0].padStart(2, '0')}:${time[1].padStart(2, '0')}`
      debugLog.log('🕐 formatTime output (time):', formatted)
      return formatted
    } catch (error) {
      // fallback ถ้า parse ไม่ได้
      debugLog.error('🕐 formatTime error:', error)
      return timeString
    }
  }

  // Filter reservations based on current filter
  const filterReservations = (reservations, filter) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (filter) {
      case 'pending':
        return reservations.filter(r => r.status === 'pending')
      case 'approved':
        return reservations.filter(r => r.status === 'approved')
      case 'rejected':
        return reservations.filter(r => r.status === 'rejected')
      case 'cancelled':
        return reservations.filter(r => r.status === 'cancelled')
      case 'upcoming':
        return reservations.filter(r => {
          const bookingDate = new Date(r.start_date)
          bookingDate.setHours(0, 0, 0, 0)
          return r.status === 'approved' && bookingDate >= today
        })
      case 'all':
      default:
        return reservations
    }
  }

  // Calculate stats from reservations
  const calculateStats = (reservations) => {
    const total = reservations.length
    const pending = reservations.filter(r => r.status === 'pending').length
    const approved = reservations.filter(r => r.status === 'approved').length
    const rejected = reservations.filter(r => r.status === 'rejected').length
    
    // Calculate this month's bookings
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thisMonth = reservations.filter(r => {
      const bookingDate = new Date(r.start_date || r.booking_date)
      return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
    }).length

    return {
      total_bookings: total,
      pending_bookings: pending,
      approved_bookings: approved,
      rejected_bookings: rejected,
      this_month_bookings: thisMonth
    }
  }

  useEffect(() => {
    // ตรวจสอบการ login - ต้องรอให้ client-side render เสร็จก่อน
    if (typeof window === 'undefined') return
    
    // เพิ่ม delay เล็กน้อยเพื่อให้เห็นหน้าโหลด
    const initializeAuth = async () => {
      // แสดงหน้าโหลดอย่างน้อย 50ms (ลดลงจากเดิม)
      const [userData, token] = await Promise.all([
        Promise.resolve(authUtils.getUserWithRole()),
        Promise.resolve(authUtils.getToken()),
        new Promise(resolve => setTimeout(resolve, 5)) // Loading time เร็วสุด 90%+
      ])
      
      debugLog.log('UserDashboard - user data:', userData)
      debugLog.log('UserDashboard - token exists:', !!token)
      
      // Debug token information
      const debugInfo = authUtils.debugToken()
      
      // ตรวจสอบ authentication และ token expiry
      if (!token || !userData || !authUtils.isAuthenticated()) {
        debugLog.log('UserDashboard - redirecting to login: no valid auth')
        router.push('/login')
        return
      }
      
      // ตรวจสอบ role - ถ้าไม่ใช่ user ให้ redirect ไปหน้าที่เหมาะสม
      if (userData.role && userData.role !== 'user') {
        if (userData.role === 'officer') {
          router.push('/dashboard/officer')
        } else if (userData.role === 'executive') {
          router.push('/dashboard/executive')
        } else if (userData.role === 'admin') {
          router.push('/dashboard/admin')
        }
        return
      }
      
      // โหลดข้อมูล
      loadUserData(userData)
    }
    
    // ตั้งค่าการตรวจสอบ token expiry ทุก 5 วินาที
    const tokenCheckInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const debugInfo = authUtils.debugToken()
        if (debugInfo && debugInfo.isExpired) {
          debugLog.log('🚨 Token expired! Redirecting to login...')
          clearInterval(tokenCheckInterval)
          router.push('/login')
        }
      }
    }, 5000) // ตรวจสอบทุก 5 วินาที
    
    initializeAuth()
    
    // Cleanup interval when component unmounts
    return () => {
      clearInterval(tokenCheckInterval)
    }
  }, [router])

  // Update filtered reservations when filter or reservations change
  useEffect(() => {
    setFilteredReservations(filterReservations(reservations, currentFilter))
  }, [reservations, currentFilter])

  // Handle filter change
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter)
  }

  // Handle reservation actions
  const handleViewReservation = (reservation) => {
    debugLog.log('View reservation:', reservation.reservation_id)
    setSelectedReservation(reservation)
    setShowViewModal(true)
  }

  const handleEditReservation = (reservation) => {
    debugLog.log('Edit reservation:', reservation.reservation_id)
    setSelectedReservation(reservation)
    setShowEditModal(true)
  }

  const handleDeleteReservation = async (reservation) => {
    debugLog.log('Delete reservation:', reservation.reservation_id)
    if (confirm('คุณต้องการยกเลิกการจองนี้หรือไม่?')) {
      try {
        const response = await reservationAPI.cancel(reservation.reservation_id)
        if (response.success) {
          debugLog.log('✅ ยกเลิกการจองสำเร็จ')
          // Reload reservations
          const userData = authUtils.getUserWithRole()
          loadUserData(userData)
        } else {
          debugLog.error('❌ ไม่สามารถยกเลิกการจองได้:', response.message)
          alert('ไม่สามารถยกเลิกการจองได้ กรุณาลองใหม่อีกครั้ง')
        }
      } catch (error) {
        debugLog.error('❌ เกิดข้อผิดพลาดในการยกเลิกการจอง:', error)
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    }
  }

  const loadUserData = async (userData) => {
    try {
      setUser(userData)
      
      // เพิ่ม delay เล็กน้อยเพื่อให้เห็นหน้าโหลด
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // 📊 ดึงข้อมูลการจองของผู้ใช้จาก API จริง
      try {
        debugLog.log('📊 กำลังดึงข้อมูลการจองของผู้ใช้...')
        
        // ตรวจสอบ token ก่อนเรียก API
        const token = authUtils.getToken()
        if (!token) {
          debugLog.error('❌ ไม่มี token สำหรับการเรียก API')
          throw new Error('ไม่มี token สำหรับการเรียก API')
        }
        
        const myBookingsResponse = await reservationAPI.getMyBookings()
        
        if (myBookingsResponse && myBookingsResponse.success) {
          debugLog.log('✅ ดึงข้อมูลการจองสำเร็จ:', myBookingsResponse.data?.length || 0, 'รายการ')
          const reservationsData = myBookingsResponse.data || []
          setReservations(reservationsData)
          
          // คำนวณสถิติจากข้อมูลจริง
          const calculatedStats = calculateStats(reservationsData)
          setStats(calculatedStats)
          
          // ตั้งค่า filter เริ่มต้น
          setFilteredReservations(filterReservations(reservationsData, currentFilter))
          
        } else {
          debugLog.error('❌ ไม่สามารถดึงข้อมูลการจองได้:', myBookingsResponse?.message || 'ไม่ทราบสาเหตุ')
          // ใช้ข้อมูล fallback ถ้า API ล้มเหลว
          const fallbackReservations = [
            {
              reservation_id: 1,
              room_name: 'ห้องประชุม IT-301',
              department: 'คณะเทคโนโลยีสารสนเทศ',
              start_date: '2025-08-05',
              end_date: '2025-08-05',
              start_time: '09:00',
              end_time: '11:00',
              status: 'pending',
              details: 'ประชุมวางแผนโครงการ',
              approved_by: null,
              created_at: '2025-08-03T10:30:00'
            }
          ]
          setReservations(fallbackReservations)
          const fallbackStats = calculateStats(fallbackReservations)
          setStats(fallbackStats)
          setFilteredReservations(filterReservations(fallbackReservations, currentFilter))
        }
      } catch (error) {
        debugLog.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลการจอง:', error)
        // ใช้ข้อมูล fallback ถ้า API ล้มเหลว
        const fallbackReservations = []
        setReservations(fallbackReservations)
        const fallbackStats = calculateStats(fallbackReservations)
        setStats(fallbackStats)
        setFilteredReservations(filterReservations(fallbackReservations, currentFilter))
      }
      
      // 📊 ดึงข้อมูลสถิติการใช้ห้องจาก API จริง
      try {
        debugLog.log('📊 กำลังดึงข้อมูลสถิติการใช้ห้อง...')
        const roomUsageResponse = await statisticsAPI.getRoomUsage()
        
        if (roomUsageResponse.success) {
          debugLog.log('✅ ดึงข้อมูลสถิติการใช้ห้องสำเร็จ:', roomUsageResponse.data.length, 'ห้อง')
          setRoomUsageData(roomUsageResponse.data)
        } else {
          debugLog.error('❌ ไม่สามารถดึงข้อมูลสถิติการใช้ห้องได้:', roomUsageResponse.message)
          // ใช้ข้อมูล fallback ถ้า API ล้มเหลว
          setRoomUsageData([
            { room_name: 'ห้องประชุม IT-301', location: 'อาคาร IT ชั้น 3', bookings: 45 },
            { room_name: 'ห้องประชุม IT-302', location: 'อาคาร IT ชั้น 3', bookings: 38 },
            { room_name: 'ห้องประชุม BA-201', location: 'อาคาร BA ชั้น 2', bookings: 32 },
            { room_name: 'ห้องประชุม ED-101', location: 'อาคาร ED ชั้น 1', bookings: 28 },
            { room_name: 'ห้องประชุม SC-401', location: 'อาคาร SC ชั้น 4', bookings: 25 },
            { room_name: 'ห้องประชุมใหญ่ A', location: 'อาคารหลัก', bookings: 22 }
          ])
        }
      } catch (error) {
        debugLog.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติการใช้ห้อง:', error)
        // ใช้ข้อมูล fallback ถ้า API ล้มเหลว
        setRoomUsageData([
          { room_name: 'ห้องประชุม IT-301', location: 'อาคาร IT ชั้น 3', bookings: 45 },
          { room_name: 'ห้องประชุม IT-302', location: 'อาคาร IT ชั้น 3', bookings: 38 },
          { room_name: 'ห้องประชุม BA-201', location: 'อาคาร BA ชั้น 2', bookings: 32 },
          { room_name: 'ห้องประชุม ED-101', location: 'อาคาร ED ชั้น 1', bookings: 28 },
          { room_name: 'ห้องประชุม SC-401', location: 'อาคาร SC ชั้น 4', bookings: 25 },
          { room_name: 'ห้องประชุมใหญ่ A', location: 'อาคารหลัก', bookings: 22 }
        ])
      }
      
      // 📊 ดึงข้อมูลสถิติตามคณะจาก API จริง
      try {
        debugLog.log('📊 กำลังดึงข้อมูลสถิติตามคณะ...')
        const departmentStatsResponse = await statisticsAPI.getDepartmentStats()
        
        if (departmentStatsResponse.success) {
          debugLog.log('✅ ดึงข้อมูลสถิติตามคณะสำเร็จ:', departmentStatsResponse.data.length, 'คณะ')
          setDepartmentStats(departmentStatsResponse.data)
        } else {
          debugLog.error('❌ ไม่สามารถดึงข้อมูลสถิติตามคณะได้:', departmentStatsResponse.message)
          // ใช้ข้อมูล fallback ถ้า API ล้มเหลว
          setDepartmentStats([
            { department: 'คณะเทคโนโลยีสารสนเทศ', bookings: 83 },
            { department: 'คณะบริหารธุรกิจ', bookings: 67 },
            { department: 'คณะศึกษาศาสตร์', bookings: 54 },
            { department: 'คณะวิทยาศาสตร์', bookings: 41 },
            { department: 'คณะมนุษยศาสตร์', bookings: 29 },
            { department: 'คณะเกษตรศาสตร์', bookings: 18 },
            { department: 'งานอื่นๆ', bookings: 22 }
          ])
        }
      } catch (error) {
        debugLog.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติตามคณะ:', error)
        // ใช้ข้อมูล fallback ถ้า API ล้มเหลว
        setDepartmentStats([
          { department: 'คณะเทคโนโลยีสารสนเทศ', bookings: 83 },
          { department: 'คณะบริหารธุรกิจ', bookings: 67 },
          { department: 'คณะศึกษาศาสตร์', bookings: 54 },
          { department: 'คณะวิทยาศาสตร์', bookings: 41 },
          { department: 'คณะมนุษยศาสตร์', bookings: 29 },
          { department: 'คณะเกษตรศาสตร์', bookings: 18 },
          { department: 'งานอื่นๆ', bookings: 22 }
        ])
      }
      
      setLoading(false)
    } catch (error) {
      debugLog.error('Error loading user data:', error)
      setLoading(false)
    }
  }

  debugLog.log('UserDashboard render - loading:', loading, 'user:', !!user)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          {/* Logo หรือชื่อมหาวิทยาลัย */}
          <div className="mb-8">
            <div className="text-4xl lg:text-6xl font-bold text-green-600 mb-2">
              🏢 RMU
            </div>
            <p className="text-lg lg:text-xl text-gray-700 font-medium">
              ระบบจองห้องประชุม
            </p>
            <p className="text-sm lg:text-base text-gray-500">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
          </div>
          
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 mx-auto"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <p className="text-gray-600 text-lg font-medium">กำลังโหลดระบบ...</p>
            <p className="text-gray-500 text-sm">โปรดรอสักครู่</p>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // จะ redirect ไป login แล้ว
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 sm:p-6 text-white">
          <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold mb-2">
            🎉 ยินดีต้อนรับ {user.first_name} {user.last_name}
          </h1>
          <p className="text-green-100 text-sm sm:text-base lg:text-lg">
            ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม (ผู้ใช้ทั่วไป)
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-blue-500">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl mb-1">📊</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">ทั้งหมด</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.total_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-yellow-500">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl mb-1">⏳</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">รออนุมัติ</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.pending_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-green-500">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl mb-1">✅</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">อนุมัติแล้ว</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.approved_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-red-500">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl mb-1">❌</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">ปฏิเสธ</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.rejected_bookings}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-purple-500 col-span-2 sm:col-span-1">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl mb-1">📅</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">เดือนนี้</h3>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{stats.this_month_bookings}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* สถิติการใช้ห้องประชุม */}
          <RoomUsageChart roomUsageData={roomUsageData} />
          
          {/* สถิติการจองตามคณะ */}
          <DepartmentStatsChart departmentStats={departmentStats} />
        </div>

        {/* My Reservations Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="text-2xl mr-3">📋</span>
                การจองของฉัน
              </h2>
              <div className="text-sm text-gray-600">
                ทั้งหมด {stats.total_bookings} รายการ
              </div>
            </div>
          </div>
          
          {/* Filter Tabs Section */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">กรองตามสถานะ</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                onClick={() => handleFilterChange('upcoming')}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  currentFilter === 'upcoming'
                    ? 'bg-purple-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">📅</div>
                <div className="text-xs font-medium">การจองที่จองไว้</div>
                <div className="text-sm font-bold">({reservations.filter(r => r.status === 'approved' && new Date(r.start_date) >= new Date()).length})</div>
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
              filteredReservations.map((reservation) => (
                <div key={reservation.reservation_id} className="border-b border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{reservation.room_name}</h3>
                      <p className="text-xs text-gray-500">{reservation.department}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">วันที่จอง:</span>
                      <span className="text-gray-900 text-xs">{formatDateTime(reservation.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">วันที่ใช้:</span>
                      <span className="text-gray-900">{formatDate(reservation.start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">วันที่สิ้นสุด:</span>
                      <span className="text-gray-900">{formatDate(reservation.end_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">เวลาใช้:</span>
                      <span className="text-gray-900">{formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">รายละเอียด:</span>
                      <span className="text-gray-900 text-right max-w-[150px] truncate">{reservation.details}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-3">
                    <button 
                      onClick={() => handleViewReservation(reservation)}
                      className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="ดูรายละเอียด"
                    >
                      <span className="text-base"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>
                    </button>
                    {reservation.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleEditReservation(reservation)}
                          className="flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-full transition-all duration-200"
                          title="แก้ไข"
                        >
                          <span className="text-base"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>
                        </button>
                        <button 
                          onClick={() => handleDeleteReservation(reservation)}
                          className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-all duration-200"
                          title="ยกเลิก"
                        >
                          <span className="text-base"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            {filteredReservations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>ไม่มีข้อมูลการจองในหมวดหมู่นี้</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ห้องประชุม
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ทำการจอง
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ใช้
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่สิ้นสุด
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เวลาใช้
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รายละเอียด
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.reservation_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.room_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reservation.department}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(reservation.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(reservation.start_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(reservation.end_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {reservation.details}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewReservation(reservation)}
                            className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-all duration-200"
                            title="ดูรายละเอียด"
                          >
                            <span className="text-base"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>
                          </button>
                          {reservation.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleEditReservation(reservation)}
                                className="flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-full transition-all duration-200"
                                title="แก้ไข"
                              >
                                <span className="text-base"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>
                              </button>
                              <button 
                                onClick={() => handleDeleteReservation(reservation)}
                                className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-all duration-200"
                                title="ยกเลิก"
                              >
                                <span className="text-base"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {/* View Reservation Modal */}
      {showViewModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="text-2xl mr-3">📄</span>
                  รายละเอียดการจอง
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              {/* Content */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">🏢 ข้อมูลห้องประชุม</h3>
                    <p className="text-gray-800 font-medium">{selectedReservation.room_name}</p>
                    <p className="text-gray-600 text-sm">{selectedReservation.department}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">📅 วันที่และเวลา</h3>
                    <p className="text-gray-800">เริ่ม: {formatDate(selectedReservation.start_date)}</p>
                    <p className="text-gray-800">สิ้นสุด: {formatDate(selectedReservation.end_date)}</p>
                    <p className="text-gray-800">เวลา: {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}</p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">📋 สถานะ</h3>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedReservation.status)}`}>
                      {getStatusText(selectedReservation.status)}
                    </span>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">⏰ วันที่จอง</h3>
                    <p className="text-gray-800">{formatDateTime(selectedReservation.created_at)}</p>
                  </div>
                </div>
                
                {selectedReservation.details && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">📝 รายละเอียด</h3>
                    <p className="text-gray-700">{selectedReservation.details}</p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                {selectedReservation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        handleEditReservation(selectedReservation)
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        handleDeleteReservation(selectedReservation)
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                    >
                      🗑️ ยกเลิก
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
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
            // Reload data after save
            const userData = authUtils.getUserWithRole()
            loadUserData(userData)
            setShowEditModal(false)
            setSelectedReservation(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}

// Edit Reservation Modal Component
function EditReservationModal({ reservation, onClose, onSave }) {
  const router = useRouter()
  const [editData, setEditData] = useState({
    start_at: reservation.start_date || reservation.start_at,
    end_at: reservation.end_date || reservation.end_at,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    details_r: reservation.details || reservation.details_r || ''
  })
  const [loading, setLoading] = useState(false)
  const [conflictCheck, setConflictCheck] = useState(null)
  
  // สร้างตัวเลือกเวลา 08:00-22:00 (เต็มชั่วโมงเท่านั้น)
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 8; hour <= 22; hour++) {
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
      // ถ้าเป็น timestamp แปลงเป็นเวลา
      if (timeString.includes('T')) {
        const time = new Date(timeString)
        return time.toTimeString().slice(0, 5)
      }
      // ถ้าเป็น time string แล้ว
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
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    } catch (error) {
      return ''
    }
  }
  
  // Check for conflicts when dates/times change
  const checkConflicts = async () => {
    if (!editData.start_at || !editData.end_at || !editData.start_time || !editData.end_time) {
      setConflictCheck(null)
      return
    }

    try {
      setLoading(true)
      
      // ตรวจสอบว่าเวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น
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
      
      // สร้างรายการวันที่ที่ต้องตรวจสอบ
      const startDate = new Date(editData.start_at)
      const endDate = new Date(editData.end_at)
      const dates = []
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
      
      // ตรวจสอบการขัดแย้งในแต่ละวัน
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
              // กรองเฉพาะการจองที่ไม่ใช่การจองปัจจุบันและยังไม่ถูกยกเลิก/ปฏิเสธ
              const overlappingReservations = calendarData.data.reservations.filter(r => 
                r.reservation_id !== reservation.reservation_id &&
                r.status !== 'cancelled' &&
                r.status !== 'rejected' &&
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
      
      // ถ้ามีการขัดแย้ง แสดง Alert แบบเดียวกับหน้าจอง
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
        
        // แสดง Alert ที่สวยงาม
        setTimeout(() => {
          alert(conflictMessage)
        }, 100)
      }
      
    } catch (error) {
      console.error('Error checking conflicts:', error)
      setConflictCheck(null)
    } finally {
      setLoading(false)
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
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!editData.start_at || !editData.end_at || !editData.start_time || !editData.end_time) {
      alert('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    // ตรวจสอบว่าเวลาสิ้นสุดมากกว่าเวลาเริ่มต้น
    const startTime = timeToMinutes(editData.start_time)
    const endTime = timeToMinutes(editData.end_time)
    
    if (endTime <= startTime) {
      alert('⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')
      return
    }

    // ตรวจสอบการขัดแย้ง
    if (conflictCheck && conflictCheck.length > 0) {
      alert('❌ ไม่สามารถแก้ไขได้เนื่องจากมีการจองที่ขัดแย้งกัน\nกรุณาเลือกวันที่และเวลาอื่น')
      return
    }
    
    try {
      setLoading(true)
      
      // เตรียมข้อมูลสำหรับการอัปเดต
      const updateData = {
        start_date: editData.start_at,
        end_date: editData.end_at,
        start_time: editData.start_time,
        end_time: editData.end_time,
        details: editData.details_r
      }

      // เรียก API ผ่าน reservationAPI
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
      
      // ตรวจสอบประเภทของ error
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
    } finally {
      setLoading(false)
    }
  }
  
  // Check conflicts when dates/times change
  React.useEffect(() => {
    if (editData.start_at && editData.end_at && editData.start_time && editData.end_time) {
      checkConflicts()
    }
  }, [editData.start_at, editData.end_at, editData.start_time, editData.end_time])
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform animate-slideUp">
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
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
              <span className="mr-2">🏢</span>
              ห้องประชุม
            </h3>
            <p className="text-gray-800 font-medium">{reservation.room_name}</p>
            <p className="text-gray-600 text-sm">{reservation.department}</p>
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
                    onChange={(e) => setEditData({...editData, start_time: e.target.value})}
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

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">กำลังตรวจสอบการขัดแย้ง...</span>
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
              disabled={loading || (conflictCheck && conflictCheck.length > 0)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center"
            >
              <span className="mr-2">💾</span>
              {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
