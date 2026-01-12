'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'



export default function OfficerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    pending_approvals: 0,
    total_rooms: 0,
    today_reservations: 0,
    this_month_reservations: 0
  })
  const [roomsData, setRoomsData] = useState([])
  const [departmentStats, setDepartmentStats] = useState([])
  const [allDepartmentStats, setAllDepartmentStats] = useState([])
  const [allRoomsStats, setAllRoomsStats] = useState({ total_rooms: 0, rooms_detail: [], total_bookings: 0 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const initializeAuth = async () => {
      const [userData, token] = await Promise.all([
        Promise.resolve(authUtils.getUserWithRole()),
        Promise.resolve(authUtils.getToken()),
        new Promise(resolve => setTimeout(resolve, 5)) // Loading time เร็วสุด 90%+
      ])
      
      if (!token || !userData) {
        router.push('/login')
        return
      }
      
      // ตรวจสอบ role - ต้องเป็น officer
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
      
      loadOfficerData(userData)
    }
    
    initializeAuth()
  }, [router])

  const loadOfficerData = async (userData) => {
    try {
      setUser(userData)
      
      await new Promise(resolve => setTimeout(resolve, 2)) // เร็วสุด 90%+
      
      // เรียก API เพื่อดึงข้อมูลสถิติจริง
      const token = authUtils.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const apiData = await response.json()
      
      if (apiData.success) {
        // แปลงข้อมูลจาก API ให้ตรงกับรูปแบบที่ frontend ใช้
        const realStats = {
          total_rooms: apiData.stats.my_rooms_stats.total_rooms,
          this_month_reservations: apiData.stats.my_department_stats.this_month_reservations,
          pending_approvals: apiData.stats.my_department_stats.pending_approvals,
          today_reservations: apiData.stats.my_department_stats.today_reservations,
        }
        setStats(realStats)
        
        // ข้อมูลห้องประชุมจริง
        setRoomsData(apiData.stats.my_rooms_stats.rooms_detail || [])
        
        // ข้อมูลสถิติหน่วยงาน (ของห้องที่ดูแล)
        setDepartmentStats(apiData.stats.department_booking_stats.data || [])
        
        // ข้อมูลสถิติหน่วยงานทั้งหมดในระบบ
        setAllDepartmentStats(apiData.stats.all_department_booking_stats.data || [])
        
        // ข้อมูลสถิติห้องประชุมทั้งหมด
        setAllRoomsStats(apiData.stats.all_rooms_stats || { total_rooms: 0, rooms_detail: [], total_bookings: 0 })
        
        console.log('✅ Officer Stats loaded from API:', realStats)
        console.log('✅ Rooms Data:', apiData.stats.my_rooms_stats.rooms_detail)
        console.log('✅ Department Stats:', apiData.stats.department_booking_stats.data)
        console.log('✅ All Department Stats:', apiData.stats.all_department_booking_stats.data)
        console.log('✅ All Rooms Stats:', apiData.stats.all_rooms_stats)
      } else {
        console.error('❌ API returned error:', apiData.message)
        // ใช้ข้อมูลว่างถ้า API error
        const fallbackStats = {
          pending_approvals: 0,
          total_rooms: 0,
          today_reservations: 0,
          this_month_reservations: 0
        }
        setStats(fallbackStats)
        setRoomsData([])
        setDepartmentStats([])
        setAllDepartmentStats([])
        setAllRoomsStats({ total_rooms: 0, rooms_detail: [], total_bookings: 0 })
      }
    } catch (error) {
      console.error('❌ Error loading officer data:', error)
      
      // กรณีที่ API fail ให้แสดงข้อมูลว่าง
      const fallbackStats = {
        pending_approvals: 0,
        total_rooms: 0,
        today_reservations: 0,
        this_month_reservations: 0
      }
      setStats(fallbackStats)
      setRoomsData([])
      setDepartmentStats([])
      setAllDepartmentStats([])
      setAllRoomsStats({ total_rooms: 0, rooms_detail: [], total_bookings: 0 })
    }
  }



  if (!user) {
    return null
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 lg:p-6 text-white">
          <h1 className="text-xl lg:text-3xl font-bold mb-2">
            👨‍💼 ยินดีต้อนรับ {user.first_name} {user.last_name}
          </h1>
          <p className="text-blue-100 text-sm lg:text-lg">
            เจ้าหน้าที่ดูแลห้องประชุม {user.department || 'คณะวิทยาศาสตร์ฯ'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-orange-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">⏳</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">รออนุมัติ</h3>
              <p className="text-lg lg:text-2xl font-bold text-orange-600">{stats.pending_approvals}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-blue-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">🏢</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">ห้องในคณะ</h3>
              <p className="text-lg lg:text-2xl font-bold text-blue-600">{stats.total_rooms}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-green-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">📅</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">วันนี้</h3>
              <p className="text-lg lg:text-2xl font-bold text-green-600">{stats.today_reservations}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 lg:p-4 shadow-lg border-l-4 border-purple-500">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-1">📊</div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-700">เดือนนี้</h3>
              <p className="text-lg lg:text-2xl font-bold text-purple-600">{stats.this_month_reservations}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        
          <div className="p-4 lg:p-5">
            {/* Dashboard Content */}
            <div className="space-y-5">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                  {/* 1. สถิติการใช้ห้องประชุมของฉัน */}
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-xl sm:text-2xl mr-3">📊</span>
                      สถิติการใช้ห้องประชุม
                    </h2>
                    
                    {/* ข้อมูลห้องในคณะของตัวเอง */}
                    <div className="space-y-4">
                      {/* กราฟแท่งแสดงห้องแต่ละห้อง */}
                      <div className="max-h-80 overflow-y-auto pr-2 space-y-3" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E1 #F1F5F9'
                      }}>
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            width: 8px;
                          }
                          div::-webkit-scrollbar-track {
                            background: #F1F5F9;
                            border-radius: 8px;
                          }
                          div::-webkit-scrollbar-thumb {
                            background: linear-gradient(180deg, #64748B 0%, #475569 100%);
                            border-radius: 8px;
                            border: 1px solid #E2E8F0;
                          }
                          div::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(180deg, #475569 0%, #334155 100%);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                          }
                        `}</style>
                        
                        {/* ข้อมูลห้องในคณะ (ข้อมูลจริงจาก API) */}
                        {roomsData.length > 0 ? roomsData.map((room, index) => {
                          // หาค่าสูงสุดเพื่อคำนวณ percentage
                          const maxBookings = Math.max(...roomsData.map(r => r.bookings), 1)
                          const percentage = (room.bookings / maxBookings) * 100
                          
                          // สีสำหรับแต่ละห้อง
                          const getColorByIndex = (index) => {
                            const colors = [
                              'bg-gradient-to-r from-blue-500 to-blue-600',
                              'bg-gradient-to-r from-green-500 to-green-600', 
                              'bg-gradient-to-r from-purple-500 to-purple-600',
                              'bg-gradient-to-r from-orange-500 to-orange-600',
                              'bg-gradient-to-r from-red-500 to-red-600',
                              'bg-gradient-to-r from-yellow-500 to-yellow-600',
                            ]
                            return colors[index % colors.length]
                          }

                          return (
                            <div key={room.room_id} className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">{room.room_name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-gray-700">{room.bookings}</span>
                                  <span className="text-gray-500 text-xs">ครั้ง</span>
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-500 ease-out ${getColorByIndex(index)}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="text-center text-gray-500 py-8">
                            <p>ไม่พบข้อมูลห้องประชุม</p>
                          </div>
                        )}
                      </div>
                      
                      {/* สรุปยอดรวม */}
                      <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <span className="block font-medium text-gray-700">รวมการจอง</span>
                            <span className="font-bold text-lg text-blue-600">
                              {roomsData.reduce((sum, room) => sum + room.bookings, 0)} ครั้ง
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="block font-medium text-gray-700">จำนวนห้อง</span>
                            <span className="font-bold text-lg text-green-600">{stats.total_rooms} ห้อง</span>
                          </div>
                          <div className="text-center">
                            <span className="block font-medium text-gray-700">เฉลี่ยต่อห้อง</span>
                            <span className="font-bold text-lg text-purple-600">
                              {stats.total_rooms > 0 ? Math.round(roomsData.reduce((sum, room) => sum + room.bookings, 0) / stats.total_rooms) : 0} ครั้ง
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-xl sm:text-2xl mr-3">🏛️</span>
                      สถิติการจองตามหน่วยงาน
                    </h2>
                    
                    {/* ข้อมูลหน่วยงานที่มาใช้บริการห้องประชุม */}
                    <div className="space-y-4">
                      {/* รายชื่อหน่วยงานที่มาจอง */}
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E1 #F1F5F9'
                      }}>
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            width: 8px;
                          }
                          div::-webkit-scrollbar-track {
                            background: #F1F5F9;
                            border-radius: 8px;
                          }
                          div::-webkit-scrollbar-thumb {
                            background: linear-gradient(180deg, #64748B 0%, #475569 100%);
                            border-radius: 8px;
                            border: 1px solid #E2E8F0;
                          }
                          div::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(180deg, #475569 0%, #334155 100%);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                          }
                        `}</style>
                        
                        {/* ข้อมูลหน่วยงานที่มาจอง (ข้อมูลจริงจาก API) */}
                        {departmentStats.length > 0 ? departmentStats.map((dept, index) => {
                          // ไอคอนสำหรับหน่วยงานต่าง ๆ
                          const getDepartmentIcon = (department) => {
                            if (department.includes('คณะ')) return '🎓'
                            if (department.includes('กอง') || department.includes('ศูนย์')) return '🏢'
                            if (department.includes('สำนัก')) return '📚'
                            return '🏛️'
                          }

                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{getDepartmentIcon(dept.department)}</span>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">{dept.department}</div>
                                  <div className="text-xs text-gray-500">100% ของหน่วยงานที่ใช้บริการ</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-lg text-green-600">{dept.bookings}</span>
                                <span className="text-gray-500 text-xs ml-1">ครั้ง</span>
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="text-center text-gray-500 py-8">
                            <p>ไม่มีข้อมูลการจอง</p>
                          </div>
                        )}
                      </div>
                      
                      {/* สรุปยอดรวม */}
                      <div className="border-t pt-4 mt-4">
                        <div className="text-center">
                          <span className="text-gray-700 font-medium">รวมทั้งหมด: </span>
                          <span className="font-bold text-lg text-blue-600">
                            {departmentStats.reduce((sum, dept) => sum + dept.bookings, 0)} ครั้ง
                          </span>
                        </div>
                      </div>

                      {/* ข้อมูลการเปรียบเทียบและการอนุมัติ */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <span className="mr-2">📊</span>
                          การเปรียบเทียบ
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="text-center p-3 bg-white rounded-lg border">
                            <span className="block font-medium text-gray-700">📅 เดือนนี้</span>
                            <span className="font-bold text-lg text-green-600">{stats.this_month_reservations} ครั้ง</span>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border">
                            <span className="block font-medium text-gray-700">⏳ รออนุมัติ</span>
                            <span className="font-bold text-lg text-orange-600">{stats.pending_approvals} ครั้ง</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ส่วนสถิติเพิ่มเติม - แถวที่ 2 */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                  {/* 3. สถิติการใช้ห้องประชุมทั้งหมด */}
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-xl sm:text-2xl mr-3">📊</span>
                      สถิติการใช้ห้องประชุมทั้งหมด
                    </h2>
                    
                    {/* ข้อมูลห้องทั้งหมดในระบบ */}
                    <div className="space-y-4">
                      {/* กราฟแท่งแสดงห้องแต่ละห้อง */}
                      <div className="max-h-80 overflow-y-auto pr-2 space-y-3" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E1 #F1F5F9'
                      }}>
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            width: 8px;
                          }
                          div::-webkit-scrollbar-track {
                            background: #F1F5F9;
                            border-radius: 8px;
                          }
                          div::-webkit-scrollbar-thumb {
                            background: linear-gradient(180deg, #64748B 0%, #475569 100%);
                            border-radius: 8px;
                            border: 1px solid #E2E8F0;
                          }
                          div::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(180deg, #475569 0%, #334155 100%);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                          }
                        `}</style>
                        
                        {/* ข้อมูลห้องทั้งหมดในระบบ (ข้อมูลจริงจาก API) */}
                        {allRoomsStats.rooms_detail && allRoomsStats.rooms_detail.length > 0 ? allRoomsStats.rooms_detail.map((room, index) => {
                          // หาค่าสูงสุดเพื่อคำนวณ percentage
                          const maxBookings = Math.max(...allRoomsStats.rooms_detail.map(r => r.bookings), 1)
                          const percentage = (room.bookings / maxBookings) * 100
                          
                          // สีสำหรับแต่ละห้อง
                          const getColorByIndex = (index) => {
                            const colors = [
                              'bg-gradient-to-r from-blue-500 to-blue-600',
                              'bg-gradient-to-r from-green-500 to-green-600', 
                              'bg-gradient-to-r from-purple-500 to-purple-600',
                              'bg-gradient-to-r from-orange-500 to-orange-600',
                              'bg-gradient-to-r from-red-500 to-red-600',
                              'bg-gradient-to-r from-yellow-500 to-yellow-600',
                              'bg-gradient-to-r from-pink-500 to-pink-600',
                              'bg-gradient-to-r from-indigo-500 to-indigo-600',
                              'bg-gradient-to-r from-teal-500 to-teal-600',
                              'bg-gradient-to-r from-cyan-500 to-cyan-600'
                            ]
                            return colors[index % colors.length]
                          }

                          return (
                            <div key={room.room_id} className="space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">{room.room_name}</span>
                                  {room.department && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                      {room.department}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-gray-700">{room.bookings}</span>
                                  <span className="text-gray-500 text-xs">ครั้ง</span>
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-500 ease-out ${getColorByIndex(index)}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">📊</div>
                            <div>ไม่มีข้อมูลการจองห้องประชุม</div>
                          </div>
                        )}
                      </div>
                      
                      {/* สรุปยอดรวม */}
                      <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <span className="block font-medium text-gray-700">รวมการจอง</span>
                            <span className="font-bold text-lg text-blue-600">{allRoomsStats.total_bookings || 0} ครั้ง</span>
                          </div>
                          <div className="text-center">
                            <span className="block font-medium text-gray-700">จำนวนห้อง</span>
                            <span className="font-bold text-lg text-green-600">{allRoomsStats.total_rooms || 0} ห้อง</span>
                          </div>
                          <div className="text-center">
                            <span className="block font-medium text-gray-700">เฉลี่ยต่อห้อง</span>
                            <span className="font-bold text-lg text-purple-600">
                              {allRoomsStats.total_rooms > 0 
                                ? Math.round((allRoomsStats.total_bookings || 0) / allRoomsStats.total_rooms) 
                                : 0} ครั้ง
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. สถิติการจองตามคณะทั้งหมด */}
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-xl sm:text-2xl mr-3">🏛️</span>
                      สถิติการจองตามคณะทั้งหมด
                    </h2>
                    
                    {/* ข้อมูลคณะทั้งหมดในระบบ */}
                    <div className="space-y-4">
                      {/* รายชื่อคณะทั้งหมด */}
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E1 #F1F5F9'
                      }}>
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            width: 8px;
                          }
                          div::-webkit-scrollbar-track {
                            background: #F1F5F9;
                            border-radius: 8px;
                          }
                          div::-webkit-scrollbar-thumb {
                            background: linear-gradient(180deg, #64748B 0%, #475569 100%);
                            border-radius: 8px;
                            border: 1px solid #E2E8F0;
                          }
                          div::-webkit-scrollbar-thumb:hover {
                            background: linear-gradient(180deg, #475569 0%, #334155 100%);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                          }
                        `}</style>
                        
                        {/* ข้อมูลคณะทั้งหมดในระบบ (ข้อมูลจริงจาก API) */}
                        {allDepartmentStats.length > 0 ? allDepartmentStats.map((dept, index) => {
                          // ไอคอนสำหรับหน่วยงานต่าง ๆ
                          const getDepartmentIcon = (department) => {
                            if (department.includes('เทคโนโลยีสารสนเทศ') || department.includes('IT')) return '💻'
                            if (department.includes('วิทยาศาสตร์') || department.includes('วิศวกรรม')) return '🔬'
                            if (department.includes('บริหาร') || department.includes('จัดการ')) return '💼'
                            if (department.includes('ครุศาสตร์')) return '📚'
                            if (department.includes('มนุษยศาสตร์') || department.includes('ศิลปศาสตร์')) return '🎨'
                            if (department.includes('เกษตร')) return '🌱'
                            if (department.includes('รัฐศาสตร์')) return '🏛️'
                            if (department.includes('นิติศาสตร์')) return '⚖️'
                            if (department.includes('กอง') || department.includes('ศูนย์')) return '🏢'
                            if (department.includes('สำนัก')) return '📚'
                            return '🎓'
                          }

                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">{getDepartmentIcon(dept.department)}</span>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">{dept.department}</div>
                                  <div className="text-xs text-gray-500">{dept.percentage}% ของทั้งหมด</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-lg text-blue-600">{dept.bookings}</span>
                                <span className="text-gray-500 text-xs ml-1">ครั้ง</span>
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="text-center text-gray-500 py-8">
                            <p>ไม่มีข้อมูลการจอง</p>
                          </div>
                        )}
                      </div>
                      
                      {/* สรุปยอดรวม */}
                      <div className="border-t pt-4 mt-4">
                        <div className="text-center">
                          <span className="text-gray-700 font-medium">รวมทั้งหมด: </span>
                          <span className="font-bold text-lg text-blue-600">
                            {allDepartmentStats.reduce((sum, dept) => sum + dept.bookings, 0)} ครั้ง
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      
    </DashboardLayout>
  )
}
