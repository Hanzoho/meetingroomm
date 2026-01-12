'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  const [stats, setStats] = useState({
    totalUsers: 0,
    regularUsers: 0,
    officers: 0,
    executives: 0,
    admins: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [departmentStats, setDepartmentStats] = useState([])
  const [departmentStatsLoading, setDepartmentStatsLoading] = useState(false)

  useEffect(() => {
    // ตรวจสอบการ login - ต้องรอให้ client-side render เสร็จก่อน
    if (typeof window === 'undefined') return
    
    const initializeAuth = async () => {
      const [userData, token] = await Promise.all([
        Promise.resolve(authUtils.getUserWithRole()),
        Promise.resolve(authUtils.getToken()),
        new Promise(resolve => setTimeout(resolve, 5)) // Loading time เร็วสุด 90%+
      ])
      
      console.log('AdminDashboard - user data:', userData)
      
      if (!token || !userData) {
        router.push('/login')
        return
      }
      
      // ตรวจสอบ role - ถ้าไม่ใช่ admin ให้ redirect ไปหน้าที่เหมาะสม
      if (userData.role && userData.role !== 'admin') {
        if (userData.role === 'user') {
          router.push('/dashboard/user')
        } else if (userData.role === 'officer') {
          router.push('/dashboard/officer')
        } else if (userData.role === 'executive') {
          router.push('/dashboard/executive')
        }
        return
      }
      
      // ตั้งข้อมูล User
      setUser(userData)
    }
    
    initializeAuth()
  }, [router])

  // ฟังก์ชันสำหรับโหลด statistics
  const loadStats = async () => {
    console.log('🚀 [loadStats] เริ่มโหลดข้อมูล admin stats')
    setStatsLoading(true)
    
    try {
      const token = authUtils.getToken()
      console.log('🔑 [loadStats] Token:', token ? 'มี token' : 'ไม่มี token')
      
      if (!token) {
        console.log('❌ [loadStats] ไม่มี token - หยุดการโหลด')
        return
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/stats`
      console.log('🌐 [loadStats] เรียก API:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 [loadStats] Response status:', response.status)
      console.log('📡 [loadStats] Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [loadStats] API Response data:', data)
        
        if (data.success && data.stats) {
          const newStats = {
            totalUsers: data.stats.total || 0,
            regularUsers: data.stats.users || 0,
            officers: data.stats.officers || 0,
            executives: data.stats.executives || 0,
            admins: data.stats.admins || 0
          }
          console.log('📊 [loadStats] Setting stats:', newStats)
          setStats(newStats)
        } else {
          console.log('⚠️ [loadStats] API success false หรือไม่มี stats:', data)
        }
      } else {
        const errorText = await response.text()
        console.log('❌ [loadStats] Response not ok:', response.status, errorText)
      }
    } catch (error) {
      console.error('💥 [loadStats] Error loading admin stats:', error)
      console.error('💥 [loadStats] Error details:', error.message, error.stack)
      
      // ใช้ข้อมูลเริ่มต้นหากเกิดข้อผิดพลาด
      setStats({
        totalUsers: 0,
        regularUsers: 0,
        officers: 0,
        executives: 0,
        admins: 0
      })
    } finally {
      setStatsLoading(false)
      console.log('🏁 [loadStats] เสร็จสิ้นการโหลด')
    }
  }

  // ฟังก์ชันสำหรับโหลด department statistics
  const loadDepartmentStats = async () => {
    console.log('📊 [loadDepartmentStats] เริ่มโหลดข้อมูลสถิติคณะ')
    setDepartmentStatsLoading(true)
    
    try {
      const token = authUtils.getToken()
      console.log('🔑 [loadDepartmentStats] Token:', token ? 'มี token' : 'ไม่มี token')
      
      if (!token) {
        console.log('❌ [loadDepartmentStats] ไม่มี token - หยุดการโหลด')
        return
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/department-stats`
      console.log('🌐 [loadDepartmentStats] เรียก API:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 [loadDepartmentStats] Response status:', response.status)
      console.log('📡 [loadDepartmentStats] Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [loadDepartmentStats] API Response data:', data)
        
        if (data.success && data.data) {
          console.log('📊 [loadDepartmentStats] Setting department stats:', data.data)
          setDepartmentStats(data.data)
        } else {
          console.log('⚠️ [loadDepartmentStats] API success false หรือไม่มี data:', data)
        }
      } else {
        const errorText = await response.text()
        console.log('❌ [loadDepartmentStats] Response not ok:', response.status, errorText)
      }
    } catch (error) {
      console.error('💥 [loadDepartmentStats] Error loading department stats:', error)
      console.error('💥 [loadDepartmentStats] Error details:', error.message, error.stack)
      
      // ใช้ข้อมูลเริ่มต้นหากเกิดข้อผิดพลาด
      setDepartmentStats([])
    } finally {
      setDepartmentStatsLoading(false)
      console.log('🏁 [loadDepartmentStats] เสร็จสิ้นการโหลด')
    }
  }

  // โหลด stats เมื่อ user ถูกตั้งค่าแล้ว
  useEffect(() => {
    console.log('👤 [useEffect] User changed:', user ? `${user.first_name} (${user.role})` : 'null')
    
    if (user && user.role === 'admin') {
      console.log('✅ [useEffect] User is admin - calling loadStats and loadDepartmentStats')
      loadStats()
      loadDepartmentStats()
    } else {
      console.log('❌ [useEffect] User is not admin or null - skip loadStats')
    }
  }, [user])

  console.log('🎨 [AdminDashboard] Render - user:', !!user, 'statsLoading:', statsLoading)
  console.log('📊 [AdminDashboard] Current stats:', stats)



  if (!user) {
    return null // จะ redirect ไป login แล้ว
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-4 lg:p-6 text-white">
          <h1 className="text-xl lg:text-3xl font-bold mb-2">
            👑 ยินดีต้อนรับ {user.first_name} {user.last_name}
          </h1>
          <p className="text-red-100 text-sm lg:text-lg">
            ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม (ผู้ดูแลระบบ)
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {/* Card 1: ผู้ใช้ทั้งหมด */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl text-blue-500">👥</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">รวมทุกประเภทผู้ใช้</p>
          </div>

          {/* Card 2: ผู้ใช้ทั่วไป */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-green-500 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">ผู้ใช้ทั่วไป</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : stats.regularUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl text-green-500">👤</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">User ในระบบ</p>
          </div>

          {/* Card 3: เจ้าหน้าที่ */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-yellow-500 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">เจ้าหน้าที่</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : stats.officers.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl text-yellow-500">👮</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Officer ทั้งหมด</p>
          </div>

          {/* Card 4: ผู้บริหาร */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-purple-500 min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">ผู้บริหาร</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : stats.executives.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl text-purple-500">🎯</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Executive ทั้งหมด</p>
          </div>

          {/* Card 5: ผู้ดูแลระบบ */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-red-500 min-h-[120px] flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">ผู้ดูแลระบบ</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : stats.admins.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl text-red-500">👑</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Admin ทั้งหมด</p>
          </div>
        </div>

        {/* Department Statistics Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              📊 สถิติการเข้าใช้ระบบตามคณะ/หน่วยงาน
            </h3>
            <p className="text-gray-600">
              แสดงจำนวนผู้ใช้งานในแต่ละคณะ เรียงจากมากไปน้อย
            </p>
          </div>

          {departmentStatsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลดข้อมูลสถิติคณะ...</p>
              </div>
            </div>
          ) : departmentStats.length > 0 ? (
            <div className="space-y-8">
              {/* Bar Chart - Full width for better department display */}
              <div className="w-full">
                <h4 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                  📊 แผนภูมิแท่ง - จำนวนผู้ใช้ตามคณะ/หน่วยงาน
                </h4>
                <div className="bg-gray-50 rounded-lg p-4" style={{ height: `${Math.max(400, departmentStats.length * 40)}px` }}>
                <Bar
                  data={{
                    labels: departmentStats.map(dept => {
                      const name = dept.department || 'ไม่ระบุคณะ';
                      // ปรับการตัดข้อความให้เหมาะสมกับพื้นที่
                      if (departmentStats.length > 10) {
                        return name.length > 12 ? name.substring(0, 12) + '...' : name;
                      }
                      return name.length > 20 ? name.substring(0, 20) + '...' : name;
                    }),
                    datasets: [
                      {
                        label: 'ผู้ใช้ทั่วไป',
                        data: departmentStats.map(dept => dept.users),
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1
                      },
                      {
                        label: 'เจ้าหน้าที่',
                        data: departmentStats.map(dept => dept.officers),
                        backgroundColor: 'rgba(234, 179, 8, 0.8)',
                        borderColor: 'rgba(234, 179, 8, 1)',
                        borderWidth: 1
                      },
                      {
                        label: 'ผู้บริหาร',
                        data: departmentStats.map(dept => dept.executives),
                        backgroundColor: 'rgba(168, 85, 247, 0.8)',
                        borderColor: 'rgba(168, 85, 247, 1)',
                        borderWidth: 1
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          title: function(context) {
                            // แสดงชื่อคณะเต็มใน tooltip
                            const index = context[0].dataIndex;
                            return departmentStats[index]?.department || 'ไม่ระบุคณะ';
                          },
                          label: function(context) {
                            const label = context.dataset.label || '';
                            return label + ': ' + context.parsed.y + ' คน';
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: departmentStats.length > 10 ? 90 : 45,
                          minRotation: departmentStats.length > 15 ? 45 : 0,
                          font: {
                            size: departmentStats.length > 15 ? 10 : 12
                          }
                        }
                      }
                    },
                  }}
                />
                </div>
              </div>

              {/* Pie Chart */}
              <div className="w-full">
                <h4 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                  🥧 แผนภูมิวงกลม - สัดส่วนผู้ใช้ตามคณะ/หน่วยงาน
                </h4>
                
                {/* Show multiple pie charts if too many departments */}
                {departmentStats.length > 12 ? (
                  <div className="space-y-8">
                    {/* Top departments pie chart */}
                    <div className="bg-gray-50 rounded-lg p-4" style={{ height: '500px' }}>
                      <h5 className="text-lg font-medium text-gray-700 mb-4 text-center">
                        🏆 คณะ/หน่วยงานที่มีผู้ใช้มากที่สุด (Top 8)
                      </h5>
                      <div className="h-[400px]">
                      <Pie
                        data={{
                          labels: departmentStats.slice(0, 8).map(dept => {
                            const name = dept.department || 'ไม่ระบุคณะ';
                            return name.length > 15 ? name.substring(0, 15) + '...' : name;
                          }),
                          datasets: [
                            {
                              data: departmentStats.slice(0, 8).map(dept => dept.total),
                              backgroundColor: [
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(34, 197, 94, 0.8)',
                                'rgba(234, 179, 8, 0.8)',
                                'rgba(168, 85, 247, 0.8)',
                                'rgba(239, 68, 68, 0.8)',
                                'rgba(6, 182, 212, 0.8)',
                                'rgba(245, 101, 101, 0.8)',
                                'rgba(139, 92, 246, 0.8)',
                              ],
                              borderColor: [
                                'rgba(59, 130, 246, 1)',
                                'rgba(34, 197, 94, 1)',
                                'rgba(234, 179, 8, 1)',
                                'rgba(168, 85, 247, 1)',
                                'rgba(239, 68, 68, 1)',
                                'rgba(6, 182, 212, 1)',
                                'rgba(245, 101, 101, 1)',
                                'rgba(139, 92, 246, 1)',
                              ],
                              borderWidth: 2
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              align: 'center',
                              labels: {
                                boxWidth: 10,
                                padding: 8,
                                usePointStyle: true,
                                font: {
                                  size: 11
                                }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const originalLabel = departmentStats[context.dataIndex]?.department || 'ไม่ระบุคณะ';
                                  return originalLabel + ': ' + context.parsed + ' คน';
                                }
                              }
                            }
                          }
                        }}
                      />
                      </div>
                    </div>
                    
                    {/* Additional departments summary */}
                    {departmentStats.length > 8 && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-gray-700 mb-4 text-center">
                          📋 คณะ/หน่วยงานอื่นๆ ({departmentStats.length - 8} หน่วยงาน)
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {departmentStats.slice(8).map((dept, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                              <p className="text-sm font-medium text-gray-700 mb-1 truncate" title={dept.department || 'ไม่ระบุคณะ'}>
                                {dept.department || 'ไม่ระบุคณะ'}
                              </p>
                              <p className="text-2xl font-bold text-blue-600">{dept.total}</p>
                              <p className="text-xs text-gray-500">คน</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Single pie chart for smaller datasets
                  <div className="bg-gray-50 rounded-lg p-4" style={{ height: '500px' }}>
                    <div className="h-full">
                      <Pie
                        data={{
                          labels: departmentStats.map(dept => {
                            const name = dept.department || 'ไม่ระบุคณะ';
                            return name.length > 15 ? name.substring(0, 15) + '...' : name;
                          }),
                          datasets: [
                            {
                              data: departmentStats.map(dept => dept.total),
                              backgroundColor: [
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(34, 197, 94, 0.8)',
                                'rgba(234, 179, 8, 0.8)',
                                'rgba(168, 85, 247, 0.8)',
                                'rgba(239, 68, 68, 0.8)',
                                'rgba(6, 182, 212, 0.8)',
                                'rgba(245, 101, 101, 0.8)',
                                'rgba(139, 92, 246, 0.8)',
                                'rgba(34, 197, 94, 0.6)',
                                'rgba(234, 179, 8, 0.6)',
                                'rgba(168, 85, 247, 0.6)',
                                'rgba(239, 68, 68, 0.6)',
                              ],
                              borderColor: [
                                'rgba(59, 130, 246, 1)',
                                'rgba(34, 197, 94, 1)',
                                'rgba(234, 179, 8, 1)',
                                'rgba(168, 85, 247, 1)',
                                'rgba(239, 68, 68, 1)',
                                'rgba(6, 182, 212, 1)',
                                'rgba(245, 101, 101, 1)',
                                'rgba(139, 92, 246, 1)',
                                'rgba(34, 197, 94, 1)',
                                'rgba(234, 179, 8, 1)',
                                'rgba(168, 85, 247, 1)',
                                'rgba(239, 68, 68, 1)',
                              ],
                              borderWidth: 2
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              align: 'center',
                              labels: {
                                boxWidth: 10,
                                padding: 8,
                                usePointStyle: true,
                                font: {
                                  size: departmentStats.length > 8 ? 10 : 12
                                }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const originalLabel = departmentStats[context.dataIndex]?.department || 'ไม่ระบุคณะ';
                                  return originalLabel + ': ' + context.parsed + ' คน';
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="text-lg font-medium text-gray-700 mb-2">
                ไม่มีข้อมูลสถิติคณะ
              </h4>
              <p className="text-gray-600">
                ยังไม่มีข้อมูลผู้ใช้งานในระบบหรือไม่ได้ระบุคณะ
              </p>
            </div>
          )}
        </div>


      </div>
    </DashboardLayout>
  )
}
