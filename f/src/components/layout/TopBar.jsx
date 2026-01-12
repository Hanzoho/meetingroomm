'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  BellIcon, 
  Bars3Icon,
  ChevronDownIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getStaticFileUrl, authUtils } from '@/lib/fetchData'
import CustomAlert from '@/components/CustomAlert'
import NotificationReservationModal from '../modals/NotificationReservationModal'

export default function TopBar({ user, onMenuClick }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [prevAvatarUrl, setPrevAvatarUrl] = useState('') // เก็บ URL ก่อนหน้าไว้
  const [avatarKey, setAvatarKey] = useState(0)
  
  // 🔔 Notification States
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationLoading, setNotificationLoading] = useState(false)

  // 📄 Reservation Detail Modal States
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [reservationModalOpen, setReservationModalOpen] = useState(false)
  
  const router = useRouter()

  // 🚨 Custom Alert States
  const [alert, setAlert] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  })

  // ป้องกันการแสดง TopBar เมื่อ user data ยังไม่ครบ
  if (!user) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-4 lg:px-6 h-16">
          <div className="animate-pulse bg-gray-200 h-6 w-32 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
        </div>
      </header>
    )
  }

  // 🚨 Alert Helper Functions
  const showAlert = (type, title, message, onConfirm = null, showCancel = false, confirmText = null) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      showCancel,
      confirmText
    })
  }

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }))
  }

  // 🔔 Read Notifications Management ใช้ localStorage เก็บ read status
  const getReadNotifications = () => {
    try {
      const readIds = localStorage.getItem(`readNotifications_${user?.user_id || user?.officer_id}`)
      return readIds ? JSON.parse(readIds) : []
    } catch (error) {
      return []
    }
  }

  const markNotificationAsRead = async (notificationId) => {
    try {
      // เรียก API mark as read
      const token = authUtils.getToken()
      if (!token) return false

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // เพิ่มลง localStorage
        const readIds = getReadNotifications()
        if (!readIds.includes(notificationId)) {
          readIds.push(notificationId)
          localStorage.setItem(`readNotifications_${user?.user_id || user?.officer_id}`, JSON.stringify(readIds))
        }
        
        // อัปเดต unread count
        setUnreadCount(prevCount => Math.max(0, prevCount - 1))
        
        return true
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
    }
    return false
  }

  // ตรวจสอบว่า notification อ่านแล้วหรือยัง
  const isNotificationRead = (notificationId) => {
    const readIds = getReadNotifications()
    return readIds.includes(notificationId)
  }

  // 🗑️ Delete Notification Management
  const getDeletedNotifications = () => {
    try {
      const deletedIds = localStorage.getItem(`deletedNotifications_${user?.user_id || user?.officer_id}`)
      return deletedIds ? JSON.parse(deletedIds) : []
    } catch (error) {
      return []
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      // เรียก API delete notification
      const token = authUtils.getToken()
      if (!token) return false

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // เพิ่มลง localStorage สำหรับ deleted notifications
        const deletedIds = getDeletedNotifications()
        if (!deletedIds.includes(notificationId)) {
          deletedIds.push(notificationId)
          localStorage.setItem(`deletedNotifications_${user?.user_id || user?.officer_id}`, JSON.stringify(deletedIds))
        }
        
        // อัปเดต notifications list (กรองออกที่ถูกลบ)
        setNotifications(prevNotifications => 
          prevNotifications.filter(notification => notification.id !== notificationId)
        )
        
        // อัปเดต unread count
        const isRead = isNotificationRead(notificationId)
        if (!isRead) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1))
        }
        
        return true
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error)
    }
    return false
  }

  // ตรวจสอบว่า notification ถูกลบแล้วหรือยัง
  const isNotificationDeleted = (notificationId) => {
    const deletedIds = getDeletedNotifications()
    return deletedIds.includes(notificationId)
  }

  // ฟังก์ชันจัดการคลิก notification
  const handleNotificationClick = async (notification) => {
    // 🔔 Mark notification as read เมื่อคลิก
    await markNotificationAsRead(notification.id)
    
    // ปิด dropdown หลังคลิก
    setNotificationDropdownOpen(false);

    // ตรวจสอบ role ของ user
    const userData = authUtils.getUserWithRole()
    
    // ถ้าเป็นเจ้าหน้าที่ และเป็นแจ้งเตือนการจองใหม่ให้ไปหน้าอนุมัติ
    if (userData?.role === 'officer' && (notification.type === 'booking_request' || notification.title === 'การจองใหม่')) {
      // เนื่องจาก notification ไม่มี reservation_id ให้ส่งข้อมูลอื่นที่มีอยู่
      const queryParams = new URLSearchParams({
        room_name: notification.room_name || '',
        user_name: notification.user_name || '',
        booking_date: notification.booking_date || '',
        booking_time: notification.booking_time || '',
        open_modal: 'true',
        notification_id: notification.id.toString()
      })
      
      router.push(`/dashboard/officer/approvals?${queryParams.toString()}`)
      return
    }
    
    // สำหรับ role อื่นๆ หรือแจ้งเตือนประเภทอื่นๆ ให้ดึงรายละเอียดการจองและเปิด modal
    try {
      const token = authUtils.getToken()
      if (!token) return
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/reservations/${notification.reservation_id || notification.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success && result.reservation) {
        // แปลงข้อมูลให้ตรงกับ format ที่ modal ต้องการ
        const formattedReservation = {
          reservation_id: result.reservation.reservation_id,
          room_name: result.reservation.room?.room_name,
          department: result.reservation.room?.department,
          location: result.reservation.room?.location,
          start_at: result.reservation.booking_details?.start_at,
          end_at: result.reservation.booking_details?.end_at,
          start_time: result.reservation.booking_details?.start_time,
          end_time: result.reservation.booking_details?.end_time,
          details: result.reservation.booking_details?.details,
          status: result.reservation.booking_details?.status,
          approved_by: result.reservation.approval?.approved_by,
          created_at: result.reservation.timestamps?.created_at,
          updated_at: result.reservation.timestamps?.updated_at
        }
        
        setSelectedReservation(formattedReservation)
        setReservationModalOpen(true)
      } else {
        console.error('Failed to fetch reservation details:', result.message)
      }
    } catch (error) {
      console.error('Error fetching reservation details:', error)
    }
  };

  // อัพเดต avatar URL เมื่อ user เปลี่ยน
  useEffect(() => {
    // 🔥 ใช้ ID ที่ถูกต้องตาม role
    const currentUserId = user?.user_id || user?.officer_id || user?.admin_id || user?.executive_id
    
    // 🔥 สร้าง image URL เองถ้าไม่มี profile_image หรือมี currentUserId
    if (currentUserId) {
      let finalImageUrl = user?.profile_image
      
      // ถ้าไม่มี profile_image ให้สร้าง default URL เอง พร้อม role parameter
      if (!finalImageUrl) {
        const userRole = user?.role || 'user'
        finalImageUrl = `/api/upload/profile-image/${currentUserId}/${userRole}`
      }
      
      // ตรวจสอบว่า profile_image เป็น string หรือ object
      const profileImagePath = typeof finalImageUrl === 'string' 
        ? finalImageUrl 
        : finalImageUrl?.path || finalImageUrl?.url || finalImageUrl?.final_profile_image
        
      if (profileImagePath && typeof profileImagePath === 'string') {
        // ใช้ cache busting เฉพาะเมื่อมีการ update รูปใหม่
        let finalUrl = profileImagePath.startsWith('/api/') 
          ? `${process.env.NEXT_PUBLIC_API_URL}${profileImagePath}`
          : getStaticFileUrl(profileImagePath)
        
        // เพิ่ม cache busting เฉพาะเมื่อมี _imageUpdate (มีการอัพโหลดรูปใหม่)
        if (user?._imageUpdate) {
          finalUrl += `?t=${user._imageUpdate}`
        }
        
        // อัพเดต URL เฉพาะเมื่อ URL เปลี่ยนจริง ๆ
        if (avatarUrl !== finalUrl) {
          // เก็บ URL เดิมไว้ก่อนอัพเดต
          if (avatarUrl) {
            setPrevAvatarUrl(avatarUrl)
          }
          
          // Preload รูปใหม่เพื่อให้โหลดเร็วขึ้น
          const img = new Image()
          img.onload = () => {
            // เมื่อรูปใหม่โหลดเสร็จแล้ว ค่อยอัพเดต URL
            setAvatarUrl(finalUrl)
            // ล้าง prevAvatarUrl หลังจากรูปใหม่แสดงแล้ว
            setTimeout(() => setPrevAvatarUrl(''), 100)
          }
          img.onerror = () => {
            // ถ้าโหลดไม่ได้ ให้อัพเดตเลย
            setAvatarUrl(finalUrl)
          }
          img.src = finalUrl
          
          // Force re-render เฉพาะเมื่อมีการ update รูป
          if (user?._imageUpdate) {
            setAvatarKey(prev => prev + 1)
          }
        }
      } else if (avatarUrl !== '' && !prevAvatarUrl) {
        // เก็บ URL เดิมก่อนจะล้าง
        if (avatarUrl) {
          setPrevAvatarUrl(avatarUrl)
        }
        setAvatarUrl('')
      }
    } else if (avatarUrl !== '' && !prevAvatarUrl) {
      // เก็บ URL เดิมก่อนจะล้าง
      if (avatarUrl) {
        setPrevAvatarUrl(avatarUrl)
      }
      setAvatarUrl('')
    }
  }, [user?.profile_image, user?.user_id, user?.officer_id, user?.admin_id, user?.executive_id, user?._imageUpdate])

  // 🔔 Fetch Notifications
  const fetchNotifications = async () => {
    if (!user || notificationLoading) return

    try {
      setNotificationLoading(true)
      const token = localStorage.getItem('token')
      
      // เลือก endpoint ตาม role (เฉพาะ user และ officer เท่านั้น)
      const role = user?.role || 'user'
      
      // ❌ Executive และ Admin ไม่ควรได้รับการแจ้งเตือนการจอง
      if (role === 'executive' || role === 'admin') {
        setNotifications([])
        setNotificationLoading(false)
        return
      }
      
      const endpoint = role === 'officer' ? '/api/protected/notifications/officer' : '/api/protected/notifications/user'
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const notifications = data.data.notifications || []
          setNotifications(notifications)
          
          // คำนวณ unread count ใหม่ตาม localStorage
          const readIds = getReadNotifications()
          const deletedIds = getDeletedNotifications()
          
          // กรองการแจ้งเตือนที่ถูกลบออก
          const activeNotifications = notifications.filter(notification => 
            !deletedIds.includes(notification.id)
          )
          
          setNotifications(activeNotifications)
          
          const unreadCount = activeNotifications.filter(notification => 
            !readIds.includes(notification.id)
          ).length
          setUnreadCount(unreadCount)
        }
      } else {
        console.error('🔔 Failed to fetch notifications:', response.status)
      }
    } catch (error) {
      console.error('🔔 Error fetching notifications:', error)
    } finally {
      setNotificationLoading(false)
    }
  }

  // Load notifications เมื่อ component mount และ user เปลี่ยน
  useEffect(() => {
    if (user && user.role) {
      fetchNotifications()
      
      // Auto refresh ทุก 30 วินาที
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.role, user?.user_id, user?.officer_id])

  // Fetch notifications เมื่อเปิด dropdown
  const handleNotificationDropdown = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen)
    if (!notificationDropdownOpen) {
      fetchNotifications()
    }
  }

  const handleLogout = () => {
    // 🚨 แสดง Alert ยืนยันการออกจากระบบ
    showAlert(
      'confirm',
      'ออกจากระบบ',
      'คุณแน่ใจหรือไม่ที่จะออกจากระบบ?\n',
      () => performLogout(), // เรียกฟังก์ชันออกจากระบบจริง
      true // แสดงปุ่มยกเลิก
    )
  }

  const performLogout = async () => {
    try {
      // Manual logout - หยุดการตรวจสอบ token ก่อน
      authUtils.manualLogout()
      
      // Redirect ไป login
      router.push('/login')
    } catch (error) {
      console.error('❌ Logout error:', error)
      // ถึงจะ error ก็ redirect ไป login อยู่ดี
      router.push('/login')
    }
  }

  return (
    <header className="sticky top-0 bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 z-40">
      {/* Left Section */}
      <div className="flex items-center">
        {/* Mobile Menu Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMenuClick()
          }}
          className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 touch-manipulation select-none cursor-pointer"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Current Date & Time - Simple styling */}
        <div className="hidden sm:flex flex-col items-end text-sm">
          <div className="font-medium text-gray-800">
            {new Date().toLocaleDateString('th-TH', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
          <div className="text-xs text-gray-600">
            {new Date().toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleNotificationDropdown}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors duration-200 touch-manipulation select-none cursor-pointer"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <BellIcon className="h-5 w-5 lg:h-6 lg:w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center font-semibold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[60]">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">การแจ้งเตือน</h3>
              </div>
              <div className="max-h-80 lg:max-h-96 overflow-y-auto">
                {notificationLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    {user?.role === 'executive' || user?.role === 'admin' ? (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">ไม่มีการแจ้งเตือนการจอง</p>
                        <p className="text-xs text-gray-400">
                          {user?.role === 'executive' ? 'ผู้บริหาร' : 'ผู้ดูแลระบบ'}ไม่ได้รับแจ้งเตือนการจองห้องประชุม
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">ไม่มีการแจ้งเตือน</p>
                    )}
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const isRead = isNotificationRead(notification.id)
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 transition-colors duration-200 ${
                          !isRead ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                            !isRead ? 'bg-blue-500' : 'bg-gray-300'
                          }`}></div>
                          <div 
                            className="flex-1 cursor-pointer hover:bg-gray-50 hover:bg-opacity-80 -m-2 p-2 rounded transition-all duration-200"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <h4 className={`text-sm font-semibold ${
                              !isRead ? 'text-gray-800' : 'text-gray-500'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              !isRead ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {notification.message}
                            </p>
                            {notification.room_name && (
                              <p className={`text-xs mt-1 ${
                                !isRead ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                ห้อง: {notification.room_name}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {notification.time_ago}
                            </p>
                          </div>
                          {/* ปุ่มลบการแจ้งเตือน */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              showAlert(
                                'confirm',
                                'ลบการแจ้งเตือน',
                                `คุณต้องการลบการแจ้งเตือน "${notification.title}" หรือไม่?\n\nการกระทำนี้ไม่สามารถยกเลิกได้`,
                                () => deleteNotification(notification.id),
                                true,
                                'ลบการแจ้งเตือน'
                              )
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors duration-200"
                            title="ลบการแจ้งเตือน"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="p-2 border-t border-gray-200">
                <div className="w-full text-center text-sm text-gray-400 py-2">
                  {/* ส่วนสำหรับปุ่มหรือข้อความเพิ่มเติม */}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center space-x-2 lg:space-x-3 p-2 sm:p-1 lg:p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 touch-manipulation select-none cursor-pointer"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <Avatar className="w-7 h-7 lg:w-8 lg:h-8">
              <AvatarImage 
                src={avatarUrl || prevAvatarUrl} 
                alt={`${user?.first_name} ${user?.last_name}`}
                className="object-cover"
                onLoad={() => {
                  // เมื่อรูปโหลดสำเร็จ ให้ล้าง prevAvatarUrl
                  if (prevAvatarUrl && avatarUrl) {
                    setPrevAvatarUrl('')
                  }
                }}
              />
              <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-semibold text-xs lg:text-sm">
                {user?.first_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-24 lg:max-w-none">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role === 'user' ? 'ผู้ใช้งาน' : user?.role}
              </p>
            </div>
            <ChevronDownIcon className="h-3 w-3 lg:h-4 lg:w-4 text-gray-600" />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[60]">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={avatarUrl || prevAvatarUrl} 
                      alt={`${user?.first_name} ${user?.last_name}`}
                      onLoad={() => {
                        // เมื่อรูปโหลดสำเร็จ ให้ล้าง prevAvatarUrl
                        if (prevAvatarUrl && avatarUrl) {
                          setPrevAvatarUrl('')
                        }
                      }}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-500 text-white font-bold text-lg">
                      {user?.first_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0"> {/* ป้องกันการทะลุ */}
                    <p className="font-semibold text-gray-800 truncate">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate"> {/* ลบ max-w-32 */}
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="py-2">
                <Link 
                  href={`/profile/${user?.role || 'user'}`}
                  className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <UserIcon className="h-5 w-5 mr-3 text-gray-500" />
                  <span>ดูโปรไฟล์</span>
                </Link>
              </div>
              
              <div className="border-t border-gray-200 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click Outside Handler */}
      {(profileDropdownOpen || notificationDropdownOpen) && (
        <div
          className="fixed inset-0 z-[55]"
          onClick={() => {
            setProfileDropdownOpen(false)
            setNotificationDropdownOpen(false)
          }}
        />
      )}

      {/* 🚨 Custom Alert Modal */}
      <CustomAlert
        isOpen={alert.isOpen}
        onClose={closeAlert}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={alert.onConfirm}
        showCancel={alert.showCancel}
        confirmText={alert.confirmText || (alert.type === 'confirm' ? 'ออกจากระบบ' : 'ตกลง')}
        cancelText="ยกเลิก"
      />

      {/* 📄 Notification Reservation Detail Modal */}
      <NotificationReservationModal
        isOpen={reservationModalOpen}
        onClose={() => {
          setReservationModalOpen(false)
          setSelectedReservation(null)
        }}
        reservation={selectedReservation}
      />
    </header>
  )
}
