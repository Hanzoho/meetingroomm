'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { authUtils } from '@/lib/fetchData'

const MainNav = () => {
  const router = useRouter()
  
  // ตรวจสอบว่าล็อกอินอยู่หรือไม่
  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('token')
  
  // ฟังก์ชัน logout
  const handleLogout = () => {
    // ใช้ manualLogout เพื่อหยุดการตรวจสอบ token ก่อนลบข้อมูล
    authUtils.manualLogout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center max-w-7xl mx-auto">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/images/logo_rmu.png" 
                alt="RMU Logo" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <span className="text-white text-lg hidden">📅</span>
            </div>
            <span className="font-bold text-lg">ระบบจองห้องประชุม</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
              🏠 หน้าแรก
            </Link>
            <Link href="/calendar" className="transition-colors hover:text-foreground/80 text-foreground/60">
              📅 ปฏิทิน
            </Link>
            <Link href="/reserve" className="transition-colors hover:text-foreground/80 text-foreground/60">
              ✅ จองห้อง
            </Link>
            <Link href="/meetingroom" className="transition-colors hover:text-foreground/80 text-foreground/60">
              🏢 ห้องประชุม
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {isLoggedIn ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/reservations">📝 การจองของฉัน</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700">
                🚪 ออกจากระบบ
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default MainNav