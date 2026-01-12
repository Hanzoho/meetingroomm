'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authAPI } from '@/lib/fetchData'
import { AddressSelector } from '@/components/AddressSelector'
import Footer from '@/components/layout/Footer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Custom CSS to fix SelectValue placeholder color
const selectPlaceholderStyles = `
  [data-placeholder="dark"] span[data-placeholder] {
    color: #374151 !important;
    opacity: 1 !important;
  }
  [data-placeholder="dark"] [data-radix-select-value] {
    color: #374151 !important;
  }
  [data-placeholder="dark"] [data-radix-select-value][data-placeholder] {
    color: #374151 !important;
  }
`

const RegisterPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Alert Dialog states
  const [showValidationAlert, setShowValidationAlert] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [alertTitle, setAlertTitle] = useState('ข้อมูลไม่ครบถ้วน')
  const [alertType, setAlertType] = useState('validation') // 'validation', 'error', or 'success'

  // Email suggestions state
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    zip_code: '',
    position: '',
    department: '',
    // Address fields
    address: {
      province: null,
      district: null,
      subdistrict: null,
    }
  })

  const [formErrors, setFormErrors] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Force re-render when formErrors changes
  useEffect(() => {
    console.log('FormErrors updated:', formErrors)
  }, [formErrors])

  // ข้อมูลตำแหน่งใหม่ - ลดความซับซ้อน
  const positions = {
    general: {
      label: '👤 บุคลากรทั่วไป',
      options: ['บุคลากร/อาจารย์ มหาวิทยาลัยราชภัฏมหาสารคาม', 'อื่นๆ']
    },
    executives: {
      label: '👨‍💼 ผู้บริหาร',
      options: [
        'ผู้บริหาร'
      ]
    },
    officers: {
      label: '👨‍💻 เจ้าหน้าที่ดูแลห้องประชุม',
      options: [
        'เจ้าหน้าที่ดูแลห้องประชุม'
      ]
    }
  }

  // ข้อมูลหน่วยงานทั้งหมด 28 หน่วยงาน
  const departments = {
    faculties: {
      label: '🎓 คณะต่างๆ',
      options: [
        'คณะวิทยาศาสตร์ฯ',
        'คณะครุศาสตร์',
        'คณะวิทยาการจัดการ',
        'คณะมนุษยศาสตร์ฯ',
        'คณะเทคโนโลยีการเกษตร',
        'คณะรัฐศาสตร์ฯ',
        'คณะนิติศาสตร์',
        'คณะวิศวกรรมศาสตร์'
      ]
    },
    divisions: {
      label: '🏢 กองและศูนย์ต่างๆ',
      options: [
        'สำนักงานอธิการบดี',
        'กองกลาง',
        'กองคลัง',
        'กองนโยบายและแผน',
        'กองบริหารงานบุคคล',
        'กองพัฒนานักศึกษา',
        'ศูนย์สหกิจศึกษาและพัฒนอาชีพ',
        'ศูนย์เทคโนโลยีดิจิทัลและนวัตกรรม'
      ]
    },
    offices: {
      label: '📚 สำนักต่างๆ',
      options: [
        'สถาบันวิจัยและพัฒนา',
        'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ',
        'สำนักศิลปะและวัฒนธรรม',
        'สำนักส่งเสริมวิชาการและงานทะเบียน'
      ]
    },
    others: {
      label: '🏛️ หน่วยงานอื่นๆ',
      options: [
        'งานประชาสัมพันธ์มหาวิทยาลัยราชภัฏมหาสารคาม',
        'สภาวิชาการ',
        'สภามหาวิทยาลัยราชภัฏมหาสารคาม',
        'หน่วยตรวจสอบภายใน'
      ]
    }
  }

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))

    // ล้าง error message เมื่อ user เริ่มแก้ไข
    if (formErrors[id]) {
      setFormErrors(prev => ({
        ...prev,
        [id]: null
      }))
    }

    // จัดการ email suggestions
    if (id === 'email') {
      // แสดง suggestions หากยังไม่ครบ format อีเมล
      if (value && (
        (value.length > 0 && !value.includes('@')) ||
        (value.includes('@') && !value.includes('.'))
      )) {
        setShowEmailSuggestions(true)
      } else {
        setShowEmailSuggestions(false)
      }
    }
  }

  // Handle address changes
  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData
    }))

    // ล้าง address error messages
    if (formErrors.province || formErrors.district || formErrors.subdistrict) {
      setFormErrors(prev => ({
        ...prev,
        province: null,
        district: null,
        subdistrict: null
      }))
    }
  }

  // Handle zip code auto-fill from subdistrict
  const handleZipCodeChange = (zipCode) => {
    setFormData(prev => ({
      ...prev,
      zip_code: zipCode
    }))

    // ล้าง zip_code error
    if (formErrors.zip_code) {
      setFormErrors(prev => ({
        ...prev,
        zip_code: null
      }))
    }
  }

  // จัดการ email suggestions
  const handleEmailSuggestion = (suggestion) => {
    const currentEmail = formData.email
    const atIndex = currentEmail.lastIndexOf('@')

    if (atIndex > 0) {
      // ถ้ามี @ แล้ว ให้แทนที่ส่วนหลัง @
      const username = currentEmail.substring(0, atIndex)
      setFormData(prev => ({
        ...prev,
        email: username + suggestion
      }))
    } else if (currentEmail.length > 0) {
      // ถ้ายังไม่มี @ ให้เพิ่ม suggestion
      setFormData(prev => ({
        ...prev,
        email: currentEmail + suggestion
      }))
    }

    // ปิด suggestions dropdown
    setShowEmailSuggestions(false)

    // Focus กลับไปที่ input field และไม่ให้มีการ select text
    setTimeout(() => {
      const emailInput = document.getElementById('email')
      if (emailInput) {
        emailInput.focus()
        // ไม่ให้ select text โดยตั้ง cursor ไปที่ท้ายสุด (แก้ไขให้รองรับ input type="email")
        try {
          emailInput.setSelectionRange(emailInput.value.length, emailInput.value.length)
        } catch (error) {
          // ถ้า setSelectionRange ใช้ไม่ได้ (เช่น input type="email" ในบางบราวเซอร์)
          // ใช้วิธี blur แล้ว focus ใหม่แทน
          emailInput.blur()
          emailInput.focus()
        }
      }
    }, 10)
  }

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // ล้าง error message เมื่อ user เริ่มเลือกใหม่
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }

    // ไม่รีเซ็ต department เมื่อเปลี่ยนตำแหน่ง เพื่อให้ user สามารถเลือกได้อิสระ
  }

  // ฟังก์ชันตรวจสอบว่าต้องเลือก department หรือไม่ - ตอนนี้ทุกคนต้องเลือก
  const needsDepartmentSelection = () => {
    // ทุกคนต้องเลือกหน่วยงาน เพราะหน่วยงานกับตำแหน่งแยกกัน
    return true
  }

  // Validation ฝั่ง Client
  const validateForm = () => {
    const errors = []

    // ตรวจสอบฟิลด์บังคับ
    if (!formData.first_name.trim()) {
      errors.push('❌ กรุณากรอกชื่อจริง')
    }

    if (!formData.last_name.trim()) {
      errors.push('❌ กรุณากรอกนามสกุล')
    }

    // ตรวจสอบอีเมล
    if (!formData.email.trim()) {
      errors.push('❌ กรุณากรอกอีเมล')
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.push('❌ รูปแบบอีเมลไม่ถูกต้อง')
      }

      if (formData.email.length > 255) {
        errors.push('❌ อีเมลต้องไม่เกิน 255 ตัวอักษร')
      }
    }

    // ตรวจสอบรหัสผ่าน
    if (!formData.password) {
      errors.push('❌ กรุณากรอกรหัสผ่าน')
    } else {
      if (formData.password.length < 8) {
        errors.push('❌ รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      }

      // ตรวจสอบรหัสผ่านมีทั้งตัวอักษรและตัวเลข
      const hasLetter = /[a-zA-Z]/.test(formData.password)
      const hasNumber = /[0-9]/.test(formData.password)
      if (!hasLetter || !hasNumber) {
        errors.push('❌ รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข')
      }
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('❌ รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน')
    }



    // ตรวจสอบรหัสไปรษณีย์ (ถ้ามี)
    if (formData.zip_code.trim()) {
      const zipCodeRegex = /^[0-9]{5}$/
      if (!zipCodeRegex.test(formData.zip_code)) {
        errors.push('❌ รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก')
      }
    }

    // ตรวจสอบตำแหน่ง
    if (!formData.position || formData.position === '') {
      errors.push('❌ กรุณาเลือกตำแหน่ง')
    }

    // ตรวจสอบหน่วยงาน - ทุกคนต้องเลือก
    if (!formData.department || formData.department === '') {
      errors.push('❌ กรุณาเลือกหน่วยงานที่สังกัด')
    }

    // แสดง errors ทั้งหมดพร้อมกัน
    if (errors.length > 0) {
      // Set specific field errors
      const newFormErrors = {}

      if (!formData.first_name.trim()) newFormErrors.first_name = 'กรุณากรอกชื่อจริง'
      if (!formData.last_name.trim()) newFormErrors.last_name = 'กรุณากรอกนามสกุล'
      if (!formData.email.trim()) {
        newFormErrors.email = 'กรุณากรอกอีเมล'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newFormErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
      }
      if (!formData.password) {
        newFormErrors.password = 'กรุณากรอกรหัสผ่าน'
      } else if (formData.password.length < 8) {
        newFormErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      } else {
        const hasLetter = /[a-zA-Z]/.test(formData.password)
        const hasNumber = /[0-9]/.test(formData.password)
        if (!hasLetter || !hasNumber) {
          newFormErrors.password = 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข'
        }
      }
      if (!formData.confirmPassword) {
        newFormErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน'
      } else if (formData.password !== formData.confirmPassword) {
        newFormErrors.confirmPassword = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'
      }

      if (formData.zip_code.trim() && !/^[0-9]{5}$/.test(formData.zip_code)) {
        newFormErrors.zip_code = 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'
      }
      if (!formData.position || formData.position === '') {
        newFormErrors.position = 'กรุณาเลือกตำแหน่ง'
      }
      if (!formData.department || formData.department === '') {
        newFormErrors.department = 'กรุณาเลือกหน่วยงาน'
      }

      setFormErrors(newFormErrors)

      console.log('Form Errors Set:', newFormErrors) // Debug log
      console.log('Form Data:', formData) // Debug form data

      // Force re-render by updating submitAttempted state
      setSubmitAttempted(true)

      // แสดง Validation Alert Dialog แทน custom DOM element
      setValidationErrors(errors)
      setAlertTitle('ข้อมูลไม่ครบถ้วน')
      setAlertType('validation')
      setShowValidationAlert(true)

      // แสดง toast notification ด้วย
      toast.error('❌ ข้อมูลไม่ครบถ้วน', {
        description: `พบข้อผิดพลาด ${errors.length} รายการ กรุณาตรวจสอบข้อมูล`,
        duration: 8000
      })

      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation ฝั่ง Client
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Prepare data สำหรับ Backend API ตาม FINAL-REGISTER-GUIDE
      const registerData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        zip_code: formData.zip_code.trim() || undefined, // Optional field
        position: formData.position,
        department: formData.department, // ทุกคนต้องมีหน่วยงาน
        // Address data - ถ้ามีการเลือกจะส่ง IDs ไปด้วย
        province_id: formData.address.province?.province_id || undefined,
        district_id: formData.address.district?.district_id || undefined,
        subdistrict_id: formData.address.subdistrict?.subdistrict_id || undefined,
      }

      // console.log('Sending registration data:', registerData) // Debug log

      // เรียก API /auth/register
      const result = await authAPI.register(registerData)

      // console.log('Registration result:', result) // Debug log

      if (result.success) {
        // แสดง success alert แบบ AlertDialog
        setValidationErrors([])
        setAlertTitle('สมัครสมาชิกสำเร็จ')
        setAlertType('success')
        setShowValidationAlert(true)

        // แสดง toast notification ด้วย
        toast.success('สมัครสมาชิกสำเร็จ', {
          description: `กรุณารอการอนุมัติเข้าใช้งานระบบจากผู้ดูแลระบบ`,
          duration: 7000
        })

        // เด้งไปหน้า login หลังจาก 3 วินาที
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        // แสดง error alert แบบ AlertDialog แทน
        const errorMessage = result.message || result.error || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'


        setValidationErrors([errorMessage])
        setAlertTitle('การสมัครสมาชิกล้มเหลว')
        setAlertType('error')
        setShowValidationAlert(true)

        // แสดง toast notification ด้วย
        toast.error('❌ การสมัครสมาชิกล้มเหลว', {
          description: errorMessage,
          duration: 8000
        })
      }
    } catch (error) {
      // ปิด console.error ที่ไม่จำเป็น - แสดงแค่ UI Alert
      // console.error('Registration error:', error)

      // จัดการ error message ที่ได้จาก API
      let errorMessage = 'ไม่สามารถสมัครสมาชิกได้ โปรดลองใหม่อีกครั้ง'

      if (error.message) {
        // ตรวจสอบ error message ที่เป็นภาษาไทยและภาษาอังกฤษ
        if (error.message.includes('อีเมลนี้ถูกใช้งานแล้ว') || error.message.includes('email already exists')) {
          errorMessage = '🚫 อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'

        } else if (error.message.includes('รูปแบบอีเมลไม่ถูกต้อง') || error.message.includes('invalid email')) {
          errorMessage = '📧 รูปแบบอีเมลไม่ถูกต้อง'
        } else if (error.message.includes('รหัสผ่าน') || error.message.includes('password')) {
          errorMessage = '🔒 รหัสผ่านไม่ตรงตามเงื่อนไข (ต้องมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข)'
        } else if (error.message.includes('ตำแหน่ง') || error.message.includes('position')) {
          errorMessage = '💼 ตำแหน่งที่เลือกไม่ถูกต้อง'
        } else if (error.message.includes('หน่วยงาน') || error.message.includes('department')) {
          errorMessage = '🏢 หน่วยงานที่เลือกไม่ถูกต้อง'

        } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
          errorMessage = '🌐 เกิดปัญหาการเชื่อมต่อ โปรดตรวจสอบอินเทอร์เน็ตและลองใหม่'
        } else if (error.message.includes('500')) {
          errorMessage = '🔧 เกิดปัญหาจากเซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง'
        } else {
          errorMessage = `❗ ${error.message}`
        }
      }

      // แสดง error alert แบบ AlertDialog แทน
      setValidationErrors([errorMessage])
      setAlertTitle('เกิดข้อผิดพลาด')
      setAlertType('error')
      setShowValidationAlert(true)

      // แสดง toast notification ด้วย
      toast.error('❌ เกิดข้อผิดพลาด', {
        description: errorMessage,
        duration: 10000,
        action: {
          label: "ลองอีกครั้ง",
          onClick: () => {
            // Reset form errors
            setFormErrors({})
            setSubmitAttempted(false)
          }
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Custom CSS for Select placeholder and Password input - Chrome compatible */}
      <style dangerouslySetInnerHTML={{
        __html: `
          [data-placeholder="dark"] [data-radix-select-value] {
            color: #374151 !important;
            opacity: 1 !important;
          }
          [data-placeholder="dark"] [data-radix-select-value][data-placeholder] {
            color: #374151 !important;
            opacity: 1 !important;
          }
          [data-placeholder="dark"] span[data-placeholder] {
            color: #374151 !important;
            opacity: 1 !important;
          }
          [data-placeholder="dark"] .lucide-chevron-down + span {
            color: #374151 !important;
            opacity: 1 !important;
          }
          [data-placeholder="dark"] span[data-slot="select-value"] {
            color: #374151 !important;
            opacity: 1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.5 !important;
            display: block !important;
          }
          [data-placeholder="dark"].data-\\[placeholder\\]\\:text-muted-foreground {
            color: #374151 !important;
          }
          [data-placeholder="dark"] [data-slot="select-value"] {
            color: #374151 !important;
            opacity: 1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.5 !important;
            display: block !important;
          }
          /* สำหรับ SelectTrigger ให้มีความสูงปกติเหมือน input อื่นๆ */
          [data-placeholder="dark"] {
            height: 48px !important;
            min-height: 48px !important;
            max-height: 48px !important;
            align-items: center !important;
            padding-top: 12px !important;
            padding-bottom: 12px !important;
          }
          [data-placeholder="dark"] .lucide-chevron-down {
            margin-top: 4px !important;
            align-self: flex-start !important;
          }
          
          /* ซ่อนปุ่มตาของ browser เพื่อใช้แค่ปุ่มที่เราสร้างเอง */
          input[type="password"]::-ms-reveal,
          input[type="password"]::-ms-clear {
            display: none !important;
          }
          
          input[type="password"]::-webkit-credentials-auto-fill-button,
          input[type="password"]::-webkit-strong-password-auto-fill-button {
            display: none !important;
          }
          
          /* แก้ไขปัญหา text selection ไม่เห็น */
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
        {/* Background Pattern for Register */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Circles */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-300/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-emerald-200/40 to-teal-300/30 rounded-full animate-bounce"></div>
          <div className="absolute bottom-32 left-20 w-40 h-40 bg-gradient-to-br from-teal-200/25 to-green-300/20 rounded-full"></div>
          <div className="absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-br from-green-300/35 to-emerald-200/25 rounded-full animate-pulse"></div>

          {/* Geometric Shapes */}
          <div className="absolute top-60 left-1/3 w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-green-400/15 transform rotate-45"></div>
          <div className="absolute bottom-60 right-1/3 w-20 h-20 bg-gradient-to-br from-teal-400/25 to-emerald-400/20 transform rotate-12"></div>

          {/* Dotted Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="w-full h-full" style={{
              backgroundImage: `radial-gradient(circle, rgba(34, 197, 94, 0.15) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          {/* Wave Pattern */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-green-100/40 to-transparent">
            <svg className="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
                fill="rgba(34, 197, 94, 0.1)"></path>
            </svg>
          </div>

          {/* Floating RMU Letters - Different Style for Register */}
          <div className="absolute top-32 right-16 flex flex-col space-y-4 opacity-20">
            <div className="text-5xl font-extrabold text-green-600 animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.8s' }}>
              R
            </div>
            <div className="text-5xl font-extrabold text-emerald-600 animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '2s' }}>
              M
            </div>
            <div className="text-5xl font-extrabold text-teal-600 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '2.2s' }}>
              U
            </div>
          </div>

          {/* RMU in center with different animation */}
          <div className="absolute top-1/2 left-16 transform -translate-y-1/2 flex space-x-3 opacity-15">
            <div className="text-4xl font-bold text-green-500 animate-pulse" style={{ animationDelay: '0s', animationDuration: '3s' }}>
              R
            </div>
            <div className="text-4xl font-bold text-emerald-500 animate-pulse" style={{ animationDelay: '1s', animationDuration: '3s' }}>
              M
            </div>
            <div className="text-4xl font-bold text-teal-500 animate-pulse" style={{ animationDelay: '2s', animationDuration: '3s' }}>
              U
            </div>
          </div>

          {/* Small RMU scattered */}
          <div className="absolute top-80 left-1/3 opacity-25">
            <div className="text-2xl font-bold text-green-400 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '2.5s' }}>
              RMU
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center py-4 sm:py-8">
          <div className="container mx-auto px-2 sm:px-4 relative z-10 w-full">
            {/* ปุ่มกลับหน้าแนะนำ */}
            <div className="mb-4 sm:mb-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center text-green-600 hover:text-green-700 bg-white/70 hover:bg-white/90 px-3 sm:px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                กลับหน้าแนะนำ
              </Link>
            </div>

            <Card className="mx-auto max-w-4xl shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white -mx-3 sm:-mx-6 -mt-3 sm:-mt-6 mb-0 px-3 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6">
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl text-center font-bold mb-2">
                  🎓 สมัครสมาชิก
                </CardTitle>
                <p className="text-center text-green-100 text-sm sm:text-base lg:text-lg">
                  ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8" noValidate>

                  {/* ข้อมูลส่วนตัว */}
                  <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 sm:p-6 lg:p-8 rounded-xl border-l-4 border-green-500 shadow-lg">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 flex items-center">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mr-2 sm:mr-3 text-sm sm:text-lg">📋</span>
                      ข้อมูลส่วนตัว
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="first_name" className="text-gray-700 font-semibold text-sm sm:text-base">
                          ชื่อจริง <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="first_name"
                          type="text"
                          placeholder="ชื่อจริง"
                          value={formData.first_name}
                          onChange={handleChange}
                          disabled={loading}
                          className={`border-2 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white w-full ${formErrors.first_name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-green-500 focus:ring-green-200'
                            }`}
                        />
                        {formErrors.first_name && (
                          <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {formErrors.first_name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="last_name" className="text-gray-700 font-semibold text-sm sm:text-base">
                          นามสกุล <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="last_name"
                          type="text"
                          placeholder="นามสกุล"
                          value={formData.last_name}
                          onChange={handleChange}
                          disabled={loading}
                          className={`border-2 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white w-full ${formErrors.last_name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                            }`}
                        />
                        {formErrors.last_name && (
                          <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {formErrors.last_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      <Label htmlFor="email" className="text-gray-700 font-semibold text-sm sm:text-base">
                        อีเมล <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          onFocus={() => {
                            // แสดง suggestions เมื่อ focus ถ้าอีเมลยังไม่สมบูรณ์
                            if (formData.email && (
                              (formData.email.length > 0 && !formData.email.includes('@')) ||
                              (formData.email.includes('@') && !formData.email.includes('.'))
                            )) {
                              setShowEmailSuggestions(true)
                            }
                          }}
                          onBlur={() => {
                            // ปิด suggestions เมื่อ blur (รอหน่อยเผื่อมีการคลิกที่ suggestion)
                            setTimeout(() => setShowEmailSuggestions(false), 150)
                          }}
                          disabled={loading}
                          autoComplete="email"
                          className={`w-full border-2 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white ${formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                            }`}
                        />
                        {formErrors.email && (
                          <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {formErrors.email}
                          </p>
                        )}

                        {/* Email Suggestions Dropdown */}
                        {showEmailSuggestions && formData.email && formData.email.length > 0 && !formData.email.includes('@') && (
                          <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-32 sm:max-h-48 overflow-y-auto">
                            <div className="py-1">
                              {['@gmail.com', '@hotmail.com', '@yahoo.com', '@outlook.com', '@live.com', '@icloud.com', '@student.rmu.ac.th', '@rmu.ac.th'].map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleEmailSuggestion(suggestion)
                                  }}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-base text-gray-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                                >
                                  <span className="font-medium text-blue-600">{formData.email}</span>
                                  <span className="text-gray-600">{suggestion}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show domain suggestions when user types @ */}
                        {showEmailSuggestions && formData.email && formData.email.includes('@') && !formData.email.includes('.') && (
                          <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            <div className="py-1">
                              {['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com', 'icloud.com', 'student.rmu.ac.th', 'rmu.ac.th'].map((domain) => {
                                const atIndex = formData.email.lastIndexOf('@')
                                const username = formData.email.substring(0, atIndex)
                                return (
                                  <button
                                    key={domain}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleEmailSuggestion('@' + domain)
                                    }}
                                    className="w-full px-4 py-3 text-left text-base text-gray-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                                  >
                                    <span className="font-medium text-blue-600">{username}</span>
                                    <span className="text-gray-600">@{domain}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-3">
                        <Label htmlFor="password" className="text-gray-700 font-semibold text-base">
                          รหัสผ่าน <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            className={`w-full border-2 rounded-lg px-4 py-3 pr-12 text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white ${formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                              }`}
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
                        {formErrors.password && (
                          <p className="text-red-500 text-sm mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {formErrors.password}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="confirmPassword" className="text-gray-700 font-semibold text-base">
                          ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="ยืนยันรหัสผ่าน"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            className={`w-full border-2 rounded-lg px-4 py-3 pr-12 text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-white ${formErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                              }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:text-gray-600 transition-colors duration-200"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {formErrors.confirmPassword && (
                          <p className="text-red-500 text-sm mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {formErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>



                    {/* Address Selection */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">📍</span>
                        ที่อยู่
                      </h4>

                      <AddressSelector
                        value={formData.address}
                        onChange={handleAddressChange}
                        disabled={loading}
                        required={false}
                        errors={{
                          province: formErrors.province,
                          district: formErrors.district,
                          subdistrict: formErrors.subdistrict
                        }}
                        onZipCodeChange={handleZipCodeChange}
                      />

                      {/* รหัสไปรษณีย์ */}
                      <div className="space-y-3 max-w-xs">
                        <Label htmlFor="zip_code" className="text-gray-700 font-semibold text-base">
                          รหัสไปรษณีย์
                        </Label>
                        <Input
                          id="zip_code"
                          type="text"
                          placeholder="จะถูกเติมอัตโนมัติเมื่อเลือกตำบล"
                          pattern="[0-9]{5}"
                          maxLength="5"
                          value={formData.zip_code}
                          onChange={handleChange}
                          disabled={loading}
                          readOnly
                          className={`w-full border-2 rounded-lg px-4 py-3 text-base text-gray-800 font-medium placeholder:text-gray-400 focus:ring-2 transition-all duration-200 bg-gray-50 ${formErrors.zip_code ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                            }`}
                        />
                        {formErrors.zip_code && (
                          <p className="text-red-500 text-sm mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            {formErrors.zip_code}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ตำแหน่งและหน่วยงาน - ย้ายมาอยู่ในส่วนเดียวกัน */}
                    <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
                      <h4 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800 flex items-center">
                        <span className="bg-indigo-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mr-2 text-xs sm:text-sm">🏢</span>
                        ตำแหน่งและหน่วยงาน
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2 sm:space-y-3">
                          <Label htmlFor="position" className="text-gray-700 font-semibold text-sm sm:text-base">
                            ตำแหน่ง <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.position}
                            onValueChange={(value) => handleSelectChange('position', value)}
                            disabled={loading}
                          >
                            <SelectTrigger className={`w-full border-2 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium focus:ring-2 transition-all duration-200 bg-white shadow-sm hover:shadow-md ${formErrors.position ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-indigo-200'
                              }`} data-placeholder="dark">
                              <SelectValue placeholder="เลือกตำแหน่ง" className="!text-gray-800 font-medium" style={{ color: '#374151 !important' }} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 sm:max-h-80 bg-white border border-gray-300 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-sm">
                              {/* บุคลากรทั่วไป */}
                              <div className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center gap-2">
                                <span>👤</span>
                                <span>บุคลากรทั่วไป</span>
                              </div>
                              {positions.general.options.map((position, index) => (
                                <SelectItem
                                  key={`general-${index}`}
                                  value={position}
                                  className="py-2 sm:py-3 px-3 sm:px-4 hover:bg-blue-50 focus:bg-blue-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed text-xs sm:text-sm cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="block leading-4 sm:leading-5 text-gray-800 font-medium">{position}</span>
                                </SelectItem>
                              ))}

                              {/* ผู้บริหาร */}
                              <div className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-purple-700 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 mt-1 flex items-center gap-2">
                                <span>👨‍💼</span>
                                <span>ผู้บริหาร</span>
                              </div>
                              {positions.executives.options.map((position, index) => (
                                <SelectItem
                                  key={`executives-${index}`}
                                  value={position}
                                  className="py-2 sm:py-3 px-3 sm:px-4 hover:bg-purple-50 focus:bg-purple-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed text-xs sm:text-sm cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="block leading-4 sm:leading-5 text-gray-800 font-medium">{position}</span>
                                </SelectItem>
                              ))}

                              {/* เจ้าหน้าที่ */}
                              <div className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-green-700 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 mt-1 flex items-center gap-2">
                                <span>👨‍💻</span>
                                <span>เจ้าหน้าที่ดูแลห้องประชุม</span>
                              </div>
                              {positions.officers.options.map((position, index) => (
                                <SelectItem
                                  key={`officers-${index}`}
                                  value={position}
                                  className="py-3 px-4 hover:bg-green-50 focus:bg-green-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed text-sm cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="block leading-5 text-gray-800 font-medium">{position}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.position && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <span className="mr-1">⚠️</span>
                              {formErrors.position}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="department" className="text-gray-700 font-semibold text-base">
                            หน่วยงานที่สังกัด <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.department}
                            onValueChange={(value) => handleSelectChange('department', value)}
                            disabled={loading}
                          >
                            <SelectTrigger className={`w-full border-2 rounded-lg px-4 py-3 text-base font-medium focus:ring-2 transition-all duration-200 bg-white shadow-sm hover:shadow-md ${formErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-indigo-200'
                              }`} data-placeholder="dark">
                              <SelectValue placeholder="เลือกหน่วยงานที่สังกัด" className="!text-gray-800 font-medium" style={{ color: '#374151 !important' }} />
                            </SelectTrigger>
                            <SelectContent className="max-h-80 bg-white border border-gray-300 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-sm">
                              {/* คณะต่างๆ */}
                              <div className="px-4 py-3 text-sm font-bold text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center gap-2">
                                <span>🎓</span>
                                <span>คณะต่างๆ</span>
                              </div>
                              {departments.faculties.options.map((dept, index) => (
                                <SelectItem
                                  key={`faculties-${index}`}
                                  value={dept}
                                  className="py-3 px-4 hover:bg-blue-50 focus:bg-blue-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed text-sm cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="block leading-5 text-gray-800 font-medium">{dept}</span>
                                </SelectItem>
                              ))}

                              {/* กองและศูนย์ต่างๆ */}
                              <div className="px-4 py-3 text-sm font-bold text-orange-700 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 mt-1 flex items-center gap-2">
                                <span>🏢</span>
                                <span>กองและศูนย์ต่างๆ</span>
                              </div>
                              {departments.divisions.options.map((dept, index) => (
                                <SelectItem
                                  key={`divisions-${index}`}
                                  value={dept}
                                  className="py-3 px-4 hover:bg-orange-50 focus:bg-orange-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed text-sm cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="block leading-5 text-gray-800 font-medium">{dept}</span>
                                </SelectItem>
                              ))}

                              {/* สำนักต่างๆ */}
                              <div className="px-4 py-3 text-sm font-bold text-green-700 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 mt-1 flex items-center gap-2">
                                <span>📚</span>
                                <span>สำนักต่างๆ</span>
                              </div>
                              {departments.offices.options.map((dept, index) => (
                                <SelectItem
                                  key={`offices-${index}`}
                                  value={dept}
                                  className="py-3 px-4 hover:bg-green-50 focus:bg-green-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed min-h-fit text-sm cursor-pointer transition-colors duration-150"
                                >
                                  <span className="block leading-5 text-gray-800 font-medium">{dept}</span>
                                </SelectItem>
                              ))}

                              {/* หน่วยงานอื่นๆ */}
                              <div className="px-4 py-3 text-sm font-bold text-purple-700 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 mt-1 flex items-center gap-2">
                                <span>🏛️</span>
                                <span>หน่วยงานอื่นๆ</span>
                              </div>
                              {departments.others.options.map((dept, index) => (
                                <SelectItem
                                  key={`others-${index}`}
                                  value={dept}
                                  className="py-3 px-4 hover:bg-purple-50 focus:bg-purple-100 text-gray-800 bg-white whitespace-normal break-words leading-relaxed min-h-fit text-sm cursor-pointer transition-colors duration-150"
                                >
                                  <span className="block leading-5 text-gray-800 font-medium">{dept}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.department && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <span className="mr-1">⚠️</span>
                              {formErrors.department}
                            </p>
                          )}
                        </div>
                      </div>


                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                    <Button
                      type="submit"
                      className="w-full md:w-96 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          กำลังสมัครสมาชิก...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          สมัครสมาชิก
                        </span>
                      )}
                    </Button>

                    <p className="text-center text-sm sm:text-base text-gray-600">
                      มีบัญชีอยู่แล้ว?{' '}
                      <Link href="/login" className="text-green-600 hover:text-green-800 font-semibold hover:underline transition-colors duration-200">
                        เข้าสู่ระบบ
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Validation Alert Dialog */}
            <AlertDialog open={showValidationAlert} onOpenChange={setShowValidationAlert}>
              <AlertDialogContent className="max-w-sm sm:max-w-lg border-2 border-green-200 bg-white shadow-2xl mx-2 sm:mx-auto rounded-xl">
                <AlertDialogHeader className={`text-white p-3 sm:p-4 -m-3 sm:-m-6 mb-3 sm:mb-4 rounded-t-xl sm:rounded-t-lg ${alertType === 'error'
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : alertType === 'success'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600'
                  }`}>
                  <AlertDialogTitle className="text-lg sm:text-xl font-bold flex items-center justify-center text-white">
                    <span className="mr-2 text-xl sm:text-2xl">
                      {alertType === 'error' ? '❌' : alertType === 'success' ? '✅' : '⚠️'}
                    </span>
                    {alertTitle}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription asChild>
                  <div className="px-3 sm:px-4 pb-2">
                    {alertType === 'success' ? (
                      <div className="bg-white p-4 sm:p-8 rounded-lg">
                        <p className="text-green-600 font-semibold text-center text-lg sm:text-xl">สมัครสมาชิกสำเร็จ</p>
                        <p className="text-blue-600 font-medium text-center text-sm sm:text-base mt-3">
                          กรุณารอการอนุมัติเข้าใช้งานระบบจากผู้ดูแลระบบ
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-700 text-base font-medium">
                          <span className={`font-bold ${alertType === 'error' ? 'text-red-600' : 'text-orange-600'}`}>
                            {alertType === 'error' ? 'เกิดข้อผิดพลาด:' : `พบข้อผิดพลาด ${validationErrors.length} รายการ:`}
                          </span>
                        </p>
                        <div className={`border-l-4 p-4 rounded-lg ${alertType === 'error' ? 'bg-red-50 border-red-400' : 'bg-red-50 border-red-400'}`}>
                          <ul className="list-none space-y-2">
                            {validationErrors.map((error, index) => (
                              <li key={index} className="font-medium flex items-start text-red-700">
                                <span className="mr-2 mt-0.5 font-bold text-red-500">•</span>
                                <span>{error.replace('❌ ', '').replace('🚫 ', '').replace('📧 ', '').replace('🔒 ', '').replace('💼 ', '').replace('🏢 ', '').replace('🆔 ', '').replace('🌐 ', '').replace('🔧 ', '').replace('❗ ', '').replace('🎉 ', '')}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg border-l-4 bg-blue-50 border-blue-400">
                          <p className="text-sm text-blue-700">
                            <strong className="flex items-center mb-1">
                              <span className="mr-2">💡</span>
                              แนะนำ:
                            </strong>
                            {alertType === 'error' ? 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง' : 'กรุณาตรวจสอบข้อมูลให้ครบถ้วนทุกช่อง'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
                <AlertDialogFooter className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <AlertDialogAction
                    onClick={() => setShowValidationAlert(false)}
                    className={`mx-auto px-6 sm:px-8 py-2 sm:py-3 text-white rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 transform hover:scale-105 shadow-lg ${alertType === 'error'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      : alertType === 'success'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                      }`}
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

export default RegisterPage