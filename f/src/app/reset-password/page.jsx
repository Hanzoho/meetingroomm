'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import Footer from '@/components/layout/Footer'

const ResetPasswordPage = () => {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // ดึง token จาก URL parameters
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
      console.log('🔑 Token จาก URL:', tokenFromUrl.substring(0, 8) + '...')
    } else {
      toast.error('ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน')
      setTimeout(() => {
        router.push('/forgot-password')
      }, 2000)
    }
  }, [searchParams, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!token) {
      toast.error('ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน')
      return
    }

    if (!password || !confirmPassword) {
      toast.error('กรุณากรอกรหัสผ่านทั้งสองช่อง')
      return
    }

    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (password !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน')
      return
    }

    setLoading(true)
    
    try {
      console.log('🔄 ส่งคำขอรีเซ็ตรหัสผ่าน...')

      const response = await fetch(`/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token, 
          password 
        })
      })

      const data = await response.json()
      console.log('🔑 Reset Password API Response:', data)

      if (response.ok && data.success) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ', {
          description: data.message,
          duration: 5000
        })
        
        // Reset form
        setPassword('')
        setConfirmPassword('')
        
        // เปลี่ยนเส้นทางไปหน้า login หลังจาก 3 วินาที
        setTimeout(() => {
          router.push('/login')
        }, 3000)
        
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
      }

    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="container mx-auto px-4">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription className="text-center">
            กรอกรหัสผ่านใหม่ของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่านใหม่</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรอกรหัสผ่านใหม่"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">ข้อกำหนดรหัสผ่าน:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li className={password.length >= 6 ? 'text-green-600' : 'text-muted-foreground'}>
                  ความยาวอย่างน้อย 6 ตัวอักษร
                </li>
                <li className={password === confirmPassword && password ? 'text-green-600' : 'text-muted-foreground'}>
                  รหัสผ่านทั้งสองช่องตรงกัน
                </li>
              </ul>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !token || password.length < 6 || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  กำลังเปลี่ยนรหัสผ่าน...
                </>
              ) : (
                'เปลี่ยนรหัสผ่าน'
              )}
            </Button>
            
            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </form>
        </CardContent>
        </Card>
        </div>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default ResetPasswordPage