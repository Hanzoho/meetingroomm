'use client'

import React, { createContext, useContext } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { authUtils, authAPI } from '@/lib/fetchData'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Create Context for refreshUser and updateUser
const RefreshUserContext = createContext(null)

export const useRefreshUser = () => {
  const context = useContext(RefreshUserContext)
  return context?.refreshUser || (() => {})
}

export const useUpdateUser = () => {
  const context = useContext(RefreshUserContext)
  return context?.updateUser || (() => {})
}

// This layout will apply to all routes within the (main) group.
export default function LayoutForMainPages({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Function สำหรับ refresh user data
  const refreshUser = async (preserveImageUrl = false) => {
    try {
      console.log('🔄 Layout: Refreshing user data...')
      
      
      // เรียก API เพื่อดึงข้อมูลใหม่
      const response = await authAPI.getProfile()
      console.log('📦 Layout: Profile API response:', response)
      

      if (response.success && response.profile) {
        console.log('✅ Layout: Updated user data:', {
          role: response.profile.role,
          userTable: response.profile.userTable,
          user_id: response.profile.user_id,
          officer_id: response.profile.officer_id,
          admin_id: response.profile.admin_id,
          executive_id: response.profile.executive_id,
          currentId: response.profile.user_id || response.profile.officer_id || response.profile.admin_id || response.profile.executive_id,
          profile_image: response.profile.profile_image,
          preserveImageUrl: preserveImageUrl
        })
        

        // 🔥 ถ้า preserveImageUrl = true ให้เก็บ profile_image เดิมไว้
        const updatedProfile = preserveImageUrl && user?.profile_image 
          ? { ...response.profile, profile_image: user.profile_image }
          : response.profile
          
        console.log('🖼️ Layout: Final profile_image:', updatedProfile.profile_image)
        
        setUser(updatedProfile)
        
        // อัปเดต localStorage ด้วย (แต่ไม่เก็บ profile_image ใน localStorage)
        const { profile_image, ...profileForStorage } = updatedProfile
        localStorage.setItem('user', JSON.stringify(profileForStorage))
      }
    } catch (error) {
      console.error('❌ Layout: Error refreshing user:', error)
      // ถ้า API fail ให้ลองใช้ข้อมูลจาก localStorage
      const userData = authUtils.getUserWithRole()
      if (userData) {
        setUser(userData)
      }
    }
  }

  // Function สำหรับอัปเดต user state โดยตรง
  const updateUser = (updates) => {
    console.log('📝 Layout: Updating user with:', updates)
    setUser(prev => {
      const newUser = { ...prev, ...updates }
      console.log('✅ Layout: User updated to:', newUser)
      return newUser
    })
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🚀 Layout: Initializing auth...')
        
        const userData = authUtils.getUserWithRole()
        const token = authUtils.getToken()

        if (!token || !userData) {
          console.log('❌ Layout: No token or user data, redirecting to login')
          router.push('/login')
          return
        }

        console.log('👤 Layout: Initial user data:', {
          role: userData.role,
          userTable: userData.userTable,
          user_id: userData.user_id,
          officer_id: userData.officer_id,
          admin_id: userData.admin_id,
          executive_id: userData.executive_id,
          currentId: userData.user_id || userData.officer_id || userData.admin_id || userData.executive_id,
          profile_image: userData.profile_image
        })

        setUser(userData)
        
        // ลด delay ให้เร็วที่สุด
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // ลองดึงข้อมูลล่าสุดจาก API (แต่ไม่ update ถ้าข้อมูลเหมือนเดิม)
        try {
          const response = await authAPI.getProfile()
          if (response.success && response.profile) {
            // เปรียบเทียบข้อมูลสำคัญเพื่อป้องกัน unnecessary re-render
            const isDataChanged = 
              userData.profile_image !== response.profile.profile_image ||
              userData.first_name !== response.profile.first_name ||
              userData.last_name !== response.profile.last_name ||
              userData.email !== response.profile.email

            if (isDataChanged) {
              console.log('🔄 Layout: Profile data changed, updating...')
              setUser(response.profile)
              localStorage.setItem('user', JSON.stringify(response.profile))
            } else {
              console.log('✅ Layout: Profile data unchanged, skipping update')
            }
          }
        } catch (apiError) {
          console.log('⚠️ Layout: API call failed, using cached data:', apiError.message)
        }
        
      } catch (error) {
        console.error('❌ Layout: Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  if (loading) {
    // กำหนดสีตาม role ของผู้ใช้
    const getThemeByRole = (userRole) => {
      switch (userRole) {
        case 'officer':
          return {
            bgGradient: 'from-blue-50 to-indigo-50',
            titleColor: 'text-blue-800',
            spinnerColor: 'border-blue-200',
            dotColor: 'bg-blue-600'
          }
        case 'admin':
          return {
            bgGradient: 'from-red-50 to-pink-50',
            titleColor: 'text-red-800',
            spinnerColor: 'border-red-200',
            dotColor: 'bg-red-600'
          }
        case 'executive':
          return {
            bgGradient: 'from-purple-50 to-violet-50',
            titleColor: 'text-purple-800',
            spinnerColor: 'border-purple-200',
            dotColor: 'bg-purple-600'
          }
        case 'user':
        default:
          return {
            bgGradient: 'from-green-50 to-emerald-50',
            titleColor: 'text-green-800',
            spinnerColor: 'border-green-200',
            dotColor: 'bg-green-600'
          }
      }
    }

    const theme = getThemeByRole(user?.role)

    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme.bgGradient}`}>
        <div className="text-center">
          <div className="mb-8">
            <div className={`text-4xl lg:text-6xl font-bold ${theme.titleColor} mb-2 drop-shadow-lg`}>
              🏢 RMU MEETING
            </div>
            <p className="text-lg lg:text-xl text-gray-800 font-medium">
              ระบบจองห้องประชุม
            </p>
            <p className="text-sm lg:text-base text-gray-600">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600 text-lg font-medium">กำลังเข้าสู่ระบบ...</p>
            <p className="text-gray-500 text-sm">โปรดรอสักครู่</p>
            
            {/* ปุ่มกลับหน้าแนะนำ */}
            <div className="pt-4">
              <button
                onClick={() => router.push('/')}
                className="bg-white text-blue-600 hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-400 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ← กลับหน้าแนะนำ
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <RefreshUserContext.Provider value={{ refreshUser, updateUser }}>
      <DashboardLayout user={user}>
        {children}
      </DashboardLayout>
    </RefreshUserContext.Provider>
  );
}