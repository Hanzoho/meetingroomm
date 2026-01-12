'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

// สมมติว่านี่คือข้อมูลผู้ใช้ที่ล็อกอินอยู่
const currentUser = {
  name: 'พนักงานทดสอบ',
  email: 'staff.test@example.com',
}

const StaffProfilePage = () => {
  const [name, setName] = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password && password !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน')
      return
    }

    // ในแอปพลิเคชันจริง ส่วนนี้จะส่ง request ไปยัง API เพื่ออัปเดตข้อมูล
    console.log('Updating profile:', { name, email })
    if (password) {
      console.log('Updating password.')
    }

    toast.success('บันทึกข้อมูลโปรไฟล์สำเร็จ!')
    // รีเซ็ตรหัสผ่านหลังบันทึก
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">จัดการโปรไฟล์</h1>
      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>โปรไฟล์ของฉัน</CardTitle>
            <CardDescription>
              จัดการข้อมูลส่วนตัวและข้อมูลความปลอดภัยของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">ข้อมูลส่วนตัว</h3>
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">ความปลอดภัย</h3>
              <div className="space-y-2">
                <Label htmlFor="password">
                  รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="ml-auto">
              บันทึกการเปลี่ยนแปลง
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

export default StaffProfilePage