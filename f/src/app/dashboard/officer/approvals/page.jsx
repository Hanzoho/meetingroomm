'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getThemeColors } from '@/utils/theme'



export default function OfficerApprovalsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [reservations, setReservations] = useState([])
  const [filteredReservations, setFilteredReservations] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [processingAction, setProcessingAction] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isClosingModal, setIsClosingModal] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [alertType, setAlertType] = useState('success') // 'success' หรือ 'reject'
  const [modalError, setModalError] = useState('') // error ใน modal
  const itemsPerPage = 10

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeAuth = async () => {
      try {
        const [userData, token] = await Promise.all([
          Promise.resolve(authUtils.getUserWithRole()),
          Promise.resolve(authUtils.getToken())
        ])

        if (!token || !userData) {
          router.push('/login')
          return
        }

        if (userData.role !== 'officer') {
          if (userData.role === 'user') {
            router.push('/dashboard/user')
          } else if (userData.role === 'executive') {
            router.push('/dashboard/executive')
          } else if (userData.role === 'admin') {
            router.push('/dashboard/admin')
          }
          return
        }

        setUser(userData)
        await loadReservations(userData)
      } catch (error) {
        console.error('Auth initialization error:', error)
        router.push('/login')
      }
    }

    initializeAuth()
  }, [router])

  // useEffect สำหรับตรวจสอบ query parameters
  useEffect(() => {
    const reservation_id = searchParams.get('reservation_id')
    const room_name = searchParams.get('room_name')
    const user_name = searchParams.get('user_name')
    const booking_date = searchParams.get('booking_date')
    const booking_time = searchParams.get('booking_time')
    const notification_id = searchParams.get('notification_id')
    const open_modal = searchParams.get('open_modal')

    if (open_modal === 'true' && reservations.length > 0) {
      // เพิ่ม delay เล็กน้อยเพื่อให้หน้าโหลดเสร็จก่อน
      const timer = setTimeout(() => {
        let targetReservation = null

        // หา reservation จาก ID ก่อน
        if (reservation_id) {
          targetReservation = reservations.find(r => r.reservation_id.toString() === reservation_id)
        }

        // ถ้าไม่เจอจาก ID ให้หาจากข้อมูลอื่น
        if (!targetReservation && room_name) {
          targetReservation = reservations.find(r => {
            const roomMatch = r.room_name === room_name
            const userMatch = !user_name || r.user_name === user_name
            const dateMatch = !booking_date || r.start_at?.includes(booking_date)
            const timeMatch = !booking_time || (r.start_time === booking_time.split(' - ')[0])

            return roomMatch && userMatch && dateMatch && timeMatch
          })
        }

        // ถ้ายังไม่เจอ ให้เอาการจองแรกที่ pending
        if (!targetReservation) {
          targetReservation = reservations.find(r => r.status === 'pending' || r.status === 'รออนุมัติ')
        }

        if (targetReservation) {
          console.log('🎯 Found target reservation:', targetReservation)
          setSelectedReservation(targetReservation)
          setShowDetailModal(true)

          // ลบ query parameters ออกจาก URL
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        } else {
          console.log('❌ No matching reservation found')
        }
      }, 500) // รอ 500ms ให้หน้าโหลดเสร็จก่อน

      return () => clearTimeout(timer)
    }
  }, [searchParams, reservations])

  const loadReservations = async (userData) => {
    try {
      const token = authUtils.getToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/protected/officer/reservations?status=all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 401) {
        authUtils.stopTokenExpiryCheck()
        authUtils.clearAuth()
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 Officer reservations loaded:', data)
      console.log('🔍 [DEBUG API] Full response:', data)
      console.log('🔍 [DEBUG API] Reservations array:', data.reservations)

      if (data.success) {
        setReservations(data.reservations || [])
        calculateStats(data.reservations || [])
        filterReservations('all', data.reservations || [])
      }

    } catch (error) {
      console.error('❌ Error loading reservations:', error)
    }
  }

  const calculateStats = (reservationData) => {
    console.log('🔍 [DEBUG STATS] Input reservationData:', reservationData)

    const stats = {
      total: reservationData.length,
      pending: reservationData.filter(r => r.status === 'pending' || r.status === 'รออนุมัติ').length,
      approved: reservationData.filter(r => r.status === 'approved' || r.status === 'อนุมัติแล้ว').length,
      rejected: reservationData.filter(r => r.status === 'rejected' || r.status === 'ปฏิเสธ').length,
      cancelled: reservationData.filter(r => r.status === 'cancelled' || r.status === 'ยกเลิกการจอง' || r.status === 'ยกเลิก').length
    }

    console.log('🔍 [DEBUG STATS] Calculated stats:', stats)
    console.log('🔍 [DEBUG STATS] Sample reservation status:', reservationData.slice(0, 3).map(r => ({ id: r.reservation_id, status: r.status })))
    console.log('🚨 [STATUS DEBUG] All reservation statuses:', reservationData.map(r => r.status))

    // เช็ครายการที่แสดง "ยกเลิกการจอง" แต่ไม่นับใน cancelled
    const cancelledItems = reservationData.filter(r => {
      const statusText = getStatusText(r.status)
      return statusText === 'ยกเลิกการจอง' && r.status !== 'cancelled' && r.status !== 'ยกเลิกการจอง'
    })

    if (cancelledItems.length > 0) {
      console.log('🔍 [CANCELLED DEBUG] Items showing "ยกเลิกการจอง" but not counted:', cancelledItems.map(r => ({ id: r.reservation_id, status: r.status, statusText: getStatusText(r.status) })))
    }

    setStats(stats)
  }

  const filterReservations = (tab, reservationData = reservations) => {
    let filtered = reservationData

    switch (tab) {
      case 'pending':
        filtered = reservationData.filter(r => r.status === 'pending' || r.status === 'รออนุมัติ')
        break
      case 'approved':
        filtered = reservationData.filter(r => r.status === 'approved' || r.status === 'อนุมัติแล้ว')
        break
      case 'rejected':
        filtered = reservationData.filter(r => r.status === 'rejected' || r.status === 'ปฏิเสธ')
        break
      case 'cancelled':
        filtered = reservationData.filter(r => r.status === 'cancelled' || r.status === 'ยกเลิกการจอง' || r.status === 'ยกเลิก')
        break
      default:
        filtered = reservationData
    }

    setFilteredReservations(filtered)
    setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage))) // At least 1 page
    setCurrentPage(1)
  }

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredReservations.slice(startIndex, startIndex + itemsPerPage)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    filterReservations(tab)
  }

  // ฟังก์ชัน Helper สำหรับการแสดงผล
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString)
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }





  const formatTime = (timeString) => {
    if (!timeString) return ''
    // ถ้าเป็นรูปแบบ ISO string ให้แปลงเป็น Date ก่อน
    if (timeString.includes('T') || timeString.length > 8) {
      const date = new Date(timeString)
      return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
    // ถ้าเป็น time string ธรรมดา
    return timeString.substring(0, 5)
  }

  const getStatusColor = (status) => {
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
      case 'ยกเลิกการจอง':
        return 'bg-orange-100 text-orange-800'
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
        return 'ยกเลิกการจอง'
      case 'ยกเลิก':
        return 'ยกเลิกการจอง'
      case 'รออนุมัติ':
      case 'อนุมัติแล้ว':
      case 'ปฏิเสธ':
      case 'ยกเลิกการจอง':
        return status // ถ้าเป็นภาษาไทยแล้วให้ใช้ตัวเดิม
      default:
        return 'ยกเลิกการจอง'
    }
  }

  // ฟังก์ชันสำหรับการดำเนินการ
  const handleViewReservation = (reservation) => {
    setSelectedReservation(reservation)
    setIsClosingModal(false)
    setShowDetailModal(true)
  }

  const handleCloseModal = () => {
    setIsClosingModal(true)
    setTimeout(() => {
      setShowDetailModal(false)
      setIsClosingModal(false)
      setSelectedReservation(null)
    }, 150) // ปิดเร็วๆ 150ms
  }

  const handleApprove = (reservation) => {
    setConfirmAction({
      type: 'approve',
      reservation,
      title: 'ยืนยันการอนุมัติ',
      message: `คุณต้องการอนุมัติการจอง ${reservation.room_name} ของ ${reservation.reserved_by} ใช่หรือไม่?`,
      confirmText: 'อนุมัติ',
      confirmClass: 'bg-green-500 hover:bg-green-600'
    })
    setModalError('') // clear error
    setShowConfirmModal(true)
  }

  const handleReject = (reservation) => {
    setConfirmAction({
      type: 'reject',
      reservation,
      title: 'ยืนยันการปฏิเสธ',
      message: `คุณต้องการปฏิเสธการจอง ${reservation.room_name} ของ ${reservation.reserved_by} ใช่หรือไม่?`,
      confirmText: 'ปฏิเสธ',
      confirmClass: 'bg-red-500 hover:bg-red-600',
      requireReason: true
    })
    setModalError('') // clear error
    setShowConfirmModal(true)
  }

  const executeAction = async () => {
    if (!confirmAction) return

    setProcessingAction(true)
    try {
      const token = authUtils.getToken()
      const endpoint = confirmAction.type === 'approve' ? 'approve' : 'reject'

      let body = {}
      if (confirmAction.type === 'reject') {
        const reason = document.getElementById('rejection-reason')?.value
        if (!reason?.trim()) {
          setModalError('กรุณาระบุเหตุผลในการปฏิเสธ')
          setProcessingAction(false)
          return
        }
        body.reason = reason.trim()
        setModalError('') // clear error ถ้ามีเหตุผลแล้ว
      }

      const response = await fetch(
        `/api/protected/officer/reservations/${confirmAction.reservation.reservation_id}/${endpoint}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )

      const data = await response.json()

      if (data.success) {
        // Show success alert
        if (confirmAction.type === 'approve') {
          setSuccessMessage('อนุมัติสำเร็จ')
          setAlertType('success')
          setShowSuccessAlert(true)
          setTimeout(() => setShowSuccessAlert(false), 1500) // ลดเวลาจาก 3000ms เหลือ 1500ms
        } else {
          setSuccessMessage('ปฏิเสธสำเร็จ')
          setAlertType('reject')
          setShowSuccessAlert(true)
          setTimeout(() => setShowSuccessAlert(false), 1500) // คงเวลาเดิมไว้ที่ 1500ms
        }

        // Reload data
        await loadReservations(user)

        setShowConfirmModal(false)
        setConfirmAction(null)
      } else {
        alert(`เกิดข้อผิดพลาด: ${data.message}`)
      }
    } catch (error) {
      console.error('Action error:', error)
      alert('เกิดข้อผิดพลาดในการดำเนินการ')
    }
    setProcessingAction(false)
  }

  const showSuccessAnimation = (message) => {
    // สร้าง div สำหรับแสดงข้อความสำเร็จ
    const successDiv = document.createElement('div')
    successDiv.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-green-500 rounded-lg p-6 shadow-2xl z-50 animate-bounce'
    successDiv.innerHTML = `
      <div className="text-center">
        <div className="text-4xl mb-2">${confirmAction?.type === 'approve' ? '✅' : '❌'}</div>
        <div className="text-lg font-bold text-gray-800">${message}</div>
      </div>
    `
    document.body.appendChild(successDiv)

    setTimeout(() => {
      document.body.removeChild(successDiv)
    }, 2000)
  }



  if (!user) {
    return null
  }

  const themeColors = getThemeColors('officer')

  return (
    <DashboardLayout user={user}>
      {/* CSS Animations สำหรับ Alert ที่เข้าธีม 🎨 */}
      <style dangerouslySetInnerHTML={{
        __html: `
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

          /* 🎬 Modal Animation ใหม่ - สวย นิ่ม ช้าๆ (ไม่เบลอ) */
          @keyframes modalSlideInBottom {
            0% {
              transform: scale(0.85) translateY(60px);
              opacity: 0;
            }
            60% {
              transform: scale(1.02) translateY(-5px);
              opacity: 0.9;
            }
            100% {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
          }

          @keyframes modalBackdropIn {
            from {
              opacity: 0;
              backdrop-filter: blur(0px);
            }
            to {
              opacity: 1;
              backdrop-filter: blur(12px);
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

          /* 🎨 Enhanced Modal Animations */
          .modal-backdrop-enter {
            animation: modalBackdropIn 0.3s ease-out forwards;
          }

          .modal-content-enter {
            animation: modalSlideInBottom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          /* Smooth transitions for all modal elements */
          .modal-element {
            transition: all 0.2s ease-out;
          }

          .modal-element:hover {
            transform: translateY(-1px);
          }
        `
      }} />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="text-2xl sm:text-3xl">📋</div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">อนุมัติการจอง</h1>
              <p className="text-sm sm:text-base text-gray-600">จัดการการอนุมัติการจองห้องประชุม</p>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-blue-500 min-h-[100px] flex items-center">
            <div className="text-center w-full">
              <div className="text-xl sm:text-2xl mb-1">📊</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">ทั้งหมด</h3>
              <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-yellow-500 min-h-[100px] flex items-center">
            <div className="text-center w-full">
              <div className="text-xl sm:text-2xl mb-1">⏳</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">รออนุมัติ</h3>
              <p className="text-lg sm:text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-green-500 min-h-[100px] flex items-center">
            <div className="text-center w-full">
              <div className="text-xl sm:text-2xl mb-1">✅</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">อนุมัติแล้ว</h3>
              <p className="text-lg sm:text-xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-red-500 min-h-[100px] flex items-center">
            <div className="text-center w-full">
              <div className="text-xl sm:text-2xl mb-1">❌</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">ปฏิเสธ</h3>
              <p className="text-lg sm:text-xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-l-4 border-orange-500 min-h-[100px] flex items-center">
            <div className="text-center w-full">
              <div className="text-xl sm:text-2xl mb-1">🚫</div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700">ยกเลิกแล้ว</h3>
              <p className="text-lg sm:text-xl font-bold text-orange-600">{stats.cancelled}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation และ Table ใน Container เดียว */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2 sm:space-x-2 sm:flex-nowrap">
              {[
                { key: 'all', label: 'ทั้งหมด', count: stats.total },
                { key: 'pending', label: 'รออนุมัติ', count: stats.pending },
                { key: 'approved', label: 'อนุมัติแล้ว', count: stats.approved },
                { key: 'rejected', label: 'ปฏิเสธ', count: stats.rejected },
                { key: 'cancelled', label: 'ยกเลิกแล้ว', count: stats.cancelled }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex-1 min-w-0 px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab.key
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  <span className="block sm:inline">{tab.label}</span>
                  <span className="block sm:inline text-xs opacity-90"> ({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Content - ใช้ UI แบบเดียวกับหน้า User */}
          <div className="p-3 sm:p-4">
            {getCurrentPageData().length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <div className="text-3xl sm:text-4xl mb-2">📝</div>
                <p className="text-sm sm:text-base">ไม่มีข้อมูลการจองในหมวดหมู่นี้</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full table-auto min-w-[900px] sm:min-w-[1000px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 sm:w-32">
                        ห้องประชุม
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 sm:w-40">
                        ผู้จอง
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36 sm:w-40">
                        วันที่ทำการจอง
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 sm:w-32">
                        วันที่ใช้
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 sm:w-32">
                        วันที่สิ้นสุด
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        เวลาใช้
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sm:w-24">
                        สถานะ
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36 sm:w-40">
                        รายละเอียด
                      </th>
                      <th className="px-2 sm:px-3 py-3 sm:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-48 sm:w-52">
                        การดำเนินการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageData().map((reservation) => (
                      <tr key={reservation.reservation_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 leading-tight">
                            {reservation.room_name}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 leading-tight">
                            {reservation.reserved_by?.split(' ')[0] || reservation.reserved_by}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {formatDateTime(reservation.created_at)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {formatDate(reservation.start_date)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {formatDate(reservation.end_date)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                            {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(reservation.status)}`}>
                            {getStatusText(reservation.status)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900 max-w-[120px] sm:max-w-[160px] truncate" title={reservation.details}>
                            {reservation.details}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-3 sm:py-4">
                          <div className="flex items-center justify-center space-x-3">
                            {/* ปุ่มดูรายละเอียด */}
                            <button
                              onClick={() => handleViewReservation(reservation)}
                              className="text-blue-600 hover:text-blue-800 transition-colors duration-150 text-sm"
                              title="ดูรายละเอียด"
                            >
                              📄 ดู
                            </button>

                            {/* ปุ่มอนุมัติ/ปฏิเสธ สำหรับสถานะ pending */}
                            {(reservation.status === 'pending' || reservation.status === 'รออนุมัติ') && (
                              <>
                                <button
                                  onClick={() => handleApprove(reservation)}
                                  className="text-green-600 hover:text-green-800 transition-colors duration-150 text-sm"
                                  title="อนุมัติ"
                                >
                                  ✅ อนุมัติ
                                </button>
                                <button
                                  onClick={() => handleReject(reservation)}
                                  className="text-red-600 hover:text-red-800 transition-colors duration-150 text-sm"
                                  title="ปฏิเสธ"
                                >
                                  ❌ ปฏิเสธ
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagination - Always show */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            ทั้งหมด {filteredReservations.length} รายการ
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-black border-gray-300 hover:bg-gray-50 disabled:text-black disabled:opacity-50 text-xs sm:text-sm px-2 sm:px-3"
            >
              ก่อนหน้า
            </Button>

            <div className="flex space-x-0.5 sm:space-x-1">
              {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => {
                const maxVisible = 3; // แสดง 3 หน้าในมือถือ
                const page = currentPage <= Math.floor(maxVisible / 2) + 1
                  ? index + 1
                  : currentPage >= totalPages - Math.floor(maxVisible / 2)
                    ? totalPages - maxVisible + 1 + index
                    : currentPage - Math.floor(maxVisible / 2) + index

                if (page < 1 || page > totalPages) return null

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] sm:min-w-[36px] h-8 sm:h-9 text-xs sm:text-sm px-1 sm:px-2 ${
                      currentPage === page
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="text-black border-gray-300 hover:bg-gray-50 disabled:text-black disabled:opacity-50 text-xs sm:text-sm px-2 sm:px-3"
            >
              ถัดไป
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReservation && (
        <div
          className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm transition-all ${isClosingModal
              ? 'opacity-0 backdrop-blur-0 duration-200'
              : 'opacity-100 backdrop-blur-sm duration-300'
            }`}
          onClick={handleCloseModal}
          style={{
            background: isClosingModal
              ? 'rgba(0, 0, 0, 0)'
              : 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.3) 100%)'
          }}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all ${isClosingModal
                ? 'scale-95 translate-y-8 opacity-0 duration-200 ease-in'
                : 'scale-100 translate-y-0 opacity-100 duration-500 ease-out'
              }`}
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              transformOrigin: 'center bottom',
              animation: isClosingModal
                ? 'none'
                : 'modalSlideInBottom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📋</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">รายละเอียดคำขอจอง</h3>
                  <p className="text-sm text-gray-500">ข้อมูลการจองห้องประชุม</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ห้องประชุม</label>
                  <p className="text-sm text-gray-900">{selectedReservation.room_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ผู้จอง</label>
                  <p className="text-sm text-gray-900">{selectedReservation.reserved_by}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">คณะ/หน่วยงาน</label>
                  <p className="text-sm text-gray-900">
                    {selectedReservation.user_department ||
                      selectedReservation.user_position ||
                      selectedReservation.department ||
                      'ไม่ระบุหน่วยงาน'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่จอง</label>
                  <p className="text-sm text-gray-900">
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
                      if (selectedReservation.booking_dates && Array.isArray(selectedReservation.booking_dates)) {
                        dates = selectedReservation.booking_dates.map(dateStr => new Date(dateStr))
                      } else {
                        // ถ้าไม่มี booking_dates ให้สร้างจาก start_date ถึง end_date (ระบบเก่า)
                        const startDate = new Date(selectedReservation.start_date)
                        const endDate = new Date(selectedReservation.end_date)
                        const current = new Date(startDate)
                        while (current <= endDate) {
                          dates.push(new Date(current))
                          current.setDate(current.getDate() + 1)
                        }
                      }
                      
                      // เรียงวันที่ให้ถูกต้อง
                      dates.sort((a, b) => a - b)
                      
                      const bookingDatesText = dates.map(date => formatShortDate(date)).join(', ')
                      return `${bookingDatesText} (ทั้งหมด ${dates.length} วัน)`
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่เริ่ม</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedReservation.start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedReservation.end_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">เวลา</label>
                  <p className="text-sm text-gray-900">
                    {formatTime(selectedReservation.start_time)} - {formatTime(selectedReservation.end_time)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่ทำการจอง</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedReservation.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReservation.status)}`}>
                    {getStatusText(selectedReservation.status)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียด</label>
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                  {selectedReservation.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>
              </div>

              {(selectedReservation.status !== 'pending' && selectedReservation.status !== 'รออนุมัติ') && selectedReservation.processed_by && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">ดำเนินการโดย</label>
                  <p className="text-sm text-gray-900">{selectedReservation.processed_by}</p>
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 mt-6">
              <div className="flex items-center justify-between">
                {/* Close Button - Left Side */}
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <span>←</span>
                  <span>ปิด</span>
                </button>

                {/* Action Buttons - Right Side */}
                {(selectedReservation.status === 'pending' || selectedReservation.status === 'รออนุมัติ') ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        handleCloseModal()
                        setTimeout(() => handleApprove(selectedReservation), 200)
                      }}
                      className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
                    >
                      <span>✅</span>
                      <span>อนุมัติ</span>
                    </button>
                    <button
                      onClick={() => {
                        handleCloseModal()
                        setTimeout(() => handleReject(selectedReservation), 200)
                      }}
                      className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
                    >
                      <span>❌</span>
                      <span>ปฏิเสธ</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    {(selectedReservation.status !== 'pending' && selectedReservation.status !== 'รออนุมัติ') && selectedReservation.processed_by && (
                      `${(selectedReservation.status === 'approved' || selectedReservation.status === 'อนุมัติแล้ว') ? 'อนุมัติโดย' : 'ปฏิเสธโดย'} ${selectedReservation.processed_by}`
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
            <div className="p-6">
              <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${confirmAction.type === 'approve'
                  ? 'bg-green-100'
                  : 'bg-red-100'
                }`}>
                <span className={`text-2xl ${confirmAction.type === 'approve'
                    ? 'text-green-600'
                    : 'text-red-600'
                  }`}>
                  {confirmAction.type === 'approve' ? '✅' : '❌'}
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{confirmAction.title}</h3>
                <p className="text-gray-600 mb-4">{confirmAction.message}</p>

                {confirmAction.type === 'reject' && (
                  <div className="bg-red-50 p-3 rounded-lg text-sm text-red-700 mb-4">
                    ⚠️ การปฏิเสธจะแจ้งเหตุผลให้ผู้จองทราบ
                  </div>
                )}
              </div>

              {confirmAction.requireReason && (
                <div className="mb-6 text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เหตุผลในการปฏิเสธ *
                  </label>
                  <textarea
                    id="rejection-reason"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-white text-gray-900"
                    rows="4"
                    placeholder="โปรดระบุเหตุผลในการปฏิเสธ"
                  />
                  {modalError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm font-medium">⚠️ {modalError}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setConfirmAction(null)
                  }}
                  disabled={processingAction}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={executeAction}
                  disabled={processingAction}
                  className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors duration-200 font-medium flex items-center justify-center ${confirmAction.confirmClass}`}
                >
                  {processingAction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    confirmAction.confirmText
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Reject Alert Modal - ปรับให้เข้าธีม 🎨 */}
      {showSuccessAlert && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-lg backdrop-saturate-150 transition-all duration-500`}
          style={{
            background: `linear-gradient(135deg, 
              rgba(0, 0, 0, 0.4) 0%, 
              rgba(0, 0, 0, 0.2) 50%, 
              rgba(0, 0, 0, 0.3) 100%
            )`,
            animation: 'backdropFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }}
        >
          <div className="max-w-md w-full mx-4 overflow-hidden border-2 bg-white rounded-2xl shadow-2xl transform"
            style={{
              borderColor: alertType === 'success' ? '#10b981' : '#ef4444',
              animation: 'modalSlideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
            }}
          >
            {/* Header - เหมือนธีม Custom Alert */}
            <div className={`p-6 -m-6 mb-4 relative overflow-hidden ${alertType === 'success'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}>
              {/* Animated Background Elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"
                style={{ animation: 'pulse 2s infinite' }}></div>

              <div className="relative flex items-center text-white z-10">
                <span className="mr-3 text-2xl"
                  style={{ animation: 'iconBounce 0.8s ease-out' }}
                >
                  {alertType === 'success' ? '🎉' : '⚠️'}
                </span>
                <h3 className="text-xl font-bold"
                  style={{ animation: 'textSlideIn 0.6s ease-out 0.2s both' }}
                >
                  {alertType === 'success' ? 'สำเร็จ!' : 'ปฏิเสธแล้ว!'}
                </h3>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-6 text-center">
              {/* Icon Circle */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${alertType === 'success'
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100'
                  : 'bg-gradient-to-br from-red-100 to-red-200'
                }`}
                style={{
                  animation: 'successIconScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both',
                  boxShadow: alertType === 'success'
                    ? '0 10px 30px rgba(16, 185, 129, 0.3)'
                    : '0 10px 30px rgba(239, 68, 68, 0.3)'
                }}
              >
                <svg className={`w-10 h-10 ${alertType === 'success' ? 'text-green-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {alertType === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                  )}
                </svg>

                {/* Ripple Effects */}
                {alertType === 'success' && (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 opacity-60"
                      style={{ animation: 'ripple 2s infinite' }}></div>
                    <div className="absolute inset-2 rounded-full border-2 border-green-400 opacity-40"
                      style={{ animation: 'ripple 2s infinite 0.4s' }}></div>
                  </>
                )}
              </div>

              {/* Message */}
              <p className="text-gray-700 text-lg font-medium"
                style={{ animation: 'messageSlideUp 0.6s ease-out 0.5s both' }}
              >
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
