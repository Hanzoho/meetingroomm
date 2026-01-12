'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Footer from '@/components/layout/Footer'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('กรุณากรอกอีเมล')
      return
    }

    setLoading(true)
    
    try {
      console.log('🔄 ตรวจสอบอีเมลในระบบ:', email)

      const response = await fetch(`/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      console.log('📧 Forgot Password API Response:', data)

      if (response.ok && data.success && data.found) {
        // พบอีเมลในระบบ - ไปหน้ารีเซ็ตรหัสผ่าน
        toast.success('พบอีเมลในระบบ', {
          description: `สวัสดี ${data.user.name} กำลังนำคุณไปหน้ารีเซ็ตรหัสผ่าน`,
          duration: 3000
        })
        
        // Reset form
        setEmail('')
        
        // นำไปหน้ารีเซ็ตรหัสผ่านพร้อม token
        setTimeout(() => {
          router.push(`/reset-password?token=${data.reset_token}`)
        }, 1500)
        
      } else if (!data.success && !data.found) {
        // ไม่พบอีเมลในระบบ - แนะนำให้ลงทะเบียน
        toast.error('ไม่พบอีเมลในระบบ', {
          description: 'กรุณาลงทะเบียนใหม่หรือตรวจสอบอีเมลอีกครั้ง',
          duration: 5000,
          action: {
            label: 'ลงทะเบียน',
            onClick: () => router.push('/register')
          }
        })
      } else {
        toast.error(data.message || 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล')
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
          <CardTitle className="text-2xl text-center">ตรวจสอบอีเมล</CardTitle>
          <CardDescription className="text-center">
            กรอกอีเมลของคุณเพื่อตรวจสอบว่ามีในระบบและดำเนินการรีเซ็ตรหัสผ่าน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  กำลังตรวจสอบ...
                </>
              ) : (
                'ตรวจสอบอีเมล'
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

export default ForgotPasswordPage