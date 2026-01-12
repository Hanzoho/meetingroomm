'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Bar, Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

export default function OfficerReports() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState({
    reservation_summary: [],
    room_utilization: [],
    monthly_trends: []
  })
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 5,
    has_prev: false,
    has_next: false
  })
  // เพิ่ม state สำหรับประวัติการอนุมัติ
  const [approvalHistory, setApprovalHistory] = useState([])
  const [approvalStats, setApprovalStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [approvalPagination, setApprovalPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 10,
    has_prev: false,
    has_next: false
  })
  const [approvalActiveTab, setApprovalActiveTab] = useState('all') // 'all', 'pending', 'approved', 'rejected'
  const [activeTab, setActiveTab] = useState('charts') // 'charts', 'reviews', 'approvals'
  const [dateRange, setDateRange] = useState('current_month')
  const [error, setError] = useState('')
  
  // เพิ่ม state สำหรับ Modal
  const [showApprovalDetailModal, setShowApprovalDetailModal] = useState(false)
  const [selectedApprovalReservation, setSelectedApprovalReservation] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const initializeAuth = async () => {
      const userData = authUtils.getUserWithRole()
      const token = authUtils.getToken()

      if (!userData || !token) {
        router.push('/login')
        return
      }

      // ตรวจสอบว่าเป็น officer
      if (userData.role !== 'officer') {
        router.push('/dashboard')
        return
      }

      setUser(userData)
      await loadReports()
      await loadReviews()
      await loadApprovalHistory() // โหลดข้อมูลแรก
      await loadApprovalStats()   // โหลดสถิติทั้งหมด
    }

    initializeAuth()
  }, [router])

  // Format functions สำหรับแสดงข้อมูลให้ตรงกับหน้า Approvals
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

  const loadReports = async (period = dateRange) => {
    try {
      const token = authUtils.getToken()
      const response = await fetch(`/api/protected/officer/reports?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load reports')
      }

      const data = await response.json()
      
      setReports(data.data || {})
    } catch (error) {
      setError('ไม่สามารถโหลดรายงานได้: ' + error.message)
    }
  }

  const loadReviews = async (page = 1, limit = 5) => {
    try {
      const token = authUtils.getToken()
      const response = await fetch(`/api/protected/officer/reviews?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load reviews')
      }

      const data = await response.json()
      
      setReviews(data.reviews || [])
      setPagination(data.pagination || {
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: 5,
        has_prev: false,
        has_next: false
      })
    } catch (error) {
      // ไม่ให้ error นี้หยุดการทำงานของ reports
    }
  }

  // Function สำหรับโหลดประวัติการอนุมัติ
  const loadApprovalHistory = async (page = 1, limit = 10, status = 'all') => {
    try {
      const token = authUtils.getToken()
      const statusParam = status === 'all' ? 'all' : status
      const response = await fetch(`/api/protected/officer/approval-history?page=${page}&limit=${limit}&status=${statusParam}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load approval history')
      }

      const data = await response.json()
      
      if (data.success) {
        setApprovalHistory(data.reservations || [])
        
        // คำนวณสถิติจากข้อมูลทั้งหมด (ไม่ใช่เฉพาะ tab ที่เลือก)
        if (status === 'all') {
          calculateApprovalStats(data.reservations || [])
        }
        
        setApprovalPagination(data.pagination || {
          current_page: 1,
          total_pages: 1,
          total_items: 0,
          items_per_page: 10,
          has_prev: false,
          has_next: false
        })
      }
    } catch (error) {
    }
  }

  // โหลดสถิติทั้งหมดแยกต่างหาก (เพื่อแสดงสถิติคงที่)
  const loadApprovalStats = async () => {
    try {
      const token = authUtils.getToken()
      const response = await fetch(`/api/protected/officer/approval-history?page=1&limit=1000&status=all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load approval stats')
      }

      const data = await response.json()
      if (data.success) {
        calculateApprovalStats(data.reservations || [])
      }
    } catch (error) {
    }
  }

  // คำนวณสถิติสำหรับประวัติการอนุมัติ
  const calculateApprovalStats = (reservationData) => {
    const stats = {
      total: reservationData.length,
      pending: reservationData.filter(r => r.status === 'pending' || r.status === 'รออนุมัติ').length,
      approved: reservationData.filter(r => r.status === 'approved' || r.status === 'อนุมัติแล้ว').length,
      rejected: reservationData.filter(r => r.status === 'rejected' || r.status === 'ปฏิเสธ').length
    }
    setApprovalStats(stats)
  }

  // 📄 Functions สำหรับ pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      loadReviews(newPage, pagination.items_per_page)
    }
  }

  const goToNextPage = () => {
    if (pagination.has_next) {
      handlePageChange(pagination.current_page + 1)
    }
  }

  const goToPrevPage = () => {
    if (pagination.has_prev) {
      handlePageChange(pagination.current_page - 1)
    }
  }

  // Functions สำหรับ pagination ของประวัติการอนุมัติ
  const handleApprovalPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= approvalPagination.total_pages) {
      loadApprovalHistory(newPage, approvalPagination.items_per_page, approvalActiveTab)
    }
  }

  const goToApprovalNextPage = () => {
    if (approvalPagination.has_next) {
      handleApprovalPageChange(approvalPagination.current_page + 1)
    }
  }

  const goToApprovalPrevPage = () => {
    if (approvalPagination.has_prev) {
      handleApprovalPageChange(approvalPagination.current_page - 1)
    }
  }

  const handleApprovalTabChange = (tab) => {
    setApprovalActiveTab(tab)
    // โหลดข้อมูลตาม tab แต่ไม่ recalculate สถิติ
    loadApprovalHistory(1, approvalPagination.items_per_page, tab)
  }

  // Functions สำหรับ Modal ของประวัติการอนุมัติ
  const handleViewApprovalDetails = (reservation) => {
    setSelectedApprovalReservation(reservation)
    setShowApprovalDetailModal(true)
  }

  const handleCloseApprovalModal = () => {
    setShowApprovalDetailModal(false)
    setSelectedApprovalReservation(null)
  }

  // ปิด Modal เมื่อกดที่ backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseApprovalModal()
    }
  }

  const handleDateRangeChange = async (newRange) => {
    setDateRange(newRange)
    await loadReports(newRange)
  }

  // Helper function to get count from reservation_summary array
  const getSummaryCount = (category) => {
    const item = reports.reservation_summary?.find(item => 
      item.category.includes(category)
    )
    return item?.count || 0
  }

  // Chart configurations
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  }

  // Reservation Status Chart Data
  const reservationStatusData = {
    labels: ['อนุมัติแล้ว', 'รอการอนุมัติ', 'ปฏิเสธ'],
    datasets: [{
      label: 'จำนวนการจอง',
      data: [
        getSummaryCount('อนุมัติแล้ว'),
        getSummaryCount('รอการอนุมัติ'),
        getSummaryCount('ปฏิเสธ')
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 1)',
        'rgba(251, 191, 36, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(156, 163, 175, 1)'
      ],
      borderWidth: 2
    }]
  }

  // Room Utilization Chart Data
  const roomUtilizationData = {
    labels: reports.room_utilization?.map(room => room.room_name) || [],
    datasets: [{
      label: 'จำนวนการจอง',
      data: reports.room_utilization?.map(room => room.usage_count) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2
    }]
  }

  // Monthly Trends Chart Data
  const monthlyTrendsData = {
    labels: reports.monthly_trends?.map(trend => trend.month) || [],
    datasets: [{
      label: 'การจองรวม',
      data: reports.monthly_trends?.map(trend => trend.reservations) || [],
      borderColor: 'rgba(16, 185, 129, 1)',
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      tension: 0.4,
      fill: true
    }]
  }

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  รายงานการใช้งานระบบจองห้องประชุม 
                </h1>
                <p className="mt-2 text-gray-600">
                  รายงานการใช้งานในหน่วยงานที่คุณรับผิดชอบ
                </p>
              </div>
              
              {/* Date Range Selector */}
              <div className="flex space-x-2">
                <select 
                  value={dateRange} 
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="current_month">เดือนนี้</option>
                  <option value="last_month">เดือนที่แล้ว</option>
                  <option value="last_3_months">3 เดือนล่าสุด</option>
                  <option value="last_6_months">6 เดือนล่าสุด</option>
                  <option value="current_year">1 ปีล่าสุด</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">การจองทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {getSummaryCount('การจองทั้งหมด')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">อนุมัติแล้ว</p>
                  <p className="text-2xl font-bold text-gray-900">{getSummaryCount('อนุมัติแล้ว')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">รอการอนุมัติ</p>
                  <p className="text-2xl font-bold text-gray-900">{getSummaryCount('รอการอนุมัติ')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ปฏิเสธ</p>
                  <p className="text-2xl font-bold text-gray-900">{getSummaryCount('ปฏิเสธ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'charts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  สถิติการใช้งาน
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'reviews'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  รายงานปัญหา ({pagination.total_items})
                </button>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'approvals'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ประวัติการอนุมัติ ({approvalStats.total})
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'charts' && (
            <div>
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Reservation Status Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📈 สถานะการจอง
              </h3>
              <div style={{ height: '300px' }}>
                <Pie data={reservationStatusData} options={{ ...chartOptions, maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Room Utilization Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🏢 การใช้งานห้องประชุม
              </h3>
              <div style={{ height: '300px' }}>
                <Bar data={roomUtilizationData} options={{ ...chartOptions, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              แนวโน้มการจองรายเดือน
            </h3>
            <div style={{ height: '400px' }}>
              <Line data={monthlyTrendsData} options={{ ...chartOptions, maintainAspectRatio: false }} />
            </div>
          </div>
            </div>
          )}

          {/* Reviews Tab Content */}
          {activeTab === 'reviews' && (
            <div className="bg-white rounded-xl shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  รายงานปัญหาและข้อเสนอแนะ
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  รายการรีวิวและข้อเสนะแนะจากผู้ใช้งานห้องประชุม
                </p>
              </div>
              <div className="p-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">ยังไม่มีรายงานปัญหา</h3>
                    <p className="text-gray-500">ยังไม่มีผู้ใช้รายงานปัญหาหรือข้อเสนอแนะเข้ามา</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {reviews.map((review, index) => (
                      <div key={review.review_id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex-shrink-0">
                                {review.user_profile_image ? (
                                  <img
                                    src={review.user_profile_image}
                                    alt={`${review.user_name || 'ผู้ใช้'} profile`}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                    onError={(e) => {
                                      // Fallback to initials if image fails to load
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md ${
                                    review.user_profile_image ? 'hidden' : 'flex'
                                  }`}
                                >
                                  <span className="text-sm font-bold text-white">
                                    {(review.user_name || review.first_name || review.username || 'U')
                                      .charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  {review.user_name || 
                                   `${review.first_name || ''} ${review.last_name || ''}`.trim() ||
                                   review.username || 
                                   'ผู้ใช้ไม่ระบุชื่อ'}
                                </h4>
                                <div className="flex items-center text-xs text-gray-500 space-x-2">
                                  <span>ห้อง: {review.room_name || 'ไม่ระบุ'}</span>
                                  <span>•</span>
                                  <span>เมื่อ {new Date(review.created_at).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mb-3">
                              <p className="text-gray-700">
                                {review.comment || 'ไม่มีความคิดเห็น'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>

                    {/* 📄 Pagination Controls */}
                    {pagination.total_pages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-gray-50 px-6 py-4 rounded-lg">
                      <div className="flex items-center text-sm text-gray-600">
                        <span>
                          {pagination.total_items === 0 
                            ? 'ไม่มีรายการ' 
                            : `รายการทั้งหมด ${pagination.total_items} รายการ`
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Previous Button */}
                        <button
                          onClick={goToPrevPage}
                          disabled={!pagination.has_prev}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pagination.has_prev
                              ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          ← ก่อนหน้า
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center space-x-1">
                          {[...Array(pagination.total_pages)].map((_, index) => {
                            const pageNumber = index + 1
                            const isCurrentPage = pageNumber === pagination.current_page
                            
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => handlePageChange(pageNumber)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  isCurrentPage
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            )
                          })}
                        </div>

                        {/* Next Button */}
                        <button
                          onClick={goToNextPage}
                          disabled={!pagination.has_next}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            pagination.has_next
                              ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          ถัดไป →
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Approvals History Tab Content */}
          {activeTab === 'approvals' && (
            <div className="bg-white rounded-xl shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  ประวัติการอนุมัติ
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  ประวัติการอนุมัติ/ปฏิเสธการจองของเจ้าหน้าที่
                </p>
              </div>

              {/* Stats for Approval History */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => handleApprovalTabChange('all')}
                    className={`p-4 rounded-lg text-center transition-all duration-200 ${
                      approvalActiveTab === 'all'
                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-2xl font-bold">{approvalStats.total}</div>
                    <div className="text-sm">ทั้งหมด</div>
                  </button>
                  <button
                    onClick={() => handleApprovalTabChange('pending')}
                    className={`p-4 rounded-lg text-center transition-all duration-200 ${
                      approvalActiveTab === 'pending'
                        ? 'bg-yellow-50 border-2 border-yellow-500 text-yellow-700'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-2xl font-bold">{approvalStats.pending}</div>
                    <div className="text-sm">รออนุมัติ</div>
                  </button>
                  <button
                    onClick={() => handleApprovalTabChange('approved')}
                    className={`p-4 rounded-lg text-center transition-all duration-200 ${
                      approvalActiveTab === 'approved'
                        ? 'bg-green-50 border-2 border-green-500 text-green-700'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-2xl font-bold">{approvalStats.approved}</div>
                    <div className="text-sm">อนุมัติแล้ว</div>
                  </button>
                  <button
                    onClick={() => handleApprovalTabChange('rejected')}
                    className={`p-4 rounded-lg text-center transition-all duration-200 ${
                      approvalActiveTab === 'rejected'
                        ? 'bg-red-50 border-2 border-red-500 text-red-700'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-2xl font-bold">{approvalStats.rejected}</div>
                    <div className="text-sm">ปฏิเสธ</div>
                  </button>
                </div>
              </div>

              {/* Approval History Table */}
              <div className="p-6">
                {approvalHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">ไม่มีประวัติการอนุมัติ</h3>
                    <p className="text-gray-500">ยังไม่มีประวัติการอนุมัติหรือปฏิเสธการจอง</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">ห้องประชุม</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px]">ผู้จอง</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[130px]">วันที่ทำการจอง</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">วันที่ใช้</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">วันที่สิ้นสุด</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[110px]">เวลาใช้</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">สถานะ</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">รายละเอียด</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px]">การดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {approvalHistory.map((reservation) => (
                            <tr key={reservation.reservation_id} className="hover:bg-gray-50">
                              <td className="px-3 py-3 text-sm font-medium text-gray-900">
                                <div className="max-w-[120px] truncate" title={reservation.room_name}>
                                  {reservation.room_name}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm font-medium text-gray-900">
                                <div className="max-w-[90px] truncate" title={reservation.reserved_by}>
                                  {reservation.reserved_by?.split(' ')[0] || reservation.reserved_by}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-500">
                                <div className="max-w-[130px] truncate" title={formatDateTime(reservation.created_at)}>
                                  {formatDateTime(reservation.created_at)}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-500">
                                <div className="max-w-[100px] truncate" title={formatDate(reservation.start_date)}>
                                  {formatDate(reservation.start_date)}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-500">
                                <div className="max-w-[100px] truncate" title={formatDate(reservation.end_date)}>
                                  {formatDate(reservation.end_date)}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-500">
                                <div className="max-w-[110px] truncate" title={`${formatTime(reservation.start_time)} - ${formatTime(reservation.end_time)}`}>
                                  {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  (reservation.status === 'approved' || reservation.status === 'อนุมัติแล้ว')
                                    ? 'bg-green-100 text-green-800'
                                    : (reservation.status === 'rejected' || reservation.status === 'ปฏิเสธ')
                                    ? 'bg-red-100 text-red-800'
                                    : (reservation.status === 'pending' || reservation.status === 'รออนุมัติ')
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {(reservation.status === 'approved' || reservation.status === 'อนุมัติแล้ว') && 'อนุมัติ'}
                                  {(reservation.status === 'rejected' || reservation.status === 'ปฏิเสธ') && 'ปฏิเสธ'}
                                  {(reservation.status === 'pending' || reservation.status === 'รออนุมัติ') && '⏳ รออนุมัติ'}
                                  {!['approved', 'rejected', 'pending', 'อนุมัติแล้ว', 'ปฏิเสธ', 'รออนุมัติ'].includes(reservation.status) && 'ยกเลิกการจอง'}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-500">
                                <div className="space-y-1 max-w-[140px]">
                                  <div className="truncate text-sm" title={reservation.details}>
                                    {reservation.details}
                                  </div>
                                  {reservation.rejected_reason && (
                                    <div className="text-xs text-red-600 truncate" title={reservation.rejected_reason}>
                                      เหตุผล: {reservation.rejected_reason}
                                    </div>
                                  )}
                                  {((reservation.status === 'approved' || reservation.status === 'อนุมัติแล้ว') || (reservation.status === 'rejected' || reservation.status === 'ปฏิเสธ')) && !reservation.approved_by && (
                                    <div className="text-xs text-gray-400">ไม่ระบุผู้ดำเนินการ</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  onClick={() => handleViewApprovalDetails(reservation)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors duration-150 text-sm"
                                  title="ดูรายละเอียด"
                                >
                                  📄 ดู
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Approval History Pagination */}
                    {approvalPagination.total_pages > 1 && (
                      <div className="mt-6 flex items-center justify-between bg-gray-50 px-6 py-4 rounded-lg">
                        <div className="flex items-center text-sm text-gray-600">
                          <span>
                            {approvalPagination.total_items === 0 
                              ? 'ไม่มีรายการ' 
                              : `รายการทั้งหมด ${approvalPagination.total_items} รายการ`
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={goToApprovalPrevPage}
                            disabled={!approvalPagination.has_prev}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              approvalPagination.has_prev
                                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            ← ก่อนหน้า
                          </button>

                          <div className="flex items-center space-x-1">
                            {[...Array(approvalPagination.total_pages)].map((_, index) => {
                              const pageNumber = index + 1
                              const isCurrentPage = pageNumber === approvalPagination.current_page
                              
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => handleApprovalPageChange(pageNumber)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isCurrentPage
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              )
                            })}
                          </div>

                          <button
                            onClick={goToApprovalNextPage}
                            disabled={!approvalPagination.has_next}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              approvalPagination.has_next
                                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            ถัดไป →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

  {/* Modal รายละเอียดคำขอจองสำหรับประวัติการอนุมัติ */}
      {showApprovalDetailModal && selectedApprovalReservation && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
          onClick={handleBackdropClick}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto transform animate-in zoom-in-95 slide-in-from-bottom-4 duration-700 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              animationDelay: '100ms',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg"></span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">รายละเอียดคำขอจอง</h3>
                  <p className="text-sm text-gray-500">ข้อมูลการจองห้องประชุม</p>
                </div>
              </div>
              <button 
                onClick={handleCloseApprovalModal}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Grid Layout */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ห้องประชุม</label>
                  <p className="text-sm text-gray-900">{selectedApprovalReservation.room_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ผู้จอง</label>
                  <p className="text-sm text-gray-900">{selectedApprovalReservation.user_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">คณะ/หน่วยงาน</label>
                  <p className="text-sm text-gray-900">{selectedApprovalReservation.user_department}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่เริ่ม</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedApprovalReservation.start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedApprovalReservation.end_date || selectedApprovalReservation.start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">เวลา</label>
                  <p className="text-sm text-gray-900">{formatTime(selectedApprovalReservation.start_time)} - {formatTime(selectedApprovalReservation.end_time)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่ทำการจอง</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedApprovalReservation.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedApprovalReservation.status === 'approved' || selectedApprovalReservation.status === 'อนุมัติแล้ว'
                      ? 'bg-green-100 text-green-800'
                      : selectedApprovalReservation.status === 'rejected' || selectedApprovalReservation.status === 'ปฏิเสธแล้ว'
                      ? 'bg-red-100 text-red-800'
                      : selectedApprovalReservation.status === 'pending' || selectedApprovalReservation.status === 'รออนุมัติ'
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedApprovalReservation.status === 'cancelled' || selectedApprovalReservation.status === 'ยกเลิก'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(selectedApprovalReservation.status === 'approved' || selectedApprovalReservation.status === 'อนุมัติแล้ว') && 'อนุมัติแล้ว'}
                    {(selectedApprovalReservation.status === 'rejected' || selectedApprovalReservation.status === 'ปฏิเสธแล้ว') && 'ปฏิเสธแล้ว'}
                    {(selectedApprovalReservation.status === 'pending' || selectedApprovalReservation.status === 'รออนุมัติ') && 'รออนุมัติ'}
                    {(selectedApprovalReservation.status === 'cancelled' || selectedApprovalReservation.status === 'ยกเลิก') && 'ยกเลิก'}
                    {!['approved', 'rejected', 'pending', 'cancelled', 'อนุมัติแล้ว', 'ปฏิเสธแล้ว', 'รออนุมัติ', 'ยกเลิก'].includes(selectedApprovalReservation.status) && 'ยกเลิกการจอง'}
                  </span>
                </div>
              </div>

              {/* รายละเอียด */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียด</label>
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-md">{selectedApprovalReservation.details || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
              </div>

              {/* เหตุผลการปฏิเสธ (ถ้ามี) */}
              {selectedApprovalReservation.status === 'rejected' && selectedApprovalReservation.rejected_reason && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-red-700 mb-2">เหตุผลที่ปฏิเสธ</label>
                  <p className="text-sm text-red-900 p-3 bg-red-50 rounded-md border border-red-200">{selectedApprovalReservation.rejected_reason}</p>
                </div>
              )}

              {/* ดำเนินการโดย */}
              {selectedApprovalReservation.approved_by && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">ดำเนินการโดย</label>
                  <p className="text-sm text-gray-900">{selectedApprovalReservation.approved_by}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={handleCloseApprovalModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <span>←</span>
                  <span>ปิด</span>
                </button>
                {selectedApprovalReservation.approved_by && (
                  <div className="text-sm text-gray-500">
                    {(selectedApprovalReservation.status === 'approved' || selectedApprovalReservation.status === 'อนุมัติแล้ว') ? 'อนุมัติโดย' : 'ปฏิเสธโดย'} {selectedApprovalReservation.approved_by}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}