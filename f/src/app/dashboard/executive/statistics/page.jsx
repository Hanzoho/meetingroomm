'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getDepartmentFromPosition, isUniversityExecutive } from '@/utils/positions'
import { Line, Bar } from 'react-chartjs-2'
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
  Filler
)

export default function ExecutiveStatistics() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  const [statistics, setStatistics] = useState({
    usage_stats: {},
    daily_usage: [],
    monthly_usage: []
  })
  const [chartData, setChartData] = useState({
    dailyUsage: null,
    monthlyComparison: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeAuth = async () => {
      const [userData, token] = await Promise.all([
        Promise.resolve(authUtils.getUserWithRole()),
        Promise.resolve(authUtils.getToken()),
        new Promise(resolve => setTimeout(resolve, 5))
      ])

      if (!token || !userData) {
        router.push('/login')
        return
      }

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

      loadStatisticsData(userData)
    }

    initializeAuth()
  }, [router])

  const loadStatisticsData = async (userData) => {
    try {
      setUser(userData)

      // Connect to Executive Reports API (ใช้ BASE URL จาก env)
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
          const reports = data.reports

          // Calculate statistics from reports data
          const totalBookings = reports.reservation_summary.reduce((sum, item) => sum + (item._count?.reservation_id || item.count || 0), 0)
          const approvedBookings = reports.reservation_summary.find(item => (item.status_r || item.status) === 'approved')?._count?.reservation_id || reports.reservation_summary.find(item => item.status === 'approved')?.count || 0
          const totalRooms = reports.room_utilization.length
          const utilizationRate = totalBookings > 0 ? Math.round((approvedBookings / totalBookings) * 100) : 0

          const avgMins = reports.average_duration_minutes
          const humanAvg = avgMins && avgMins > 0
            ? (() => {
                const hrs = Math.floor(avgMins / 60)
                const mins = Math.round(avgMins % 60)
                if (hrs > 0 && mins > 0) return `${hrs} ชม. ${mins} นาที`
                if (hrs > 0) return `${hrs} ชม.`
                return `${mins} นาที`
              })()
            : '0'

          setStatistics({
            usage_stats: {
              total_bookings: totalBookings,
              total_rooms: totalRooms,
              utilization_rate: utilizationRate,
              average_duration: humanAvg
            },
            daily_usage: reports.daily_usage || [],
            monthly_usage: reports.monthly_trends || []
          })

          // สร้างกราฟจากข้อมูล backend ที่กรองแล้วตามบทบาท
          const dailyUsageData = {
            labels: (reports.daily_usage || []).map(item => new Date(item.day).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })),
            datasets: [{
              label: 'จำนวนการจองต่อวัน',
              data: (reports.daily_usage || []).map(item => item.reservation_count),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2
            }]
          }

          const monthlyComparisonData = {
            labels: (reports.monthly_trends || []).map(item => new Date(item.month + '-01').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })),
            datasets: [{
              label: 'จำนวนการจอง',
              data: (reports.monthly_trends || []).map(item => item.reservation_count),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.4,
              fill: true
            }]
          }

          setChartData({ dailyUsage: dailyUsageData, monthlyComparison: monthlyComparisonData })

        } else {
          console.error('❌ Invalid API response structure')
        }
      } else {
        console.error('❌ Reports API Error:', response.status)
      }
    } catch (error) {
      console.error('❌ Error loading statistics:', error)
    }
  }


  const isFacultyExecutive = user?.position && !isUniversityExecutive(user.position)



  if (!user) {
    return null
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 lg:p-6 text-white">
          <h1 className="text-xl lg:text-3xl font-bold mb-2">
            📈 สถิติการใช้งาน
          </h1>
          <p className="text-purple-100 text-sm lg:text-lg">
            สถิติและการวิเคราะห์การใช้งานระบบจองห้องประชุม
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-purple-100 text-sm">ข้อมูลจาก</p>
              <p className="font-semibold">Reservations</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-purple-100 text-sm">โหมด</p>
              <p className="font-semibold">{isFacultyExecutive ? 'Faculty Level' : 'University Level'}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-purple-100 text-sm">ข้อมูลวันที่</p>
              <p className="font-semibold">จากการจองจริง</p>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-purple-500">
              <div className="text-center">
                <div className="text-2xl mb-1">📅</div>
                <h3 className="text-sm font-semibold text-gray-700">การจองทั้งหมด</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {statistics.usage_stats.total_bookings?.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
              <div className="text-center">
                <div className="text-2xl mb-1">🏢</div>
                <h3 className="text-sm font-semibold text-gray-700">จำนวนห้องประชุม</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {statistics.usage_stats.total_rooms} ห้อง
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-green-500">
              <div className="text-center">
                <div className="text-2xl mb-1">📊</div>
                <h3 className="text-sm font-semibold text-gray-700">อัตราการใช้งาน</h3>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.usage_stats.utilization_rate}%
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-orange-500">
              <div className="text-center">
                <div className="text-2xl mb-1">⏱️</div>
                <h3 className="text-sm font-semibold text-gray-700">ระยะเวลาเฉลี่ย</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {statistics.usage_stats.average_duration}
                </p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-4">📊 จำนวนการจอง</h4>
              <div className="h-64">
                {chartData.dailyUsage && (
                  <Bar
                    data={chartData.dailyUsage}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top',
                          labels: {
                            padding: 20
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          callbacks: {
                            title: function (context) {
                              return 'วัน' + context[0].label
                            },
                            label: function (context) {
                              return 'การจอง: ' + context.parsed.y + ' ครั้ง'
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          },
                          title: {
                            display: true,
                            text: 'จำนวนการจอง'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'วันในสัปดาห์'
                          }
                        }
                      }
                    }}
                  />
                )}
                {!chartData.dailyUsage && (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⏳</div>
                      <p>กำลังโหลดข้อมูลรายวัน...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-4">📈 การใช้งานรายเดือน</h4>
              <div className="h-64">
                {chartData.monthlyComparison && (
                  <Line
                    data={chartData.monthlyComparison}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            padding: 20
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          callbacks: {
                            title: function (context) {
                              return 'เดือน' + context[0].label
                            },
                            label: function (context) {
                              return context.dataset.label + ': ' + context.parsed.y + ' การจอง'
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            stepSize: 1
                          },
                          title: {
                            display: true,
                            text: 'จำนวนการจอง'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'เดือน'
                          }
                        }
                      }
                    }}
                  />
                )}
                {!chartData.monthlyComparison && (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">⏳</div>
                      <p>กำลังโหลดข้อมูลรายเดือน...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Section for Executive */}
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