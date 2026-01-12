// ===================================================================
// API Configuration - ใช้ Next.js API Proxy Layer
// ===================================================================
// เปลี่ยนจาก: เรียก backend โดยตรง
// เป็น: เรียกผ่าน Next.js API Proxy (/api/...)
// ===================================================================

// API Base URL - เรียกผ่าน Next.js API Proxy (ซ่อน backend URL)
const API_BASE_URL = '/api'

// สำหรับ static files (รูปภาพ) - ยังต้องเรียก backend โดยตรง
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3580'

// Import debug utility
import { debugLog, prodLog } from '@/utils/debug'

// Helper function สำหรับ static files (รูปภาพ, ไฟล์)
export const getStaticFileUrl = (path) => {
  if (!path || typeof path !== 'string') return null
  if (path.startsWith('http')) return path
  
  // Return path as-is (ไม่เพิ่ม prefix เพราะ path มาจาก backend แล้ว)
  return path
}

// Create API client with error handling and JWT support
const apiClient = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add JWT token if available and not expired (for protected routes)
  // ยกเว้น endpoint login ไม่ต้องตรวจสอบ token
  const isLoginEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register')

  if (typeof window !== 'undefined' && !isLoginEndpoint) {
    const token = localStorage.getItem('token')
    if (token) {
      // ตรวจสอบว่า token หมดอายุหรือไม่
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)

        if (payload.exp && payload.exp < currentTime) {
          // Token หมดอายุแล้ว - ล้างข้อมูลและ redirect ไป login
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          throw new Error('Token expired')
        }

        // Token ยังไม่หมดอายุ - ใส่ใน header
        config.headers.Authorization = `Bearer ${token}`
      } catch (error) {
        // ถ้า decode token ไม่ได้ - ล้างข้อมูลและ redirect
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        throw new Error('Invalid token')
      }
    }
  }

  try {
    const response = await fetch(url, config)

    // ตรวจสอบสถานะ response ก่อน parse JSON
    if (response.status === 401) {
      // Unauthorized - Token หมดอายุหรือไม่ถูกต้อง
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      throw new Error('Unauthorized - Token expired or invalid')
    }

    const data = await response.json()

    if (!response.ok) {
      // สำหรับ login errors (401) ไม่ต้อง log ซ้ำ เพราะได้ handle แล้วข้างบน
      const errorMessage = data.message || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
    }

    return data
  } catch (error) {
    // ลด log ซ้ำซ้อน - log เฉพาะ error ที่ไม่ใช่ credential errors, validation errors, approval errors และ booking conflicts
    if (process.env.NODE_ENV === 'development' &&
      !error.message.includes('Unauthorized') &&
      !error.message.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง') &&
      !error.message.includes('อีเมลนี้ถูกใช้งานแล้ว') &&
      !error.message.includes('เลขบัตรประชาชนนี้ถูกใช้งานแล้ว') &&
      !error.message.includes('บัญชีของคุณรอการอนุมัติ') &&
      !error.message.includes('รอการอนุมัติ') &&
      !error.message.includes('pending') &&
      !error.message.includes('ช่วงเวลาใหม่ที่เลือกมีการจองอยู่แล้ว') &&
      !error.message.includes('ช่วงเวลาที่เลือกมีการจองอยู่แล้ว') &&
      !error.message.includes('conflict') &&
      !error.message.includes('ขัดแย้ง')) {
      debugLog.error('API Error:', error)
    }
    throw error
  }
}

// Authentication APIs
export const authAPI = {
  register: (userData) => apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials) => apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  // อัปเดตโปรไฟล์ของตนเอง
  updateProfile: (userData) => apiClient('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),

  // ดึงข้อมูลโปรไฟล์ปัจจุบัน
  getProfile: () => apiClient('/auth/profile'),

  // อัปโหลดรูปโปรไฟล์
  uploadProfileImage: (formData) => {
    // สำหรับ FormData ไม่ต้องกำหนด Content-Type
    const config = {
      method: 'POST',
      body: formData,
    }

    // Add JWT token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
        }
      }
    }

    return fetch(`${API_BASE_URL}/upload/profile-image`, config)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .catch(error => {
        console.error('API Error:', error)
        throw error
      })
  },

  // ลบรูปโปรไฟล์
  removeProfileImage: () => apiClient('/protected/user/profile/image', {
    method: 'DELETE',
  }),
}

// Room APIs
export const roomAPI = {
  getAll: () => apiClient('/rooms'),
  getById: (id) => apiClient(`/rooms/${id}`),
  getMyRooms: () => apiClient('/protected/my-rooms'), // ห้องที่ user มีสิทธิ์เข้าถึง
}

// Reservation APIs  
export const reservationAPI = {
  // สร้างการจองใหม่
  create: (bookingData) => apiClient('/protected/reservations', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),

  // ดูการจองของตัวเอง
  getMyBookings: () => apiClient('/protected/reservations/my'),

  // ดูการจองเฉพาะ ID
  getById: (id) => apiClient(`/protected/reservations/${id}`),

  // ดูรายละเอียดการจองเฉพาะ ID (alias สำหรับ getById)
  getDetails: (id) => apiClient(`/protected/reservations/${id}`),

  // ดูการจองทั้งหมด (สำหรับ officer/admin)
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiClient(`/protected/reservations${query ? `?${query}` : ''}`)
  },

  // ดูการจองของห้องเฉพาะ
  getByRoom: (roomId, date) => apiClient(`/protected/reservations/room/${roomId}?date=${date}`),

  // แก้ไขการจอง
  update: (id, updateData) => apiClient(`/protected/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),

  // ยกเลิกการจอง
  cancel: (id) => apiClient(`/protected/reservations/${id}`, {
    method: 'DELETE',
  }),

  // อนุมัติการจอง (สำหรับ officer)
  approve: (id) => apiClient(`/officer/reservations/${id}/approve`, {
    method: 'PUT',
  }),

  // ปฏิเสธการจอง (สำหรับ officer)
  reject: (id, reason) => apiClient(`/officer/reservations/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }),
}

// Calendar APIs สำหรับหน้าปฏิทิน
export const calendarAPI = {
  // ดึงข้อมูลปฏิทินของห้องในวันที่เลือก (รายละเอียด)
  getCalendarData: (roomId, month, year, detailed = false, options = {}) => {
    const params = new URLSearchParams({
      month: month.toString(),
      year: year.toString(),
      ...(detailed && { detailed: 'true' }),
      ...(options.timestamp && { _t: options.timestamp.toString() }),
      ...(options.source && { _src: options.source })
    }).toString()

    const url = `/reservations/calendar/${roomId}?${params}`
    console.log(`🌐 [API] Calendar Request: ${url} (source: ${options.source || 'unknown'})`)

    return apiClient(url)
  },

  // ดึงข้อมูลปฏิทินรายละเอียด (ตาม CALENDAR-FRONTEND-GUIDE.md)
  getDetailedCalendar: (roomId, month, year, options = {}) => {
    return calendarAPI.getCalendarData(roomId, month, year, true, options)
  },

  // ดึงช่วงเวลาว่างของห้อง
  getAvailableSlots: (roomId, date) => apiClient(`/protected/rooms/${roomId}/available-slots?date=${date}`),

  // ตรวจสอบเวลาซ้อนทับ
  checkConflict: (roomId, date, startTime, endTime) => apiClient('/protected/check-conflict', {
    method: 'POST',
    body: JSON.stringify({ roomId, date, startTime, endTime }),
  }),

  // ดึงรายการห้องทั้งหมด (สำหรับเลือกห้อง)
  getAllRooms: () => roomAPI.getAll(),
}

// Department APIs
export const departmentAPI = {
  getAll: () => apiClient('/departments'),
}

// Position APIs  
export const positionAPI = {
  getAll: () => apiClient('/positions/all'),
}

// Statistics APIs
export const statisticsAPI = {
  // สถิติการใช้ห้องประชุม (แสดงทุกห้องเรียงจากมากไปน้อย)
  getRoomUsage: async (params = {}) => {
    const searchParams = new URLSearchParams(params).toString()

    // ตรวจสอบ role เพื่อใช้ endpoint ที่ถูกต้อง
    const userRole = authUtils.getRoleFromToken()
    const isOfficer = userRole === 'officer' || userRole === 'admin' || userRole === 'executive'

    const endpoint = isOfficer
      ? `/protected/officer/reservations/statistics/room-usage${searchParams ? `?${searchParams}` : ''}`
      : `/protected/reservations/statistics/room-usage${searchParams ? `?${searchParams}` : ''}`

    debugLog.log(`🔍 [getRoomUsage] Role: ${userRole}, เรียก API: ${endpoint}`)
    debugLog.log(`🔍 [getRoomUsage] Token: ${localStorage.getItem('token') ? 'มี' : 'ไม่มี'}`)

    try {
      const result = await apiClient(endpoint)
      debugLog.log(`✅ [getRoomUsage] สำเร็จ:`, result)
      return result
    } catch (error) {
      debugLog.error(`❌ [getRoomUsage] ล้มเหลว:`, error)
      throw error
    }
  },

  // สถิติการจองตามคณะ
  getDepartmentStats: async (params = {}) => {
    const searchParams = new URLSearchParams(params).toString()

    // ตรวจสอบ role เพื่อใช้ endpoint ที่ถูกต้อง
    const userRole = authUtils.getRoleFromToken()
    const isOfficer = userRole === 'officer' || userRole === 'admin' || userRole === 'executive'

    const endpoint = isOfficer
      ? `/protected/officer/reservations/statistics/department-stats${searchParams ? `?${searchParams}` : ''}`
      : `/protected/reservations/statistics/department-stats${searchParams ? `?${searchParams}` : ''}`

    debugLog.log(`🔍 [getDepartmentStats] Role: ${userRole}, เรียก API: ${endpoint}`)
    debugLog.log(`🔍 [getDepartmentStats] Token: ${localStorage.getItem('token') ? 'มี' : 'ไม่มี'}`)

    try {
      const result = await apiClient(endpoint)
      debugLog.log(`✅ [getDepartmentStats] สำเร็จ:`, result)
      return result
    } catch (error) {
      debugLog.error(`❌ [getDepartmentStats] ล้มเหลว:`, error)
      throw error
    }
  },
}

// Admin APIs
export const adminAPI = {
  // จัดการผู้ใช้
  getUsers: () => apiClient('/admin/users'),
  updateUser: (id, userData) => apiClient(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  deleteUser: (id) => apiClient(`/admin/users/${id}`, {
    method: 'DELETE',
  }),

  // จัดการห้องประชุม
  createRoom: (roomData) => apiClient('/admin/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  }),
  updateRoom: (id, roomData) => apiClient(`/admin/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roomData),
  }),
  deleteRoom: (id) => apiClient(`/admin/rooms/${id}`, {
    method: 'DELETE',
  }),

  // สถิติและรายงาน
  getStats: () => apiClient('/admin/stats'),
  getReports: (params) => {
    const query = new URLSearchParams(params).toString()
    return apiClient(`/admin/reports?${query}`)
  },
}

// Executive APIs (สำหรับผู้บริหาร)
export const executiveAPI = {
  getDashboard: () => apiClient('/executive/dashboard'),
  getReports: (params) => {
    const query = new URLSearchParams(params).toString()
    return apiClient(`/executive/reports?${query}`)
  },
}

// Helper function สำหรับ SWR
const fetcher = (...args) => fetch(...args).then((res) => res.json())

// Utility functions
const authUtils = {
  // เก็บ token และข้อมูลผู้ใช้
  setAuth: (token, user) => {
    if (typeof window !== 'undefined') {
      try {
        const userString = JSON.stringify(user)
        const userSizeKB = Math.round(userString.length / 1024)

        console.log(`📊 User data size: ${userSizeKB} KB (${userString.length} chars)`)
        console.log('🔍 User data keys:', Object.keys(user))
        console.log('📋 User data sample (first 500 chars):', userString.substring(0, 500))

        // 🚨 EMERGENCY FIX: ถ้า profile_image เป็น binary data ให้ลบออก!
        if (user.profile_image && typeof user.profile_image === 'object' && user.profile_image[0] !== undefined) {
          console.log('⚠️ EMERGENCY FIX: Removing binary profile_image to prevent localStorage overflow')
          const cleanUser = { ...user }
          // สร้าง profile_image path จาก user ID
          const userId = cleanUser.user_id || cleanUser.officer_id || cleanUser.admin_id || cleanUser.executive_id
          cleanUser.profile_image = userId ? `/api/upload/profile-image/${userId}` : null

          // คำนวณขนาดใหม่
          const cleanUserString = JSON.stringify(cleanUser)
          const cleanUserSizeKB = Math.round(cleanUserString.length / 1024)
          console.log(`✅ EMERGENCY FIX: Cleaned user data size: ${cleanUserSizeKB} KB`)

          // ใช้ clean user แทน
          localStorage.setItem('token', token)
          localStorage.setItem('user', cleanUserString)
          console.log('✅ Auth data saved successfully (with emergency fix)')
          return
        }

        if (userSizeKB > 50) {
          console.warn(`⚠️ User data is large (${userSizeKB} KB). Consider reducing data size.`)
        }

        // ตรวจสอบ localStorage space ที่มีอยู่
        const totalStorage = JSON.stringify(localStorage).length
        console.log(`💾 Current localStorage usage: ${Math.round(totalStorage / 1024)} KB`)

        localStorage.setItem('token', token)
        localStorage.setItem('user', userString)

        console.log('✅ Auth data saved successfully')
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          // ถ้า localStorage เต็ม ให้ล้างทั้งหมดแล้วลองใหม่
          console.warn('localStorage is full, clearing all data...')
          localStorage.clear()
          try {
            const userString = JSON.stringify(user)
            const userSizeKB = Math.round(userString.length / 1024)
            console.log(`📊 User data size after clear: ${userSizeKB} KB`)

            localStorage.setItem('token', token)
            localStorage.setItem('user', userString)
            console.log('✅ Auth data saved successfully after clearing')
          } catch (retryError) {
            console.error('Failed to save auth data even after clearing localStorage:', retryError)
            // ลองเก็บเฉพาะข้อมูลสำคัญ
            const minimalUser = {
              user_id: user.user_id,
              officer_id: user.officer_id,
              admin_id: user.admin_id,
              executive_id: user.executive_id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              role: user.role,
              userTable: user.userTable,
              profile_image: user.profile_image // 🔥 เพิ่ม profile_image ด้วย!
            }
            try {
              localStorage.setItem('token', token)
              localStorage.setItem('user', JSON.stringify(minimalUser))
              console.log('✅ Saved minimal user data as fallback')
            } catch (finalError) {
              console.error('Failed to save even minimal user data:', finalError)
              throw finalError
            }
          }
        } else {
          console.error('Failed to save auth data:', error)
          throw error
        }
      }
    }
  },

  // ดึง token
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  },

  // ดึงข้อมูลผู้ใช้ปัจจุบัน
  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user')
      return user ? JSON.parse(user) : null
    }
    return null
  },

  // ดึงข้อมูลผู้ใช้ (alias สำหรับ getCurrentUser)
  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user')
      return user ? JSON.parse(user) : null
    }
    return null
  },

  // ดึง role จาก JWT token
  getRoleFromToken: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          // Decode JWT payload (base64)
          const payload = JSON.parse(atob(token.split('.')[1]))
          return payload.role
        } catch (error) {
          console.error('Error decoding token:', error)
          return null
        }
      }
    }
    return null
  },

  // ดึงข้อมูลผู้ใช้พร้อม role จาก token
  getUserWithRole: () => {
    if (typeof window !== 'undefined') {
      const user = authUtils.getUser()
      const roleFromToken = authUtils.getRoleFromToken()

      if (user && roleFromToken) {
        return {
          ...user,
          role: roleFromToken
        }
      }
      return user
    }
    return null
  },

  // ตรวจสอบว่า token หมดอายุหรือไม่
  isTokenExpired: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (!token) return true

      try {
        // Decode JWT payload (base64)
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000) // Current time in seconds

        // ตรวจสอบ exp field (expiration time)
        if (payload.exp && payload.exp < currentTime) {
          return true // Token หมดอายุแล้ว
        }

        return false // Token ยังไม่หมดอายุ
      } catch (error) {
        console.error('Error decoding token for expiry check:', error)
        return true // ถ้า decode ไม่ได้ถือว่าหมดอายุ
      }
    }
    return true
  },

  // ตรวจสอบว่า login อยู่หรือไม่ (รวมตรวจสอบ expiry)
  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (!token) return false

      // ตรวจสอบว่า token หมดอายุหรือไม่
      if (authUtils.isTokenExpired()) {
        // ถ้าหมดอายุให้หยุดการตรวจสอบและล้างข้อมูล
        authUtils.stopTokenExpiryCheck()
        authUtils.clearAuth()
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          authUtils.showExpiryModal()
        }
        return false
      }

      return true
    }
    return false
  },

  // ตรวจสอบสิทธิ์
  hasRole: (requiredRole) => {
    const user = authUtils.getCurrentUser()
    return user?.role === requiredRole
  },

  // ตรวจสอบว่าเป็นคณะเดียวกันหรือไม่
  isSameDepartment: (targetDepartment) => {
    const user = authUtils.getCurrentUser()
    return user?.department === targetDepartment
  },

  // Debug token information
  debugToken: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (!token) {
        debugLog.log('❌ No token found')
        return null
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        const isExpired = payload.exp && payload.exp < currentTime

        debugLog.log('🔍 Token Debug Info:')
        debugLog.log('- Token exists:', !!token)
        debugLog.log('- Issued at:', payload.iat ? new Date(payload.iat * 1000) : 'N/A')
        debugLog.log('- Expires at:', payload.exp ? new Date(payload.exp * 1000) : 'N/A')
        debugLog.log('- Current time:', new Date())
        debugLog.log('- Is expired:', isExpired)
        debugLog.log('- User ID:', payload.userId || payload.id)
        debugLog.log('- Role:', payload.role)
        debugLog.log('- Time left:', payload.exp ? Math.max(0, payload.exp - currentTime) + ' seconds' : 'N/A')

        return {
          isExpired,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
          timeLeft: payload.exp ? Math.max(0, payload.exp - currentTime) : 0,
          payload
        }
      } catch (error) {
        debugLog.error('❌ Error decoding token:', error)
        return null
      }
    }
    return null
  },

  // ลบข้อมูลการ login
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // หยุดการตรวจสอบ Token หมดอายุ
      authUtils.stopTokenExpiryCheck()
      // ลบ Modal ถ้ามี
      const modal = document.getElementById('token-expiry-modal')
      if (modal) modal.remove()
    }
  },

  // ลบข้อมูลการ login (สำหรับ manual logout)
  manualLogout: () => {
    if (typeof window !== 'undefined') {
      // ตั้ง flag ว่าเป็น manual logout
      window.isManualLogout = true

      // หยุดการตรวจสอบ Token ก่อน
      authUtils.stopTokenExpiryCheck()

      // ล้างข้อมูล
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // ลบ Modal ถ้ามี
      const modal = document.getElementById('token-expiry-modal')
      if (modal) modal.remove()

      // ล้าง flag หลังจาก 1 วินาที
      setTimeout(() => {
        delete window.isManualLogout
      }, 1000)
    }
  },

  // เพิ่มฟังก์ชันตรวจสอบ Token หมดอายุแบบอัตโนมัติ
  startTokenExpiryCheck: () => {
    if (typeof window !== 'undefined') {
      // ป้องกันการสร้าง interval ซ้ำ
      if (window.tokenExpiryInterval) {
        clearInterval(window.tokenExpiryInterval)
      }

      // ตรวจสอบทุก 30 วินาที
      const interval = setInterval(() => {
        // ตรวจสอบว่าอยู่ในหน้า login หรือไม่ - ถ้าอยู่แล้วหยุดการตรวจสอบ
        if (window.location.pathname === '/login' || window.location.pathname === '/register') {
          clearInterval(interval)
          delete window.tokenExpiryInterval
          return
        }

        if (authUtils.isTokenExpired()) {
          // ตรวจสอบว่าเป็น manual logout หรือไม่
          if (window.isManualLogout) {
            clearInterval(interval)
            delete window.tokenExpiryInterval
            return
          }

          // ล้าง interval ก่อน
          clearInterval(interval)
          delete window.tokenExpiryInterval

          // ล้างข้อมูล Auth
          authUtils.clearAuth()

          // แสดง Modal สวยๆ แทน alert()
          authUtils.showExpiryModal()
        }
      }, 30000) // ตรวจสอบทุก 30 วินาที

      // เก็บ interval ID ไว้ล้างทีหลัง
      window.tokenExpiryInterval = interval
    }
  },

  // แสดง Modal สวยๆ เมื่อ Token หมดอายุ
  showExpiryModal: () => {
    if (typeof window !== 'undefined') {
      // ตรวจสอบว่าอยู่ในหน้า login หรือไม่ - ถ้าอยู่แล้วไม่ต้องแสดง modal
      if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        return
      }

      // ป้องกันการสร้าง Modal ซ้ำ
      if (document.getElementById('token-expiry-modal')) return

      // สร้าง Modal HTML
      const modal = document.createElement('div')
      modal.id = 'token-expiry-modal'
      modal.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-out;
        ">
          <div style="
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.4s ease-out;
          ">
            <div style="font-size: 64px; margin-bottom: 20px;">⏰</div>
            <h2 style="
              color: #dc2626;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 16px;
              font-family: system-ui, -apple-system, sans-serif;
            ">เซสชันหมดอายุแล้ว</h2>
            <p style="
              color: #6b7280;
              font-size: 16px;
              margin-bottom: 30px;
              line-height: 1.5;
              font-family: system-ui, -apple-system, sans-serif;
            ">เพื่อความปลอดภัย กรุณาเข้าสู่ระบบใหม่อีกครั้ง</p>
            <button id="token-expiry-btn" style="
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              border: none;
              padding: 12px 32px;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              font-family: system-ui, -apple-system, sans-serif;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              🔐 เข้าสู่ระบบใหม่
            </button>
          </div>
        </div>
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateY(-20px) scale(0.95); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        </style>
      `

      // เพิ่ม Modal เข้า DOM
      document.body.appendChild(modal)

      // เพิ่ม Event Listener สำหรับปุ่ม
      document.getElementById('token-expiry-btn').addEventListener('click', () => {
        modal.remove()
        // Redirect ไป Login หลังจากปิด Modal
        setTimeout(() => {
          window.location.href = '/login'
        }, 200)
      })

      // Auto redirect หลัง 5 วินาที ถ้าไม่กดปุ่ม
      setTimeout(() => {
        if (document.getElementById('token-expiry-modal')) {
          modal.remove()
          window.location.href = '/login'
        }
      }, 5000)
    }
  },

  // หยุดการตรวจสอบ Token หมดอายุ
  stopTokenExpiryCheck: () => {
    if (typeof window !== 'undefined' && window.tokenExpiryInterval) {
      clearInterval(window.tokenExpiryInterval)
      delete window.tokenExpiryInterval
    }
  }
}
export { fetcher, apiClient, authUtils }
