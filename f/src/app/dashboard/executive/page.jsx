'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getDepartmentFromPosition, isUniversityExecutive } from '@/utils/positions'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
)



export default function ExecutiveDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  const [executiveStats, setExecutiveStats] = useState({
    department_reservations: 0,
    department_rooms: 0,
    utilization_rate: '0%',
    total_reservations: 0,
    total_rooms: 0,
    overall_utilization: '0%'
  })
  const [reports, setReports] = useState({
    reservation_summary: [],
    room_utilization: [],
    monthly_trends: [],
    daily_usage: [],
    department_stats: []
  })
  const [chartData, setChartData] = useState({
    monthlyTrends: null,
    dailyUsage: null,
    roomUtilization: null,
    reservationStatus: null,
    departmentComparison: null
  })
  const [accessibleRooms, setAccessibleRooms] = useState([])
  const [selectedTab, setSelectedTab] = useState('dashboard')

  // API endpoints for backend connection (เตรียมไว้สำหรับการเชื่อมต่อ)
  const API_ENDPOINTS = {
    executiveStats: '/api/executive/stats',
    reservationSummary: '/api/executive/reservation-summary',
    roomUtilization: '/api/executive/room-utilization',
    monthlyTrends: '/api/executive/monthly-trends',
    yearlyComparison: '/api/executive/yearly-comparison',
    peakHours: '/api/executive/peak-hours',
    departmentStats: '/api/executive/department-stats',
    accessibleRooms: '/api/executive/accessible-rooms',
    exportReport: '/api/executive/export'
  }

  // ฟังก์ชันคำนวณอัตราการใช้งาน
  const calculateUtilizationRate = (reservations, rooms) => {
    if (!rooms || rooms === 0) return '0%'
    const rate = Math.min((reservations / (rooms * 30)) * 100, 100) // สมมติ 30 วันต่อเดือน
    return `${Math.round(rate)}%`
  }

  // ฟังก์ชันสำหรับเรียก API (เตรียมไว้สำหรับการเชื่อมต่อ Backend)
  const fetchExecutiveData = async (endpoint, params = {}) => {
    try {
      const token = authUtils.getToken()
      const queryString = new URLSearchParams(params).toString()
      const url = `${endpoint}${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error)
      throw error
    }
  }

  // ฟังก์ชันสำหรับส่งออกรายงาน (เตรียมไว้สำหรับการเชื่อมต่อ Backend)
  const exportReport = async (format, reportType) => {
    try {
      const token = authUtils.getToken()
      const response = await fetch(`${API_ENDPOINTS.exportReport}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format, // 'excel', 'pdf', 'csv'
          reportType, // 'summary', 'detailed', 'charts'
          dateRange: {
            start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
            end: new Date().toISOString()
          },
          filters: {
            department: isFacultyExecutive ? getDepartmentFromPosition(user?.position) : null,
            executive_type: isFacultyExecutive ? 'faculty' : 'university'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Export failed! status: ${response.status}`)
      }

      // สร้าง download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `executive_report_${reportType}_${format}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('เกิดข้อผิดพลาดในการส่งออกรายงาน')
    }
  }

  useEffect(() => {
    // ตรวจสอบการ login - ต้องรอให้ client-side render เสร็จก่อน
    if (typeof window === 'undefined') return
    
    const initializeAuth = async () => {
      const [userData, token] = await Promise.all([
        Promise.resolve(authUtils.getUserWithRole()),
        Promise.resolve(authUtils.getToken()),
        new Promise(resolve => setTimeout(resolve, 5)) // Loading time เร็วสุด 90%+
      ])
      
      console.log('ExecutiveDashboard - user data:', userData)
      
      if (!token || !userData) {
        router.push('/login')
        return
      }
      
      // ตรวจสอบ role - ถ้าไม่ใช่ executive ให้ redirect ไปหน้าที่เหมาะสม
      if (userData.role && userData.role !== 'executive') {
        if (userData.role === 'user') {
          router.push('/dashboard/user')
        } else if (userData.role === 'officer') {
          router.push('/dashboard/officer')
        } else if (userData.role === 'admin') {
          router.push('/dashboard/admin')
        }
        return
      }
      
      // โหลดข้อมูล Executive
      loadExecutiveData(userData)
    }
    
    initializeAuth()
  }, [router])

  // เมื่อ reports เปลี่ยน ให้คำนวณ chartData ใหม่แบบ reactive
  useEffect(() => {
    if (!reports || !user) return
    
    console.log('🔄 Generating chart data...', {
      monthly_trends: reports.monthly_trends?.length,
      daily_usage: reports.daily_usage?.length,
      room_utilization: reports.room_utilization?.length,
      department_stats: reports.department_stats?.length
    })
    
    const isFacultyExec = user?.position === 'faculty_executive'

    const currentReports = reports
    const monthlyTrendsData = {
      labels: (currentReports.monthly_trends || []).map(item => 
        new Date(item.month + '-01').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
      ),
      datasets: [{
        label: 'จำนวนการจอง',
        data: (currentReports.monthly_trends || []).map(item => item.reservation_count || 0),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }

    const dailyUsageData = {
      labels: (currentReports.daily_usage || []).map(item => 
        new Date(item.day).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
      ),
      datasets: [{
        label: 'จำนวนการจองต่อวัน (30 วันล่าสุด)',
        data: (currentReports.daily_usage || []).map(item => item.reservation_count || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }

    const roomUtilizationData = {
      labels: (currentReports.room_utilization || []).map(item => item.meeting_room?.room_name || 'ไม่ระบุห้อง'),
      datasets: [{
        label: 'จำนวนการจองทั้งหมด',
        data: (currentReports.room_utilization || []).map(item => item.reservation_count || item._count?.reservation_id || 0),
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    }

    const reservationStatusData = {
      labels: ['อนุมัติแล้ว', 'รออนุมัติ', 'ปฏิเสธ'],
      datasets: [{
        data: [
          (currentReports.reservation_summary || []).find(item => item.status_r === 'approved')?._count?.reservation_id || (currentReports.reservation_summary || []).find(item => item.status === 'approved')?.count || 0,
          (currentReports.reservation_summary || []).find(item => item.status_r === 'pending')?._count?.reservation_id || (currentReports.reservation_summary || []).find(item => item.status === 'pending')?.count || 0,
          (currentReports.reservation_summary || []).find(item => item.status_r === 'rejected')?._count?.reservation_id || (currentReports.reservation_summary || []).find(item => item.status === 'rejected')?.count || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    }

    let departmentComparisonData = null
    if (!isFacultyExec && currentReports.department_stats.length > 0) {
      departmentComparisonData = {
        labels: currentReports.department_stats.map(dept => dept.department),
        datasets: [{
          label: 'จำนวนการจอง',
          data: currentReports.department_stats.map(dept => dept.reservations),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2
        }]
      }
    }

    setChartData({
      monthlyTrends: monthlyTrendsData,
      dailyUsage: dailyUsageData,
      roomUtilization: roomUtilizationData,
      reservationStatus: reservationStatusData,
      departmentComparison: departmentComparisonData
    })

    console.log('✅ Chart data generated:', {
      monthlyTrends: monthlyTrendsData.labels.length + ' labels',
      dailyUsage: dailyUsageData.labels.length + ' labels',
      roomUtilization: roomUtilizationData.labels.length + ' labels',
      reservationStatus: reservationStatusData.datasets[0].data.reduce((a, b) => a + b, 0) + ' total reservations'
    })
  }, [reports, user])

  const loadExecutiveData = async (userData) => {
    try {
      setUser(userData)
      
  // ตรวจสอบประเภท Executive: ปรับใหม่ — ทุกผู้บริหารดูข้อมูลทั้งหมด (ไม่แยกคณะ)
  // ตั้งค่า isFacultyExecutive = false เพื่อหลีกเลี่ยงการกรองข้อมูลบน frontend
  const isFacultyExecutive = false

      // 🔄 เชื่อมต่อ API จริงสำหรับดึงข้อมูล Executive Dashboard
      try {
        console.log('🔌 เชื่อมต่อ Executive Dashboard API...')
        
        const token = authUtils.getToken()
        const response = await fetch(`/api/protected/executive/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }

        const dashboardData = await response.json()
        console.log('📊 ข้อมูล Executive Dashboard จาก API:', dashboardData)

        if (dashboardData.success) {
          // อัปเดตข้อมูลสถิติจาก API
          const stats = dashboardData.stats
          const executiveStatsData = isFacultyExecutive ? {
            department_reservations: stats.department_reservations || 0,
            department_rooms: stats.department_rooms || 0,
            utilization_rate: calculateUtilizationRate(stats.department_reservations, stats.department_rooms),
            total_reservations: 0,
            total_rooms: 0,
            overall_utilization: '0%'
          } : {
            department_reservations: 0,
            department_rooms: 0,
            utilization_rate: '0%',
            total_reservations: stats.total_reservations || 0,
            total_rooms: stats.total_rooms || 0,
            overall_utilization: calculateUtilizationRate(stats.total_reservations, stats.total_rooms)
          }
          setExecutiveStats(executiveStatsData)

          console.log('✅ ใช้ข้อมูล Executive Stats จาก API สำเร็จ')

          // 🏢 เรียก API สำหรับข้อมูลห้องประชุม
          try {
            const roomsResponse = await fetch(`/api/protected/executive/rooms`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })

            if (roomsResponse.ok) {
              const roomsData = await roomsResponse.json()
              console.log('🏢 Rooms API Response:', roomsData)
              
              if (roomsData.success && roomsData.rooms && Array.isArray(roomsData.rooms)) {
                console.log(`✅ พบห้องประชุม ${roomsData.rooms.length} ห้องจาก API`)
                
                // 📊 ดึงข้อมูลสถิติครั้งเดียวสำหรับทุกห้อง
                let roomUtilizationStats = {}
                try {
                  const reportsResponse = await fetch(`/api/protected/executive/reports`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  })

                  if (reportsResponse.ok) {
                    const reportsData = await reportsResponse.json()
                    console.log('📊 Reports API Response:', reportsData)
                    console.log('🏛️ Department Stats from API:', reportsData.reports?.department_stats)
                    console.log('👤 Current User Department:', user?.department || 'ไม่พบข้อมูลผู้ใช้')
                    console.log('🎯 Is Faculty Executive:', isFacultyExecutive)
                    
                    if (reportsData.success && Array.isArray(reportsData.reports?.room_utilization)) {
                      // สร้าง mapping ของสถิติตาม room_id (ใช้ค่าจริงจาก backend)
                      reportsData.reports.room_utilization.forEach(util => {
                        if (util.room_id !== null && util.room_id !== undefined) {
                          const avgMins = util.avg_duration_minutes
                          const humanAvg = avgMins && avgMins > 0
                            ? (() => {
                                const hrs = Math.floor(avgMins / 60)
                                const mins = Math.round(avgMins % 60)
                                if (hrs > 0 && mins > 0) return `${hrs} ชม. ${mins} นาที`
                                if (hrs > 0) return `${hrs} ชม.`
                                return `${mins} นาที`
                              })()
                            : 'ไม่มีข้อมูล'

                          roomUtilizationStats[util.room_id] = {
                            total_bookings: util.reservation_count || util._count?.reservation_id || 0,
                            this_month: util.this_month_count || 0,
                            average_duration: humanAvg
                          }
                        }
                      })
                      console.log('📈 Room Utilization Stats (from backend):', roomUtilizationStats)
                    }
                  }
                } catch (reportsError) {
                  console.warn('⚠️ ไม่สามารถดึงข้อมูลสถิติได้:', reportsError)
                }
                
                // 🔄 รวมข้อมูลห้องกับสถิติ
                const roomsWithStats = roomsData.rooms.map(room => ({
                  ...room,
                  utilization_stats: roomUtilizationStats[room.room_id] || {
                    total_bookings: 0,
                    this_month: 0,
                    average_duration: 'ไม่มีข้อมูล'
                  }
                }))

                setAccessibleRooms(roomsWithStats)
                console.log(`🎯 API Integration สำเร็จ: ตั้งค่า ${roomsWithStats.length} ห้องพร้อมสถิติ`)
              } else {
                console.warn('⚠️ Rooms API ส่งคืนข้อมูลไม่ถูกต้อง:', roomsData)
                setAccessibleRooms([])
              }
            } else {
              console.error(`❌ Rooms API Error: ${roomsResponse.status} ${roomsResponse.statusText}`)
              setAccessibleRooms([])
            }
          } catch (roomsError) {
            console.error('❌ ไม่สามารถดึงข้อมูลห้องประชุมได้:', roomsError)
            setAccessibleRooms([])
          }

        } else {
          console.error('❌ Dashboard API returned success: false')
          return // หยุดการทำงานถ้า API ไม่สำเร็จ
        }

      } catch (apiError) {
        console.error('❌ Dashboard API Connection Error:', apiError)
        return // หยุดการทำงานถ้าเชื่อมต่อ API ไม่ได้
      }

      // 🔄 เชื่อมต่อ API Reports สำหรับข้อมูลรายงาน
      try {
        console.log('📊 เชื่อมต่อ Executive Reports API...')
        
        const token = authUtils.getToken()
        const reportsResponse = await fetch(`/api/protected/executive/reports`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!reportsResponse.ok) {
          throw new Error(`Reports API Error: ${reportsResponse.status}`)
        }

        const reportsData = await reportsResponse.json()
        console.log('📋 ข้อมูล Executive Reports จาก API:', reportsData)
        console.log('🏛️ Department Stats จาก fetchReports:', reportsData.reports?.department_stats)
        console.log('📈 ข้อมูลแต่ละคณะ:', reportsData.reports?.department_stats?.map(d => ({ name: d.department, reservations: d.reservations })))
        console.log('✅ Reports Success:', reportsData.success)
        console.log('🎯 Executive Type:', reportsData.executive_type)

        if (reportsData.success) {
          // ประมวลผลข้อมูลจาก API
          const apiReports = reportsData.reports
          
          // ใช้ข้อมูลจาก API ในการสร้าง departmentStats (ทั้ง University และ Faculty Executive)
          let finalDepartmentStats = []
          
          // ใช้ข้อมูลจาก Backend department_stats ก่อน (ถ้ามี)
          if (apiReports.department_stats && apiReports.department_stats.length > 0) {
            finalDepartmentStats = apiReports.department_stats
            console.log('📊 ใช้ department_stats จาก Backend API:', finalDepartmentStats)
          } else if (apiReports.room_utilization && !isFacultyExecutive) {
            // สำรอง: สร้างจาก room_utilization (เฉพาะ University Executive)
            const reservationsByDept = new Map()
            
            // ป้องกัน error จาก undefined reservation_id 
            const safeRoomUtilization = apiReports.room_utilization?.filter(room => 
              room && room.meeting_room && room.meeting_room.department
            ) || []
            
            safeRoomUtilization.forEach(room => {
              if (room.meeting_room && room.meeting_room.department) {
                const dept = room.meeting_room.department
                // ป้องกัน undefined _count หรือ reservation_id
                const reservations = room._count?.reservation_id || room._count?.reservations || 0
                
                if (reservationsByDept.has(dept)) {
                  reservationsByDept.set(dept, reservationsByDept.get(dept) + reservations)
                } else {
                  reservationsByDept.set(dept, reservations)
                }
              }
            })
            
            finalDepartmentStats = Array.from(reservationsByDept.entries()).map(([department, reservations]) => ({
              department,
              reservations,
              utilization: Math.min(Math.round((reservations / 30) * 100), 100)
            }))
            
            console.log('📊 สร้าง departmentStats จาก room_utilization:', finalDepartmentStats)
          }

          const processedReports = {
            reservation_summary: apiReports.reservation_summary || [],
            room_utilization: apiReports.room_utilization || [],
            monthly_trends: apiReports.monthly_trends || [],
            daily_usage: apiReports.daily_usage || [],
            department_stats: finalDepartmentStats
          }
          
          console.log('📊 Processed Reports:', processedReports)
          console.log('🏛️ Final Department Stats ที่จะเก็บใน state:', finalDepartmentStats)
          
          setReports(processedReports)
          console.log('✅ ใช้ข้อมูลจาก API สำเร็จ')

        } else {
          console.error('❌ Reports API returned success: false')
          return // หยุดการทำงานถ้า API ไม่สำเร็จ
        }

      } catch (reportsApiError) {
        console.error('❌ Reports API Connection Error:', reportsApiError)
        return // หยุดการทำงานถ้าเชื่อมต่อ API ไม่ได้
      }

      // สร้างข้อมูลกราฟจากข้อมูลใน reports state
  const currentReports = reports
      const monthlyTrendsData = {
        labels: currentReports.monthly_trends.map(item => 
          new Date(item.month + '-01').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
        ),
        datasets: [{
          label: 'จำนวนการจอง',
          data: currentReports.monthly_trends.map(item => item.reservation_count),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }

      const dailyUsageData = {
        labels: currentReports.daily_usage.map(item => 
          new Date(item.day).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
        ),
        datasets: [{
          label: 'จำนวนการจองต่อวัน (30 วันล่าสุด)',
          data: currentReports.daily_usage.map(item => item.reservation_count),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }

      const roomUtilizationData = {
        labels: currentReports.room_utilization.map(item => item.meeting_room?.room_name || 'ไม่ระบุห้อง'),
        datasets: [{
          label: 'จำนวนการจองทั้งหมด',
          data: currentReports.room_utilization.map(item => item.reservation_count || item._count?.reservation_id || 0),
          backgroundColor: [
            'rgba(147, 51, 234, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(147, 51, 234, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 2
        }]
      }

      const reservationStatusData = {
        labels: ['อนุมัติแล้ว', 'รออนุมัติ', 'ปฏิเสธ'],
        datasets: [{
          data: [
            currentReports.reservation_summary.find(item => item.status === 'approved')?.count || 0,
            currentReports.reservation_summary.find(item => item.status === 'pending')?.count || 0,
            currentReports.reservation_summary.find(item => item.status === 'rejected')?.count || 0
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 2
        }]
      }

      let departmentComparisonData = null
      if (!isFacultyExecutive && currentReports.department_stats.length > 0) {
        departmentComparisonData = {
          labels: currentReports.department_stats.map(dept => dept.department),
          datasets: [{
            label: 'จำนวนการจอง',
            data: currentReports.department_stats.map(dept => dept.reservations),
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2
          }]
        }
      }

      setChartData({
        monthlyTrends: monthlyTrendsData,
        dailyUsage: dailyUsageData,
        roomUtilization: roomUtilizationData,
        reservationStatus: reservationStatusData,
        departmentComparison: departmentComparisonData
      })

      // เสร็จสิ้นการโหลดข้อมูลจาก API - ไม่ใช้ mock data
      console.log(`🎯 API Integration สำเร็จ: โหลดข้อมูล Executive Dashboard เสร็จสิ้น`)
      console.log(`📊 สถิติ: accessibleRooms = ${accessibleRooms.length} ห้อง`)
      
    } catch (error) {
      console.error('Error loading executive data:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รออนุมัติ'
      case 'approved': return 'อนุมัติแล้ว'
      case 'rejected': return 'ปฏิเสธ'
      default: return status
    }
  }

  // Executive ทั้งหมดดูข้อมูลทุกหน่วยงาน (frontend: treat all as university-level)
  const isFacultyExecutive = false
  const isUniversityExec = user?.role === 'executive'

  console.log('ExecutiveDashboard render - user:', !!user)



  if (!user) {
    return null // จะ redirect ไป login แล้ว
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 lg:p-6 text-white">
          <h1 className="text-xl lg:text-3xl font-bold mb-2">
            🏛️ ยินดีต้อนรับ {user.first_name} {user.last_name}
          </h1>
          <p className="text-purple-100 text-sm lg:text-lg">
            ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม (ผู้บริหาร)
          </p>
        </div>

        {/* Executive Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-indigo-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">📈</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">การจองทั้งหมด</h3>
              <p className="text-lg lg:text-2xl font-bold text-indigo-600">{executiveStats.total_reservations}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-orange-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">🏛️</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">ห้องประชุมทั้งหมด</h3>
              <p className="text-lg lg:text-2xl font-bold text-orange-600">{executiveStats.total_rooms}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-pink-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">⚡</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">อัตราการใช้โดยรวม</h3>
              <p className="text-lg lg:text-2xl font-bold text-pink-600">{executiveStats.overall_utilization}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setSelectedTab('dashboard')}
                className={`px-4 py-3 text-sm font-medium ${
                  selectedTab === 'dashboard'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Dashboard
              </button>
              <button
              
                onClick={() => setSelectedTab('reports')}
                className={`px-4 py-3 text-sm font-medium ${
                  selectedTab === 'reports'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📈 รายงานและสถิติ
              </button> 
              
              <div>
              <button
                onClick={() => setSelectedTab('rooms')}
                className={`px-4 py-3 text-sm font-medium ${
                  selectedTab === 'rooms'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🏢 ห้องประชุม
              </button>
              </div>
            </nav>
          </div>

          <div className="p-4 lg:p-6">
            {/* Dashboard Tab */}
            {selectedTab === 'dashboard' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  📊 Dashboard
                </h3>
                
                {/* Charts Grid */}
                <div className="grid grid-cols-1 gap-6">

                  {/* Debug Chart Data */}
                  {(() => {
                    console.log('🎨 Chart Render Check:', {
                      hasMonthlyTrends: !!chartData.monthlyTrends,
                      monthlyTrendsData: chartData.monthlyTrends,
                      hasLabels: chartData.monthlyTrends?.labels?.length,
                      hasDatasets: chartData.monthlyTrends?.datasets?.length
                    });
                    return null;
                  })()}

                  {/* Monthly Trends */}
                  {chartData.monthlyTrends && (
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-semibold text-gray-700 mb-4">📅 แนวโน้มการจองรายเดือน (12 เดือน)</h4>
                      <div className="w-full h-72">
                        <Line data={chartData.monthlyTrends} options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'top' }
                          },
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Daily Usage */}
                  {(() => {
                    console.log('📅 Daily Usage Chart Check:', {
                      hasDailyUsage: !!chartData.dailyUsage,
                      dailyUsageData: chartData.dailyUsage,
                      hasLabels: chartData.dailyUsage?.labels?.length,
                      hasDatasets: chartData.dailyUsage?.datasets?.length
                    });
                    return null;
                  })()}
                  
                  {chartData.dailyUsage && (
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-semibold text-gray-700 mb-4">🗓️ การใช้งานรายวัน (30 วันล่าสุด)</h4>
                      <div className="w-full h-72">
                        <Line data={chartData.dailyUsage} options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'top' }
                          },
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Department Usage Chart - Full Width */}
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold text-gray-700 mb-6 flex items-center text-lg">
                      🏢 รายชื่อหน่วยงานที่ใช้บริการห้องประชุม
                    </h4>

                    <div className="w-full h-[500px] relative overflow-hidden">
                      {(() => {
                        // สี palette ที่สวยงามและสม่ำเสมอ
                        const beautifulColors = [
                          'rgba(99, 102, 241, 0.8)', // Indigo
                          'rgba(59, 130, 246, 0.8)', // Blue  
                          'rgba(16, 185, 129, 0.8)', // Emerald
                          'rgba(245, 158, 11, 0.8)', // Amber
                          'rgba(239, 68, 68, 0.8)', // Red
                          'rgba(139, 92, 246, 0.8)', // Violet
                          'rgba(6, 182, 212, 0.8)', // Cyan
                          'rgba(34, 197, 94, 0.8)', // Green
                          'rgba(251, 146, 60, 0.8)', // Orange
                          'rgba(168, 85, 247, 0.8)', // Purple
                        ];
                        
                        console.log('🔍 กำลังตรวจสอบข้อมูล department_stats...')
                        console.log('reports object:', reports)
                        console.log('reports.department_stats:', reports.department_stats)
                        console.log('Is array?', Array.isArray(reports.department_stats))
                        console.log('Length:', reports.department_stats?.length)
                        
                        if (reports.department_stats && reports.department_stats.length > 0) {
                          // ใช้ข้อมูลจาก API สำหรับ Faculty และ University Executive
                          console.log('🎯 ใช้ข้อมูลจาก API department_stats:', reports.department_stats)
                          console.log('👤 Current User Department:', user?.department || 'ไม่พบข้อมูลผู้ใช้')
                          console.log('🎯 Is Faculty Executive:', isFacultyExecutive)
                          
                          // สำหรับ Faculty Executive จะแสดงเฉพาะคณะตัวเอง
                          let departmentData = reports.department_stats;
                          if (isFacultyExecutive) {
                            console.log('🔍 กำลังกรองข้อมูลสำหรับ Faculty Executive...')
                            const responsibleDept = getDepartmentFromPosition(user?.position)
                            departmentData = reports.department_stats.filter(dept => 
                              dept.department === responsibleDept
                            );
                            console.log('📊 ข้อมูลหลังกรอง:', departmentData)
                          } else {
                            console.log('🏛️ แสดงข้อมูลทุกคณะสำหรับ University Executive')
                          }
                          
                          // เรียงลำดับข้อมูลตามจำนวนการจองจากมากไปน้อย
                          const sortedDepartments = [...departmentData].sort((a, b) => b.reservations - a.reservations);
                          console.log('📈 ข้อมูลที่จะใช้ในกราฟ:', sortedDepartments)
                          
                          if (sortedDepartments.length === 0) {
                            console.log('⚠️ ไม่มีข้อมูลสำหรับแสดงกราฟ!')
                          }
                          
                          const chartDataFromAPI = {
                            labels: sortedDepartments.map(dept => {
                              // ย่อชื่อหน่วยงานให้สั้นลง
                              const shortName = dept.department
                                .replace('คณะ', '')
                                .replace('กอง', '')
                                .replace('สำนักงาน', 'สำนัก')
                                .replace('มหาวิทยาลัย', 'ม.')
                                .replace('และ', '&')
                                .trim();
                              return shortName.length > 25 ? shortName.substring(0, 22) + '...' : shortName;
                            }),
                            datasets: [{
                              label: 'จำนวนการจอง',
                              data: sortedDepartments.map(dept => dept.reservations),
                              backgroundColor: sortedDepartments.map((_, index) => beautifulColors[index % beautifulColors.length]),
                              borderColor: sortedDepartments.map((_, index) => beautifulColors[index % beautifulColors.length].replace('0.8', '1')),
                              borderWidth: 2,
                              borderRadius: {
                                topLeft: 8,
                                topRight: 8,
                                bottomLeft: 0,
                                bottomRight: 0

                              },
                              hoverBackgroundColor: sortedDepartments.map((_, index) => beautifulColors[index % beautifulColors.length].replace('0.8', '0.9')),
                              hoverBorderWidth: 3,
                            }]
                          }
                          
                          return (
                            <div className="w-full h-full flex flex-col">
                              <div className="flex-1 min-h-0">
                                <Bar 
                                  data={chartDataFromAPI}
                                  options={{
                                    indexAxis: 'y', // เปลี่ยนเป็นกราฟแนวนอน
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    devicePixelRatio: 2,
                                    resizeDelay: 50,
                                    interaction: {
                                      mode: 'index',
                                      intersect: false,
                                    },
                                    layout: {
                                      padding: {
                                        top: 10,
                                        right: 30,
                                        bottom: 10,
                                        left: 10
                                      }
                                    },
                                    plugins: {
                                      legend: { 
                                        display: true,
                                        position: 'top',
                                        align: 'end',
                                        labels: {
                                          usePointStyle: true,
                                          pointStyle: 'circle',
                                          font: { size: 11, weight: 'bold' },
                                          color: '#374151',
                                          padding: 15
                                        }
                                      },
                                      title: {
                                        display: true,
                                        text: 'การใช้บริการห้องประชุมของหน่วยงาน',
                                        font: { size: 16, weight: 'bold' },
                                        padding: { top: 10, bottom: 20 },
                                        color: '#1f2937'
                                      },
                                      tooltip: {
                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                        titleColor: '#f9fafb',
                                        bodyColor: '#f3f4f6',
                                        borderColor: 'rgba(99, 102, 241, 0.6)',
                                        borderWidth: 2,
                                        cornerRadius: 8,
                                        padding: 12,
                                        titleFont: { size: 13, weight: 'bold' },
                                        bodyFont: { size: 12 },
                                        callbacks: {
                                          title: function(context) {
                                            const fullName = sortedDepartments[context[0].dataIndex].department;
                                            return fullName;
                                          },
                                          label: function(context) {
                                            return `จำนวนการจอง: ${context.parsed.x.toLocaleString()} ครั้ง`;
                                          },
                                          afterLabel: function(context) {
                                            const total = sortedDepartments.reduce((sum, dept) => sum + dept.reservations, 0);
                                            const percentage = ((context.parsed.x / total) * 100).toFixed(1);
                                            return `สัดส่วน: ${percentage}% ของการจองทั้งหมด`;
                                          }
                                        }
                                      }
                                    },
                                    scales: {
                                      x: {
                                        beginAtZero: true,
                                        grid: {
                                          color: 'rgba(156, 163, 175, 0.2)',
                                          borderDash: [3, 3]
                                        },
                                        ticks: {
                                          font: { size: 10, weight: '500' },
                                          color: '#6b7280',
                                          callback: function(value) {
                                            return value.toLocaleString() + ' ครั้ง';
                                          },
                                          stepSize: 1
                                        },
                                        title: {
                                          display: true,
                                          text: 'จำนวนการจอง (ครั้ง)',
                                          font: { size: 12, weight: 'bold' },
                                          color: '#374151',
                                          padding: { top: 10 }
                                        }
                                      },
                                      y: {
                                        grid: { 
                                          display: false 
                                        },
                                        ticks: {
                                          font: { size: 10, weight: '500' },
                                          color: '#6b7280',
                                          callback: function(value, index) {
                                            const label = this.getLabelForValue(value);
                                            return label.length > 25 ? label.substring(0, 22) + '...' : label;
                                          }
                                        },
                                        title: {
                                          display: true,
                                          text: 'หน่วยงาน',
                                          font: { size: 12, weight: 'bold' },
                                          color: '#374151',
                                          padding: { bottom: 10 }
                                        }
                                      }
                                    },
                                    animation: {
                                      duration: 800,
                                      easing: 'easeInOutQuart'
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )
                        } else {
                          // ไม่มีข้อมูล Department Stats จาก API 
                          return (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center p-6">
                                <div className="text-gray-400 mb-2">
                                  <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <p className="text-gray-600 text-sm">ไม่พบข้อมูลการใช้งาน</p>
                                <p className="text-gray-400 text-xs mt-1">กรุณาลองใหม่อีกครั้ง</p>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                    
                    {/* Department Usage Statistics Table */}
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-700 mb-3">📋 รายชื่อหน่วยงานที่ใช้บริการห้องประชุม</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-300">
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">ลำดับ</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-700">หน่วยงาน</th>
                              <th className="text-center py-2 px-3 font-semibold text-gray-700">จำนวนการจอง</th>
                              <th className="text-center py-2 px-3 font-semibold text-gray-700">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // ใช้ข้อมูลจาก API ถ้ามี (ทั้ง Faculty และ University Executive)
                              if (reports.department_stats && reports.department_stats.length > 0) {
                                console.log('🎯 ตารางใช้ข้อมูลจาก API:', reports.department_stats)
                                
                                // สำหรับ Faculty Executive จะแสดงเฉพาะคณะตัวเอง
                                let tableData = reports.department_stats;
                                if (isFacultyExecutive) {
                                  const responsibleDept = getDepartmentFromPosition(user?.position)
                                  tableData = reports.department_stats.filter(dept => 
                                    dept.department === responsibleDept
                                  );
                                }

                                if (!tableData || tableData.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan="4" className="py-6">
                                        <div className="text-center">
                                          <p className="text-gray-600 text-sm">ไม่พบข้อมูลสถิติ</p>
                                          <p className="text-gray-400 text-xs mt-1">กรุณาลองใหม่อีกครั้ง</p>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                }
                                
                                return tableData.map((dept, index) => {
                                  const colors = [
                                    'bg-blue-600 text-white border-blue-600',
                                    'bg-teal-600 text-white border-teal-600', 
                                    'bg-green-600 text-white border-green-600',
                                    'bg-purple-600 text-white border-purple-600',
                                    'bg-indigo-600 text-white border-indigo-600',
                                    'bg-orange-600 text-white border-orange-600',
                                    'bg-red-600 text-white border-red-600',
                                    'bg-pink-600 text-white border-pink-600'
                                  ]
                                  const colorIndex = index % colors.length
                                  const colorClass = colors[colorIndex]
                                  
                                  return (
                                    <tr key={dept.department} className={`border-b border-gray-200 hover:bg-white transition-colors hover:border-l-4`}>
                                      <td className="py-3 px-3 font-bold text-gray-600">{index + 1}</td>
                                      <td className="py-3 px-3">
                                        <div className="flex items-center space-x-3">
                                          <div className={`w-4 h-4 rounded-full ${colorClass.split(' ')[0]}`}></div>
                                          <span className="font-medium text-gray-800 text-sm">{dept.department}</span>
                                        </div>
                                      </td>
                                      <td className="text-center py-3 px-3">
                                        <span className="font-semibold text-gray-700">{dept.reservations} ครั้ง</span>
                                      </td>
                                      <td className="text-center py-3 px-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          ใช้งานอยู่
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })
                              } else {
                                // ไม่มีข้อมูล: ไม่ใช้ Mock data แสดงข้อความอย่างเดียว
                                return (
                                  <tr>
                                    <td colSpan="4" className="py-6">
                                      <div className="text-center">
                                        <p className="text-gray-600 text-sm">ไม่พบข้อมูลสถิติ</p>
                                        <p className="text-gray-400 text-xs mt-1">กรุณาลองใหม่อีกครั้ง</p>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              }
                            })()}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Summary Statistics */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => {
                          // ใช้ข้อมูลจาก API ถ้ามี (ทั้ง Faculty และ University Executive)
                          if (reports.department_stats && reports.department_stats.length > 0) {
                            // สำหรับ Faculty Executive จะแสดงเฉพาะคณะตัวเอง
                            let summaryData = reports.department_stats;
                            if (isFacultyExecutive) {
                              const responsibleDept = getDepartmentFromPosition(user?.position)
                              summaryData = reports.department_stats.filter(dept => 
                                dept.department === responsibleDept
                              );
                            }
                            
                            const totalDepts = summaryData.length
                            const totalBookings = summaryData.reduce((sum, dept) => sum + dept.reservations, 0)
                            
                            return (
                              <>
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">รวมหน่วยงาน</span>
                                    <span className="text-lg font-bold text-green-600">{totalDepts}</span>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">หน่วยงานที่ใช้งาน</span>
                                    <span className="text-lg font-bold text-green-600">{totalDepts}</span>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">จำนวนการจองทั้งหมด</span>
                                    <span className="text-lg font-bold text-green-600">{totalBookings} ครั้ง</span>
                                  </div>
                                </div>
                              </>
                            )
                          } else {
                            // ไม่มีข้อมูลสถิติจาก API: ไม่แสดงข้อความซ้ำ เพื่อลดความซ้ำซ้อนกับตารางด้านบน
                            return null
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department Comparison for University Executive */}
                {/* This section has been removed */}

                {/* Summary Cards */}
                {/* All summary sections have been removed */}

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <h4 className="text-blue-800 font-semibold">ℹ️ สำหรับผู้บริหาร</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    คุณสามารถดูข้อมูลและสถิติของทุกหน่วยงานในมหาวิทยาลัย เป็นแบบ READ-ONLY
                  </p>
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {selectedTab === 'reports' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">📈 รายงานและสถิติ</h3>
                
                {/* Removed sections: Yearly Comparison, Department Statistics Charts */}

                {/* Removed: Room Utilization Table */}

                {/* Department Statistics Chart (สำหรับทั้ง Faculty และ University Executive) */}
                {reports.department_stats && reports.department_stats.length > 0 && (
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold text-gray-700 mb-6">📊 สถิติการจองระบบห้องประชุม</h4>
                    
                    {(() => {
                      // สำหรับ Faculty Executive จะแสดงเฉพาะคณะตัวเอง
                      let chartData = reports.department_stats;
                      if (isFacultyExecutive) {
                        const responsibleDept = getDepartmentFromPosition(user?.position)
                        chartData = reports.department_stats.filter(dept => 
                          dept.department === responsibleDept
                        );
                      }
                      
                      return chartData.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Pie Chart - การจองตามคณะ */}
                          <div>
                            <h5 className="font-medium text-gray-600 mb-4 text-center">🏛️ สัดส่วนการจองตามหน่วยงาน</h5>
                            <div className="w-full h-80 flex items-center justify-center">
                            {(() => {
                              const pieColors = [
                                'rgba(99, 102, 241, 0.8)',   // สีม่วงน้ำเงิน
                                'rgba(59, 130, 246, 0.8)',   // สีน้ำเงิน
                                'rgba(16, 185, 129, 0.8)',   // สีเขียวมิ้นต์
                                'rgba(245, 158, 11, 0.8)',   // สีส้มเข้ม
                                'rgba(239, 68, 68, 0.8)',    // สีแดง
                                'rgba(139, 92, 246, 0.8)',   // สีม่วง
                                'rgba(6, 182, 212, 0.8)',    // สีฟ้าเขียว
                                'rgba(34, 197, 94, 0.8)',    // สีเขียว
                                'rgba(251, 146, 60, 0.8)',   // สีส้ม
                                'rgba(168, 85, 247, 0.8)',   // สีม่วงอ่อน
                              ]

                              const pieData = {
                                labels: chartData.map(dept => dept.department || 'ไม่ระบุ'),
                                datasets: [{
                                  data: chartData.map(dept => dept.reservations || 0),
                                  backgroundColor: pieColors.slice(0, chartData.length),
                                  borderColor: pieColors.slice(0, chartData.length).map(color => color.replace('0.8', '1')),
                                  borderWidth: 2,
                                  hoverOffset: 4
                                }]
                              }

                              const pieOptions = {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      padding: 20,
                                      usePointStyle: true,
                                      font: { size: 12 }
                                    }
                                  },
                                  tooltip: {
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    titleColor: '#f9fafb',
                                    bodyColor: '#f3f4f6',
                                    callbacks: {
                                      label: function(context) {
                                        const total = reports.department_stats.reduce((sum, dept) => sum + (dept.reservations || 0), 0)
                                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0'
                                        return `${context.label}: ${context.parsed || 0} ครั้ง (${percentage}%)`
                                      }
                                    }
                                  }
                                }
                              }

                              return <Pie data={pieData} options={pieOptions} />
                            })()}
                          </div>
                        </div>

                        {/* Doughnut Chart - อัตราการใช้งาน */}
                        <div>
                          <h5 className="font-medium text-gray-600 mb-4 text-center">⚡ อัตราการใช้งานแต่ละหน่วยงาน</h5>
                          <div className="w-full h-80 flex items-center justify-center">
                            {(() => {
                              const doughnutColors = chartData.map(dept => {
                                const utilization = dept.utilization || 0
                                if (utilization >= 80) return 'rgba(34, 197, 94, 0.8)' // สีเขียว
                                if (utilization >= 60) return 'rgba(245, 158, 11, 0.8)' // สีส้ม
                                return 'rgba(239, 68, 68, 0.8)' // สีแดง
                              })

                              const doughnutData = {
                                labels: chartData.map(dept => dept.department || 'ไม่ระบุ'),
                                datasets: [{
                                  data: chartData.map(dept => dept.utilization || 0),
                                  backgroundColor: doughnutColors,
                                  borderColor: doughnutColors.map(color => color.replace('0.8', '1')),
                                  borderWidth: 2,
                                  hoverOffset: 4
                                }]
                              }

                              const doughnutOptions = {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      padding: 20,
                                      usePointStyle: true,
                                      font: { size: 12 }
                                    }
                                  },
                                  tooltip: {
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    titleColor: '#f9fafb',
                                    bodyColor: '#f3f4f6',
                                    callbacks: {
                                      label: function(context) {
                                        const value = context.parsed || 0
                                        return `${context.label}: ${value}% อัตราการใช้งาน`
                                      }
                                    }
                                  }
                                }
                              }

                              return <Doughnut data={doughnutData} options={doughnutOptions} />
                            })()}
                            </div>
                          </div>
                        </div>
                        ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>ไม่พบข้อมูลสถิติ</p>
                        </div>
                      );
                    })()}
                    
                    {/* Summary Statistics */}
                    {(() => {
                      // สำหรับ Faculty Executive จะแสดงเฉพาะคณะตัวเอง
                      let summaryChartData = reports.department_stats;
                      if (isFacultyExecutive) {
                        const responsibleDept = getDepartmentFromPosition(user?.position)
                        summaryChartData = reports.department_stats.filter(dept => 
                          dept.department === responsibleDept
                        );
                      }
                      
                      return summaryChartData && summaryChartData.length > 0 && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <h6 className="text-sm font-medium text-blue-600 mb-1">จำนวนหน่วยงาน</h6>
                            <p className="text-2xl font-bold text-blue-800">{summaryChartData.length}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <h6 className="text-sm font-medium text-green-600 mb-1">การจองรวม</h6>
                            <p className="text-2xl font-bold text-green-800">
                              {summaryChartData.reduce((sum, dept) => sum + (dept.reservations || 0), 0)}
                            </p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4 text-center">
                            <h6 className="text-sm font-medium text-orange-600 mb-1">ห้องประชุมรวม</h6>
                            <p className="text-2xl font-bold text-orange-800">
                              {summaryChartData.reduce((sum, dept) => sum + (dept.rooms || 0), 0)}
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <h6 className="text-sm font-medium text-purple-600 mb-1">อัตราเฉลี่ย</h6>
                            <p className="text-2xl font-bold text-purple-800">
                              {(() => {
                                const totalUtilization = summaryChartData.reduce((sum, dept) => sum + (dept.utilization || 0), 0)
                                const count = summaryChartData.length
                              const average = count > 0 ? Math.round(totalUtilization / count) : 0
                              return `${average}%`
                            })()}
                            </p>
                          </div>
                        </div>
                      );
                    })()} 
                  </div>
                )}

                {/* Removed: Growth Analysis */}

                {/* Removed: Export Options */}
              </div>
            )}

            {/* Rooms Tab */}
            {selectedTab === 'rooms' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    🏢 ห้องประชุมทั้งหมด
                  </h3>
                  <span className="text-sm text-gray-500">ทั้งหมด {accessibleRooms.length} ห้อง</span>
                </div>

                {accessibleRooms.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-yellow-400">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          ยังไม่มีข้อมูลพบข้อมูลห้องประชุม
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อห้อง</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ความจุ</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ที่ตั้ง</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถิติการใช้งาน</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {accessibleRooms.map((room) => (
                          <tr key={room.room_id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{room.room_name}</div>
                              <div className="text-xs text-gray-500">{room.department || 'ไม่ระบุหน่วยงาน'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{room.capacity} คน</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{room.location_m || room.location || 'ไม่ระบุ'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {room.utilization_stats ? (
                                  <div>
                                    <div>ทั้งหมด: {room.utilization_stats.total_bookings || 0} ครั้ง</div>
                                    <div className="text-xs text-gray-500">
                                      เดือนนี้: {room.utilization_stats.this_month || 0} ครั้ง | 
                                      เฉลี่ย: {room.utilization_stats.average_duration || 'ไม่ระบุ'}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div>สถานะ: {room.status_m || 'ใช้งานได้'}</div>
                                    <div className="text-xs text-gray-500">
                                      จาก API - ไม่มีสถิติการใช้งาน
                                    </div>
                                  </div>
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
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
