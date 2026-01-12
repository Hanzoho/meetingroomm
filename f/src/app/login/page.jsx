'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authAPI, authUtils } from '@/lib/fetchData'
import { debugLog } from '@/utils/debug'
import UniversalLoading from '@/components/loading/UniversalLoading'
import Footer from '@/components/layout/Footer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false) // เพิ่มสำหรับหน้าโหลดหลัง login สำเร็จ
  const [showPassword, setShowPassword] = useState(false)

  // Alert Dialog states
  const [showAlert, setShowAlert] = useState(false)
  const [alertErrors, setAlertErrors] = useState([])
  const [alertTitle, setAlertTitle] = useState('เข้าสู่ระบบไม่สำเร็จ')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setAlertErrors(['❌ กรุณากรอกอีเมลและรหัสผ่าน'])
      setAlertTitle('ข้อมูลไม่ครบถ้วน')
      setShowAlert(true)

      toast.error('❌ ข้อมูลไม่ครบถ้วน', {
        description: 'กรุณากรอกอีเมลและรหัสผ่าน',
        duration: 5000
      })
      return
    }

    setLoading(true)

    try {
      // ใช้ debug utility สำหรับ login attempt
      debugLog.loginAttempt(formData)

      // เรียก API login จริง
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
        // ลบ testExpiry ออก - ใช้ 1 ชั่วโมงปกติ
      })

      // เก็บ token และข้อมูลผู้ใช้
      authUtils.setAuth(response.token, response.user)
      
      // 🚀 เริ่มการตรวจสอบ Token หมดอายุอัตโนมัติทันทีหลัง Login
      authUtils.startTokenExpiryCheck()

      // แสดงข้อความสำเร็จ
      toast.success('✅ เข้าสู่ระบบสำเร็จ!', {
        description: `🎉 ยินดีต้อนรับกลับ ${response.user.first_name} ${response.user.last_name}`,
        duration: 5000
      })

      // เปิดหน้าโหลดเต็มจอ
      setLoginSuccess(true)

      // เปลี่ยนเส้นทางตาม Role
      const user = response.user
      console.log('User role from API:', user.role) // Debug log
      
      setTimeout(() => {
        switch (user.role) {
          case 'admin':
            router.push('/dashboard/admin')
            break
          case 'officer':
          case 'staff':
            router.push('/dashboard/officer')
            break
          case 'executive':
            router.push('/dashboard/executive')
            break
          default:
            router.push('/dashboard/user') // user ทั่วไป
        }
      }, 2000) // เพิ่มเวลาให้แสดงหน้าโหลด

    } catch (error) {
      // ลด log ซ้ำซ้อน - log เฉพาะใน development mode และไม่ใช่ credential error หรือ approval error
      if (process.env.NODE_ENV === 'development' && 
          !error.message.includes('Unauthorized') && 
          !error.message.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง') &&
          !error.message.includes('บัญชีของคุณรอการอนุมัติ') &&
          !error.message.includes('รอการอนุมัติ') &&
          !error.message.includes('pending')) {
        console.error('Login error:', error)
      }

      // จัดการ error message ให้เป็นมิตรกับผู้ใช้
      let errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'

      if (error.message) {
        if (error.message.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง') || 
            error.message.includes('Invalid credentials') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('Token expired') ||
            error.message.includes('401')) {
          errorMessage = '🚫 อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        } else if (error.message.includes('บัญชีของคุณรอการอนุมัติ') || error.message.includes('รอการอนุมัติ') || error.message.includes('pending')) {
          errorMessage = '⏳ กรุณารอการตรวจสอบการอนุมัติเข้าใช้งานระบบจากผู้ดูแลระบบ'
        } else if (error.message.includes('บัญชีถูกระงับ') || error.message.includes('Account suspended')) {
          errorMessage = '⚠️ บัญชีของคุณถูกระงับการใช้งาน'
        } else if (error.message.includes('บัญชียังไม่ได้รับการยืนยัน') || error.message.includes('Account not verified')) {
          errorMessage = '📧 บัญชียังไม่ได้รับการยืนยัน กรุณาตรวจสอบอีเมล'
        } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          errorMessage = '🌐 เกิดปัญหาการเชื่อมต่อ โปรดตรวจสอบอินเทอร์เน็ตและลองใหม่'
        } else if (error.message.includes('500')) {
          errorMessage = '🔧 เกิดปัญหาจากเซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง'
        } else {
          // สำหรับ error อื่นๆ ให้แสดงข้อความมาตรฐาน
          errorMessage = '🚫 อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        }
      }

      // แสดง error alert แบบ AlertDialog
      setAlertErrors([errorMessage])
      setAlertTitle('เข้าสู่ระบบไม่สำเร็จ')
      setShowAlert(true)

      // แสดง toast notification ด้วย
      toast.error('❌ เข้าสู่ระบบไม่สำเร็จ', {
        description: errorMessage,
        duration: 8000
      })
    } finally {
      setLoading(false)
    }
  }

  // แสดงหน้าโหลดเต็มจอหลัง login สำเร็จ
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="mb-8">
            <div className="text-5xl lg:text-7xl font-bold text-green-600 mb-3">
              🏢 RMU
            </div>
            <p className="text-xl lg:text-2xl text-gray-700 font-medium mb-2">
              ระบบจองห้องประชุม
            </p>
            <p className="text-sm lg:text-base text-gray-500 mt-1">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
          </div>
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 lg:h-20 lg:w-20 border-4 border-gray-200 border-t-green-600"></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 text-lg lg:text-xl font-medium">กำลังเข้าสู่ระบบ...</p>
            <p className="text-gray-500 text-sm lg:text-base">โปรดรอสักครู่</p>
          </div>
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* แก้ไขปัญหา text selection ไม่เห็น */}
      <style dangerouslySetInnerHTML={{
        __html: `
          * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
          
          *::selection {
            background-color: #3b82f6 !important;
            color: white !important;
          }
          
          *::-moz-selection {
            background-color: #3b82f6 !important;
            color: white !important;
          }
        `
      }} />
      
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden min-h-screen flex flex-col">
      {/* ปุ่มกลับหน้าแนะนำ - ย้ายมาอยู่มุมบนซ้าย */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/"
          className="inline-flex items-center text-green-600 hover:text-green-700 bg-white/80 hover:bg-white/95 px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-green-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับหน้าแนะนำ
        </Link>
      </div>

      {/* Background Pattern for Login */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Hexagon Patterns */}
        <div className="absolute top-16 left-16 w-20 h-20 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-green-400">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
          </svg>
        </div>
        <div className="absolute top-32 right-32 w-16 h-16 opacity-15">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-emerald-400">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
          </svg>
        </div>
        <div className="absolute bottom-24 left-24 w-24 h-24 opacity-25">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-teal-400">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
          </svg>
        </div>

        {/* Curved Lines */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 400">
            <path d="M0,200 Q200,0 400,200 Q200,400 0,200"
              fill="none"
              stroke="url(#gradient1)"
              strokeWidth="2" />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100% ">
                <stop offset="0%" stopColor="rgb(34, 1600, 94)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(16, 1000, 129)" stopOpacity="0.5" />  
              </linearGradient> 
            </defs>
          </svg>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-green-300/30 rounded-full animate-ping"></div>
        <div className="absolute top-3/4 right-1/4 w-4 h-4 bg-emerald-300/40 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/3 w-8 h-8 bg-teal-300/25 rounded-full"></div>

        {/* Abstract Shape */}
        <div className="absolute bottom-0 right-0 w-64 h-64 opacity-15">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <path d="M20,100 C20,60 60,20 100,20 C140,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 Z"
              fill="url(#gradient2)" />
            <defs>
              <radialGradient id="gradient2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Floating RMU Letters - More Visible */}
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 flex space-x-8 opacity-30 z-10">
          <div className="text-7xl font-extrabold text-orange-600 animate-bounce drop-shadow-lg" style={{ animationDelay: '0s', animationDuration: '2s' }}>
            R
          </div>
          <div className="text-7xl font-extrabold text-emerald-600 animate-bounce drop-shadow-lg" style={{ animationDelay: '0.3s', animationDuration: '2.2s' }}>
            M
          </div>
          <div className="text-7xl font-extrabold text-teal-600 animate-bounce drop-shadow-lg" style={{ animationDelay: '0.6s', animationDuration: '2.4s' }}>
            U
          </div>
        </div>

        {/* RMU on the sides */}
        <div className="absolute top-1/3 left-8 opacity-25">
          <div className="text-4xl font-bold text-orange-600  animate-pulse" style={{ animationDelay: '0s', animationDuration: '3s' }}>
            R
          </div>
        </div>
        <div className="absolute top-1/2 left-8 opacity-25">
          <div className="text-4xl font-bold text-emerald-400 animate-pulse" style={{ animationDelay: '1s', animationDuration: '3s' }}>
            M
          </div>
        </div>
        <div className="absolute top-2/3 left-8 opacity-25">
          <div className="text-4xl font-bold text-teal-600 animate-pulse" style={{ animationDelay: '2s', animationDuration: '3s' }}>
            U
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="container mx-auto px-4 relative z-10">        
          <Card className="mx-auto max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white -mx-6 -mt-6 mb-0 px-6 pt-6 pb-6">
            <CardTitle className="text-3xl text-center font-bold mb-2">
              🔐 เข้าสู่ระบบ
            </CardTitle>
            <p className="text-center text-green-100 text-base">
              ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-700 font-semibold text-base">
                  อีเมล <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  disabled={loading}
                  className="border-2 rounded-lg px-4 py-3 text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white border-gray-300 focus:border-green-500 focus:ring-green-200"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-700 font-semibold text-base">
                  รหัสผ่าน <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="รหัสผ่านของคุณ"
                    disabled={loading}
                    className="w-full border-2 rounded-lg px-4 py-3 pr-12 text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white border-gray-300 focus:border-green-500 focus:ring-green-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm text-green-600 hover:text-green-800 font-semibold hover:underline transition-colors duration-200">
                   {/* ลืมรหัสผ่าน? */}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  <span className="flex items-center">
                    🔐 เข้าสู่ระบบ
                  </span>
                )}
              </Button>

              <p className="text-center text-base text-gray-600">
                ยังไม่มีบัญชี?{' '}
                <Link href="/register" className="text-green-600 hover:text-green-800 font-semibold hover:underline transition-colors duration-200">
                  สมัครสมาชิก
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Error Alert Dialog */}
        <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
          <AlertDialogContent className="max-w-lg border-2 border-red-200 bg-white shadow-2xl">
            <AlertDialogHeader className="text-white p-6 -m-6 mb-6 rounded-t-lg bg-gradient-to-r from-red-500 to-red-600">
              <AlertDialogTitle className="text-2xl font-bold flex items-center text-white">
                <span className="mr-3 text-3xl">❌</span>
                {alertTitle}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription asChild>
              <div className="space-y-4 px-2">
                <p className="text-gray-700 text-base font-medium">
                  <span className="font-bold text-red-600">เกิดข้อผิดพลาด:</span>
                </p>
                <div className="border-l-4 p-4 rounded-lg bg-red-50 border-red-400">
                  <ul className="list-none space-y-2">
                    {alertErrors.map((error, index) => (
                      <li key={index} className="text-red-700 font-medium flex items-start">
                        <span className="text-red-500 mr-2 mt-0.5 font-bold">•</span>
                        <span>{error.replace('❌ ', '').replace('🚫 ', '').replace('⚠️ ', '').replace('📧 ', '').replace('🌐 ', '').replace('🔧 ', '').replace('❗ ', '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm text-blue-700">
                    <strong className="flex items-center mb-1">
                      <span className="mr-2">💡</span>
                      แนะนำ:
                    </strong>
                    กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter className="px-6 pb-6">
              <AlertDialogAction
                onClick={() => setShowAlert(false)}
                className="mx-auto px-8 py-3 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                ตกลง
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </main>
      
      {/* Footer */}
      <Footer />
      </div>
    </>
  )
}

export default Page