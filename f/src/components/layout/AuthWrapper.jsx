'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'

export default function AuthWrapper({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  useEffect(() => {
    // Fallback timeout เพื่อป้องกันการค้าง
    const fallbackTimeout = setTimeout(() => {
      console.log('⚠️ Auth check timeout, fallback to show content')
      setLoading(false)
      setIsAuthChecked(true)
    }, 3000) // 3 วินาที fallback

    const checkAuth = async () => {
      try {
        // Skip auth check for public routes
        const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
        if (publicRoutes.includes(pathname)) {
          setLoading(false)
          setIsAuthChecked(true)
          return
        }

        // ตรวจสอบการ login - ต้องรอให้ client-side render เสร็จก่อน
        if (typeof window === 'undefined') return
        
        const userData = authUtils.getUserWithRole()
        const token = authUtils.getToken()
        
        // 🚀 เริ่ม Global Token Expiry Check สำหรับผู้ใช้ที่ Login แล้ว
        if (token && userData) {
          authUtils.startTokenExpiryCheck()
        }
        
        // สำหรับหน้าแรก (/) - ถ้ายังไม่ได้ login ให้แสดง Landing Page
        if (pathname === '/') {
          if (!token || !userData || !userData.role) {
            // ยังไม่ได้ login - แสดง Landing Page
            console.log('✅ Showing landing page')
            setLoading(false)
            setIsAuthChecked(true)
            return
          } else {
            // Login แล้ว - redirect ไป dashboard
            console.log('🔄 Already logged in, redirecting to dashboard')
            const targetPath = userData.role === 'admin' ? '/dashboard/admin' :
                              userData.role === 'executive' ? '/dashboard/executive' :
                              userData.role === 'officer' ? '/dashboard/officer' : 
                              '/dashboard/user'
            
            router.push(targetPath)
            // ไม่ต้องใช้ setTimeout แล้ว
            setTimeout(() => setLoading(false), 500) // สั้นกว่าเดิม
            return
          }
        }
        
        // สำหรับหน้าอื่นๆ (dashboard, protected routes) - ต้อง login
        if (!token || !userData || !userData.role) {
          // ถ้าไม่ได้ login ให้ไปหน้า login
          console.log('❌ No auth, redirecting to login')
          authUtils.stopTokenExpiryCheck() // หยุดการตรวจสอบ token ก่อน
          authUtils.clearAuth() // ล้างข้อมูลเก่าทิ้ง
          router.push('/login')
          setLoading(false)
          return
        }
        
        // สำหรับหน้าอื่นๆ ที่ login แล้ว
        setLoading(false)
        setIsAuthChecked(true)
        
      } catch (error) {
        console.error('❌ Auth check error:', error)
        setLoading(false)
        setIsAuthChecked(true)
      } finally {
        clearTimeout(fallbackTimeout) // ยกเลิก fallback timeout
      }
    }

    checkAuth()
    
    // Cleanup timeout on unmount
    return () => clearTimeout(fallbackTimeout)
  }, [pathname, router])

  // แสดง Loading เฉพาะตอนเข้าหน้าแรก
  if (loading && pathname === '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          {/* Logo หรือชื่อมหาวิทยาลัย */}
          <div className="mb-8">
            <div className="text-4xl lg:text-6xl font-bold text-green-600 mb-2">
              🏢 RMU
            </div>
            <p className="text-lg lg:text-xl text-gray-700 font-medium">
              ระบบจองห้องประชุม
            </p>
            <p className="text-sm lg:text-base text-gray-500">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
          </div>
          
          {/* Loading Animation */}
          <div className="mb-6 flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-green-600"></div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <p className="text-gray-600 text-lg font-medium">กำลังเข้าสู่ระบบ...</p>
            <p className="text-gray-500 text-sm">โปรดรอสักครู่</p>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  // แสดง Loading แบบง่ายๆ สำหรับหน้าอื่นๆ ระหว่างตรวจสอบ auth (รวมถึงตอน redirect)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return children
}
