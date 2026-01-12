'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  CalendarIcon, 
  ClipboardDocumentListIcon,
  ClockIcon,
  UserIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

export default function Sidebar({ user, isOpen, onToggle, onClose }) {
  const pathname = usePathname()

  // ป้องกันการแสดงเมนูผิดเมื่อ user data ยังไม่ครบ
  if (!user || !user.role) {
    return (
      <div className="bg-white h-screen shadow-xl flex flex-col w-64">
        <div className="flex items-center justify-center p-4 border-b border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // เมื่อเปลี่ยนหน้าให้ปิด sidebar ใน mobile
  useEffect(() => {
    if (window.innerWidth < 1024 && isOpen) {
      onClose?.()
    }
  }, [pathname])

  // เมนูสำหรับ Officer Role
  const getOfficerMenuItems = () => {
    return [
      {
        name: 'หน้าหลัก',
        href: '/dashboard/officer',
        icon: HomeIcon,
        current: pathname === '/dashboard/officer'
      },
      {
        name: 'ปฏิทินการจอง',
        href: '/calendar',
        icon: CalendarIcon,
        current: pathname === '/calendar'
      },
      {
        name: 'อนุมัติการจอง',
        href: '/dashboard/officer/approvals',
        icon: ClockIcon,
        current: pathname === '/dashboard/officer/approvals'
      },
      {
        name: 'จัดการห้องประชุม',
        href: '/dashboard/officer/rooms',
        icon: CalendarIcon,
        current: pathname === '/dashboard/officer/rooms'
      },
      {
        name: 'รายงานการใช้งาน',
        href: '/dashboard/officer/reports',
        icon: ClipboardDocumentListIcon,
        current: pathname === '/dashboard/officer/reports'
      },
      {
        name: 'โปรไฟล์',
        href: '/profile/officer',
        icon: UserIcon,
        current: pathname === '/profile/officer'
      }
    ]
  }

  // เมนูสำหรับ Admin Role
  const getAdminMenuItems = () => {
    return [
      {
        name: 'หน้าหลัก',
        href: '/dashboard/admin',
        icon: HomeIcon,
        current: pathname === '/dashboard/admin'
      },
      {
        name: 'จัดการผู้ใช้',
        href: '/dashboard/admin/users',
        icon: UserIcon,
        current: pathname === '/dashboard/admin/users'
      },
      //{
       // name: 'รายงานการใช้งานระบบ',
       // href: '/dashboard/admin/reports',
       // icon: ClipboardDocumentListIcon,
       // current: pathname === '/dashboard/admin/reports'
      //},
      {
        name: 'โปรไฟล์',
        href: '/profile/admin',
        icon: UserIcon,
        current: pathname === '/profile/admin'
      }
    ]
  }

  // เมนูสำหรับ Executive Role
  const getExecutiveMenuItems = () => {
    return [
      {
        name: 'หน้าหลัก',
        href: '/dashboard/executive',
        icon: HomeIcon,
        current: pathname === '/dashboard/executive'
      },
      {
        name: 'รายงานผู้บริหาร',
        href: '/dashboard/executive/reports',
        icon: ClipboardDocumentListIcon,
        current: pathname === '/dashboard/executive/reports'
      },
      {
        name: 'สถิติการใช้งาน',
        href: '/dashboard/executive/statistics',
        icon: CalendarIcon,
        current: pathname === '/dashboard/executive/statistics'
      },
      {
        name: 'โปรไฟล์',
        href: '/profile/executive',
        icon: UserIcon,
        current: pathname === '/profile/executive'
      }
    ]
  }

  // เมนูสำหรับ User Role
  const getUserMenuItems = () => {
    return [
      {
        name: 'หน้าหลัก',
        href: '/dashboard/user',
        icon: HomeIcon,
        current: pathname === '/dashboard/user'
      },
      {
        name: 'ปฏิทินการจอง',
        href: '/calendar',
        icon: CalendarIcon,
        current: pathname === '/calendar'
      },
      {
        name: 'จองห้องประชุม',
        href: '/reserve',
        icon: CalendarIcon,
        current: pathname === '/reserve'
      },
      {
        name: 'ประวัติการจอง',
        href: '/my-reservations',
        icon: ClipboardDocumentListIcon,
        current: pathname === '/my-reservations'
      },
      {
        name: 'ค้นหาห้องประชุม',
        href: '/room-directory',
        icon: HomeIcon,
        current: pathname === '/room-directory'
      },
      {
        name: 'โปรไฟล์',
        href: '/profile/user',
        icon: UserIcon,
        current: pathname === '/profile/user'
      }
    ]
  }

  // เลือกเมนูตาม role
  const getMenuItems = () => {
    switch (user?.role) {
      case 'officer': return getOfficerMenuItems()
      case 'admin': return getAdminMenuItems()
      case 'executive': return getExecutiveMenuItems()
      case 'user':
      default: return getUserMenuItems()
    }
  }

  const menuItems = getMenuItems()

  // ฟังก์ชันสำหรับเลือกสีธีมตาม role
  const getThemeColors = () => {
    switch (user?.role) {
      case 'officer': 
        return {
          primary: 'from-blue-500 to-indigo-600',
          text: 'from-blue-600 to-indigo-600',
          bg: 'from-blue-500 to-indigo-600'
        }
      case 'admin': 
        return {
          primary: 'from-red-500 to-pink-600',
          text: 'from-red-600 to-pink-600',
          bg: 'from-red-500 to-pink-600'
        }
      case 'executive': 
        return {
          primary: 'from-purple-500 to-violet-600',
          text: 'from-purple-600 to-violet-600',
          bg: 'from-purple-500 to-violet-600'
        }
      case 'user':
      default: 
        return {
          primary: 'from-green-500 to-emerald-600',
          text: 'from-green-600 to-emerald-600',
          bg: 'from-green-500 to-emerald-600'
        }
    }
  }

  const themeColors = getThemeColors()

  // หาเมนูที่ active ปัจจุบัน
  const getCurrentPageName = () => {
    const currentItem = menuItems.find(item => item.current)
    return currentItem ? currentItem.name : 'หน้าหลัก'
  }

  const handleMenuClick = () => {
    // ปิด sidebar ใน mobile เมื่อคลิกเมนู
    if (window.innerWidth < 1024) {
      onClose?.()
    }
  }

  return (
    <div className="bg-white h-screen shadow-xl flex flex-col w-64">
      {/* Header with Close Button for Mobile */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${themeColors.bg} rounded-xl flex items-center justify-center overflow-hidden`}>
            <img 
              src="/images/logo_rmu.png" 
              alt="RMU Logo" 
              className="w-7 h-7 object-contain"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <span className="text-white font-bold text-lg hidden">R</span>
          </div>
          <div>
            <h1 className={`text-xl font-bold bg-gradient-to-r ${themeColors.text} bg-clip-text text-transparent`}>
              RMU MEETING
            </h1>
            <p className="text-xs text-gray-500">ระบบจองห้องประชุม</p>
          </div>
        </div>
        
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Current Page Indicator */}
      <div className={`mx-3 mt-4 mb-2 px-3 py-2 bg-gradient-to-r ${themeColors.primary} rounded-lg`}>
        <p className="text-white text-sm font-medium">📍 {getCurrentPageName()}</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleMenuClick}
              className={`
                flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative
                ${item.current
                  ? `bg-gradient-to-r ${themeColors.primary} text-white shadow-lg border-l-4 border-opacity-50`
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-700'
                }
              `}
            >
              <Icon className={`h-5 w-5 mr-3 flex-shrink-0 ${
                item.current ? 'text-white' : 'text-gray-400'
              }`} />
              <span className="truncate">{item.name}</span>
              {item.current && (
                <div className="absolute right-3">
                  <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
