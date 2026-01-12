'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getDepartmentFromPosition, isUniversityExecutive } from '@/utils/positions'
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2'
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
  ArcElement
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
  ArcElement
)

export default function ExecutiveReports() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState({
    reservation_summary: [],
    room_utilization: [],
    department_stats: [],
    monthly_trends: []
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const initializeAuth = async () => {
      const userData = authUtils.getUserWithRole()
      const token = authUtils.getToken()
      
      if (!token || !userData) {
        router.push('/login')
        return
      }
      
      if (userData.role !== 'executive') {
        router.push('/dashboard/user')
        return
      }
      
      loadReportsData(userData)
    }
    
    initializeAuth()
  }, [router])

  const loadReportsData = async (userData) => {
    try {
      setUser(userData)
      
      // Connect to Executive Reports API
      const token = authUtils.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/executive/reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.reports) {
          setReports({
            reservation_summary: data.reports.reservation_summary || [],
            room_utilization: data.reports.room_utilization || [],
            department_stats: data.reports.department_stats || [],
            monthly_trends: data.reports.monthly_trends || []
          })
        }
      } else {
        console.error('❌ Reports API Error:', response.status)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('❌ Error loading reports:', error)
      setLoading(false)
    }
  }

  const isFacultyExecutive = user?.position && !isUniversityExecutive(user.position)

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-700">กำลังโหลดรายงาน...</h3>
            <p className="text-gray-500 text-sm mt-1">โปรดรอสักครู่</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 รายงานและสถิติ</h1>
              <p className="text-purple-100 text-lg">
                รายงานการใช้งานระบบจองห้องประชุม
              </p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-purple-100 text-sm">ข้อมูลจาก</p>
              <p className="font-semibold">Executive Reports</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-purple-100 text-sm">โหมด</p>
              <p className="font-semibold">{isFacultyExecutive ? 'Faculty Level' : 'University Level'}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-purple-100 text-sm">อัพเดต</p>
              <p className="font-semibold">Real-time</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">การจองทั้งหมด</p>
                <p className="text-3xl font-bold text-blue-600">
                  {reports.reservation_summary.reduce((sum, item) => sum + (item._count?.reservation_id || 0), 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">รายการ</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">อนุมัติแล้ว</p>
                <p className="text-3xl font-bold text-green-600">
                  {reports.reservation_summary.find(item => item.status_r === 'approved')?._count?.reservation_id || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">รายการ</p>
              </div>
              <div className="p-4 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">รออนุมัติ</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {reports.reservation_summary.find(item => item.status_r === 'pending')?._count?.reservation_id || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">รายการ</p>
              </div>
              <div className="p-4 bg-yellow-100 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">ปฏิเสธ</p>
                <p className="text-3xl font-bold text-red-600">
                  {reports.reservation_summary.find(item => item.status_r === 'rejected')?._count?.reservation_id || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">รายการ</p>
              </div>
              <div className="p-4 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Room Utilization Chart */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-700">🏢 การใช้งานห้องประชุม</h4>
              <div className="text-sm text-gray-500">
                Top {Math.min(reports.room_utilization.length, 10)} ห้อง
              </div>
            </div>
            <div className="h-80">
              {reports.room_utilization.length > 0 ? (
                <Bar 
                  data={{
                    labels: reports.room_utilization.map(room => 
                      room.meeting_room?.room_name || `ห้อง ${room.room_id}`
                    ).slice(0, 10),
                    datasets: [{
                      label: 'จำนวนการจอง',
                      data: reports.room_utilization.map(room => room.reservation_count || 0).slice(0, 10),
                      backgroundColor: 'rgba(59, 130, 246, 0.7)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 2,
                      borderRadius: 6
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { position: 'top' },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        callbacks: {
                          afterLabel: function(context) {
                            const room = reports.room_utilization[context.dataIndex]
                            return [
                              `หน่วยงาน: ${room.meeting_room?.department || 'ไม่ระบุ'}`,
                              `จองเดือนนี้: ${room.this_month_count || 0} ครั้ง`,
                              `ระยะเวลาเฉลี่ย: ${Math.round(room.avg_duration_minutes || 0)} นาที`
                            ]
                          }
                        }
                      }
                    },
                    scales: { 
                      y: { 
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                          stepSize: 1
                        }
                      },
                      x: {
                        grid: { display: false }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-lg font-medium">ไม่มีข้อมูลการใช้งานห้อง</p>
                    <p className="text-sm">ยังไม่มีการจองห้องประชุม</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reservation Status Chart */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-700">🎯 สถานะการจอง</h4>
              <div className="text-sm text-gray-500">
                แบ่งตามสถานะ
              </div>
            </div>
            <div className="h-80">
              {reports.reservation_summary.length > 0 ? (
                <Doughnut 
                  data={{
                    labels: reports.reservation_summary.map(item => {
                      switch((item.status_r || '').toLowerCase()) {
                        case 'approved': return 'อนุมัติแล้ว'
                        case 'pending': return 'รออนุมัติ'
                        case 'rejected': return 'ปฏิเสธ'
                        case 'cancelled':
                        case 'canceled': return 'ยกเลิกการจอง'
                        default: return item.status_r || 'ไม่ระบุ'
                      }
                    }),
                    datasets: [{
                      data: reports.reservation_summary.map(item => item._count?.reservation_id || 0),
                      backgroundColor: reports.reservation_summary.map(item => {
                        switch((item.status_r || '').toLowerCase()) {
                          case 'approved': return 'rgba(34, 197, 94, 0.8)' // เขียว
                          case 'pending': return 'rgba(251, 146, 60, 0.8)' // ส้ม
                          case 'rejected': return 'rgba(239, 68, 68, 0.8)' // แดง
                          case 'cancelled':
                          case 'canceled': return 'rgba(107, 114, 128, 0.8)' // เทาสำหรับยกเลิก
                          default: return 'rgba(107, 114, 128, 0.8)' // เทา
                        }
                      }),
                      borderColor: reports.reservation_summary.map(item => {
                        switch((item.status_r || '').toLowerCase()) {
                          case 'approved': return 'rgba(34, 197, 94, 1)' // เขียว
                          case 'pending': return 'rgba(251, 146, 60, 1)' // ส้ม
                          case 'rejected': return 'rgba(239, 68, 68, 1)' // แดง
                          case 'cancelled':
                          case 'canceled': return 'rgba(107, 114, 128, 1)' // เทา
                          default: return 'rgba(107, 114, 128, 1)' // เทา
                        }
                      }),
                      borderWidth: 3
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white'
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-lg font-medium">ไม่มีข้อมูลสถานะการจอง</p>
                    <p className="text-sm">ยังไม่มีการจองในระบบ</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <h4 className="text-blue-800 font-semibold">ℹ️ สำหรับผู้บริหาร</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    คุณสามารถดูข้อมูลและสถิติของทุกหน่วยงานในมหาวิทยาลัย เป็นแบบ READ-ONLY
                  </p>
                </div>

      </div>
    </DashboardLayout>
  )
}
