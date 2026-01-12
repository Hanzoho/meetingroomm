'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils, authAPI, getStaticFileUrl } from '@/lib/fetchData'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InlineSpinner } from '@/components/ui/spinner'
import AlertModal from '@/components/ui/alert-modal'
import { AddressSelector } from '@/components/AddressSelector'
import { useRefreshUser, useUpdateUser } from '../../app/(main)/layout'
import { debugLog } from '@/utils/debug'
import { Image, HelpCircle, MapPin, Pencil, X, Check } from "lucide-react"

export default function ProfileForm({ userRole = 'user', requiredRole = null }) {
  const router = useRouter()
  const refreshUser = useRefreshUser()
  const updateUser = useUpdateUser()
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [imageKey, setImageKey] = useState(Date.now())

  // เก็บไฟล์รูปที่เลือกไว้ชั่วคราว (ยังไม่อัปโหลด)
  const [pendingImageFile, setPendingImageFile] = useState(null)
  const [pendingImagePreview, setPendingImagePreview] = useState(null)
  
  const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL

  // Address editing state - เก็บไว้สำหรับ sync กับ AddressSelector
  const [tempAddressData, setTempAddressData] = useState({
    province: null,
    district: null,
    subdistrict: null,
    zipcode: ''
  })

  // Alert Modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  })

  // ข้อมูลหน่วยงาน
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

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',    // เปลี่ยนจาก department_id เป็น department
    position: '',      // เปลี่ยนจาก position_id เป็น position
  })

  // Field-level errors สำหรับแสดงข้อผิดพลาดใต้ input fields
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    first_name: '',
    last_name: ''
  })

  // กำหนดสีตาม role (แบบเรียบง่าย)
  const getThemeByRole = (role) => {
    switch (role) {
      case 'officer':
        return {
          bgGradient: 'from-blue-50 to-blue-100',
          headerBg: 'from-blue-600 to-blue-700',
          titleColor: 'text-blue-800',
          buttonSave: 'bg-blue-600 hover:bg-blue-700',
          inputFocus: 'focus:border-blue-500 focus:ring-blue-200',
          spinnerColor: 'border-blue-200 border-b-blue-600',
          accent: 'blue'
        }
      case 'admin':
        return {
          bgGradient: 'from-red-50 to-red-100',
          headerBg: 'from-red-600 to-red-700',
          titleColor: 'text-red-800',
          buttonSave: 'bg-red-600 hover:bg-red-700',
          inputFocus: 'focus:border-red-500 focus:ring-red-200',
          spinnerColor: 'border-red-200 border-b-red-600',
          accent: 'red'
        }
      case 'executive':
        return {
          bgGradient: 'from-purple-50 to-purple-100',
          headerBg: 'from-purple-600 to-purple-700',
          titleColor: 'text-purple-800',
          buttonSave: 'bg-purple-600 hover:bg-purple-700',
          inputFocus: 'focus:border-purple-500 focus:ring-purple-200',
          spinnerColor: 'border-purple-200 border-b-purple-600',
          accent: 'purple'
        }
      case 'user':
      default:
        return {
          bgGradient: 'from-green-50 to-green-100',
          headerBg: 'from-green-600 to-emerald-600',
          titleColor: 'text-green-800',
          buttonSave: 'bg-green-600 hover:bg-green-700',
          inputFocus: 'focus:border-green-500 focus:ring-green-200',
          spinnerColor: 'border-green-200 border-b-green-600',
          accent: 'green'
        }
    }
  }

  const theme = getThemeByRole(userRole)

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const [userData, token] = await Promise.all([
          Promise.resolve(authUtils.getUserWithRole()),
          Promise.resolve(authUtils.getToken()),
          new Promise(resolve => setTimeout(resolve, 50))
        ])

        debugLog.log('📊 Initializing profile with data:', userData)

        if (!userData || !token) {
          debugLog.error('❌ No user data or token found')
          setAlertModal({
            isOpen: true,
            title: 'ไม่พบข้อมูลผู้ใช้',
            message: 'กรุณาลองเข้าสู่ระบบใหม่',
            type: 'error'
          })
          setTimeout(() => router.push('/login'), 2000)
          return
        }

        // ตรวจสอบสิทธิ์
        if (requiredRole && userData.role !== requiredRole) {
          debugLog.error(`❌ Access denied. Required: ${requiredRole}, Got: ${userData.role}`)
          setAlertModal({
            isOpen: true,
            title: 'ไม่มีสิทธิ์เข้าถึง',
            message: 'คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้',
            type: 'error'
          })
          setTimeout(() => router.back(), 2000)
          return
        }

        // ดึงข้อมูลโปรไฟล์จาก API เพื่อให้ได้ข้อมูลล่าสุด
        const response = await authAPI.getProfile()
        if (response.success) {
          const profileData = response.profile // ✅ แก้ไขจาก response.user เป็น response.profile
          setUser(profileData)

          // Initialize temp address data with current user data
          setTempAddressData({
            province: profileData?.province_id ? {
              province_id: profileData.province_id,
              province_name: profileData.province_name
            } : null,
            district: profileData?.district_id ? {
              district_id: profileData.district_id,
              district_name: profileData.amphoe_name  // ใช้ amphoe_name จาก backend
            } : null,
            subdistrict: profileData?.subdistrict_id ? {
              subdistrict_id: profileData.subdistrict_id,
              subdistrict_name: profileData.tambon_name  // ใช้ tambon_name จาก backend
            } : null,
            zipcode: profileData?.zip_code || ''  // ใช้ zip_code จาก backend
          })

          // Log เพื่อดูข้อมูล address
          debugLog.log('🏠 Address data from API:', {
            province_id: profileData?.province_id,
            district_id: profileData?.district_id,
            subdistrict_id: profileData?.subdistrict_id,
            province_name: profileData?.province_name,
            district_name: profileData?.district_name,
            subdistrict_name: profileData?.subdistrict_name
          })

          // Log เพื่อดูข้อมูล department และ position
          debugLog.log('🏢 Department & Position data from API:', {
            department: profileData?.department,
            position: profileData?.position,
            department_id: profileData?.department_id,
            position_id: profileData?.position_id
          })

          setFormData({
            first_name: profileData?.first_name || '',
            last_name: profileData?.last_name || '',
            email: profileData?.email || '',
            phone: profileData?.phone || '',
            department: profileData?.department || '',  // ใช้ department แทน department_id
            position: profileData?.position || '',      // ใช้ position แทน position_id
          })

          debugLog.log('✅ Profile data loaded successfully')
        } else {
          debugLog.error('❌ Failed to load profile:', response.message)
          setAlertModal({
            isOpen: true,
            title: 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้',
            message: response.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            type: 'error'
          })
        }
      } catch (error) {
        debugLog.error('❌ Error initializing profile:', error)
        setAlertModal({
          isOpen: true,
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
          type: 'error'
        })
      }
    }

    initializeProfile()
  }, [router, requiredRole])

  // Handle cancel - reset to original data
  const handleCancel = () => {
    if (!user) return // ป้องกันกรณีที่ยังไม่ได้โหลดข้อมูล

    // รีเซ็ตข้อมูลฟอร์มกลับเป็นค่าเดิม - ใช้ || '' เพื่อป้องกัน undefined
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',    // ✅ แก้ไขจาก department_id เป็น department
      position: user.position || '',        // ✅ แก้ไขจาก position_id เป็น position
    })

    // รีเซ็ตข้อมูลที่อยู่กลับเป็นค่าเดิม
    setTempAddressData({
      province: user.province_id ? {
        province_id: user.province_id,
        province_name: user.province_name || ''
      } : null,
      district: user.district_id ? {
        district_id: user.district_id,
        district_name: user.amphoe_name || ''
      } : null,
      subdistrict: user.subdistrict_id ? {
        subdistrict_id: user.subdistrict_id,
        subdistrict_name: user.tambon_name || ''
      } : null,
      zipcode: user.zip_code || ''
    })

    // ล้างไฟล์รูปที่เลือกไว้ (ถ้ามี)
    setPendingImageFile(null)
    setPendingImagePreview(null)
    setImageKey(Date.now())
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle address selection
  const handleAddressChange = (addressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData,
      zip_code: addressData.subdistrict?.zip_code || prev.zip_code
    }))
  }

  // Handle zip code change from address selector
  const handleZipCodeChange = (zipCode) => {
    setFormData(prev => ({
      ...prev,
      zip_code: zipCode
    }))
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (file) {
      // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setAlertModal({
          isOpen: true,
          title: 'ขนาดไฟล์ใหญ่เกินไป',
          message: 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB',
          type: 'error'
        })
        return
      }

      // ตรวจสอบประเภทไฟล์
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setAlertModal({
          isOpen: true,
          title: 'ประเภทไฟล์ไม่ถูกต้อง',
          message: 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF, WebP)',
          type: 'error'
        })
        return
      }

      // เก็บไฟล์และสร้าง preview URL ชั่วคราว (ยังไม่อัปโหลด)
      debugLog.log('📸 Selected image file:', file.name)
      setPendingImageFile(file)

      // สร้าง preview URL
      const previewUrl = URL.createObjectURL(file)
      setPendingImagePreview(previewUrl)

      // Force re-render avatar เพื่อแสดงรูปใหม่
      setImageKey(Date.now())

      debugLog.log('✅ Image selected and preview created (not uploaded yet)')
    }
  }

  const handleSaveProfile = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกชื่อ นามสกุล และอีเมล',
        type: 'error'
      })
      return
    }

    setSaving(true)
    try {
      debugLog.log('💾 Saving profile data:', formData)
      debugLog.log('🏢 Department & Position to save:', {
        department: formData.department,
        position: formData.position
      })

      // 1. อัปเดตข้อมูลโปรไฟล์ (รวมที่อยู่)
      const profileUpdateData = {
        first_name: (formData.first_name || '').trim(),
        last_name: (formData.last_name || '').trim(),
        email: (formData.email || '').trim(),
        // 🔐 department ส่งได้เฉพาะ admin
        ...(userRole === 'admin' ? { department: (formData.department || '').trim() } : {}),
        // 🔐 position ส่งได้เฉพาะ admin
        ...(userRole === 'admin' ? { position: (formData.position || '').trim() } : {}),
        // ข้อมูลที่อยู่จาก AddressSelector  
        province_id: tempAddressData.province?.province_id || null,
        district_id: tempAddressData.district?.district_id || null,
        subdistrict_id: tempAddressData.subdistrict?.subdistrict_id || null,
        zip_code: tempAddressData.zipcode ? parseInt(tempAddressData.zipcode) : null  // แปลงเป็น Int
      }

      debugLog.log('📤 Sending profile update data:', profileUpdateData)

      const response = await authAPI.updateProfile(profileUpdateData)

      if (response.success) {
        debugLog.log('✅ Profile updated successfully')

        // 2. ถ้ามีรูปใหม่ให้อัปโหลด
        if (pendingImageFile) {
          debugLog.log('📸 Uploading image...')
          const formData = new FormData()
          formData.append('profileImage', pendingImageFile)
          const imageResponse = await authAPI.uploadProfileImage(formData)

          if (imageResponse.success) {
            debugLog.log('✅ Image uploaded successfully:', imageResponse.imageUrl)
            // Clear pending image
            setPendingImageFile(null)
            setPendingImagePreview(null)
            setImageKey(Date.now()) // Force refresh avatar

            // 🔥 ใช้ imageUrl จาก backend response พร้อม cache busting
            const backendImageUrl = imageResponse.imageUrl
            const timestamp = Date.now()
            const randomNum = Math.random()
            const newImageUrl = `${backendImageUrl}?t=${timestamp}&r=${randomNum}`

            console.log('🖼️ ProfileForm: Using backend imageUrl:', backendImageUrl)
            console.log('🖼️ ProfileForm: Final imageUrl with cache busting:', newImageUrl)

            // อัปเดต local state
            setUser(prev => ({
              ...prev,
              profile_image: newImageUrl
            }))

            // 🔥 อัปเดต Layout's user state ทันที
            if (updateUser) {
              updateUser({
                profile_image: newImageUrl,
                _imageUpdate: timestamp,
                _forceUpdate: timestamp
              })
            }

            // รีเฟรช user data (แต่ preserve image URL)
            if (refreshUser) {
              console.log('🔄 ProfileForm: Calling refreshUser after image upload')
              await refreshUser(true) // preserveImageUrl = true
            }
          } else {
            debugLog.error('❌ Image upload failed:', imageResponse.message)
            setAlertModal({
              isOpen: true,
              title: 'ข้อมูลโปรไฟล์อัปเดตแล้ว แต่รูปภาพอัปโหลดไม่สำเร็จ',
              message: imageResponse.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
              type: 'warning'
            })
          }
        }

        setAlertModal({
          isOpen: true,
          title: 'บันทึกสำเร็จ',
          message: 'ข้อมูลโปรไฟล์ถูกอัปเดตเรียบร้อยแล้ว',
          type: 'success'
        })

        // รีเฟรช user data
        await refreshUser()

        setTimeout(() => {
          window.location.reload()
        }, 1500)

      } else {
        // ไม่ log validation errors ที่จัดการแล้วใน UI
        if (!response.message?.includes('อีเมลนี้ถูกใช้งานแล้ว') && 
            !response.message?.includes('เลขบัตรประชาชนนี้ถูกใช้งานแล้ว')) {
          debugLog.error('❌ Profile update failed:', response.message)
        }
        
        // ล้าง field errors ก่อน
        setFieldErrors({
          email: '',
          first_name: '',
          last_name: ''
        })

        // เช็คว่า error เป็นเรื่อง email ซ้ำ
        if (response.message && response.message.includes('อีเมลนี้ถูกใช้งานแล้ว')) {
          setFieldErrors(prev => ({
            ...prev,
            email: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'
          }))
        } else {
          // กรณี error อื่นๆ ให้แสดง modal แบบเดิม
          setAlertModal({
            isOpen: true,
            title: 'บันทึกไม่สำเร็จ',
            message: response.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
            type: 'error'
          })
        }
      }
    } catch (error) {
      // ไม่ log validation errors ที่จัดการแล้วใน UI
      const errorMessage = error.message || error.toString()
      if (!errorMessage.includes('อีเมลนี้ถูกใช้งานแล้ว')) {
        debugLog.error('❌ Save profile error:', error)
      }
      
      // ล้าง field errors
      setFieldErrors({
        email: '',
        first_name: '',
        last_name: ''
      })

      // เช็ค error message จาก API exception
      if (errorMessage.includes('อีเมลนี้ถูกใช้งานแล้ว')) {
        setFieldErrors(prev => ({
          ...prev,
          email: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'
        }))
      } else {
        // กรณี error อื่นๆ
        setAlertModal({
          isOpen: true,
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
          type: 'error'
        })
      }
    } finally {
      setSaving(false)
    }
  }



  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bgGradient} py-8 px-4`}>
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white shadow-xl rounded-2xl border-0">
          <CardContent className="p-8">
            {/* Header Section */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">ข้อมูลโปรไฟล์</h1>
              <p className="text-gray-600">จัดการและแก้ไขข้อมูลส่วนตัวของคุณ</p>

              {/* Profile Image */}
              <div className="mt-6 flex justify-center">
                <div className="relative group">
                  <Avatar className="w-32 h-32 border-4 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
                    <AvatarImage
                      key={imageKey}
                      src={(() => {
                        let imageUrl = ''
                        if (pendingImagePreview) {
                          imageUrl = pendingImagePreview
                        } else if (user?.profile_image && typeof user.profile_image === 'string') {
                          // ถ้าเป็น API URL ให้ใส่ backend URL
                          imageUrl = user.profile_image.startsWith('/api/')
                            ? `${BACKEND_BASE_URL}${user.profile_image}?t=${Date.now()}&r=${Math.random()}`
                            : user.profile_image
                        } else {
                          // ถ้าไม่มี profile_image ให้สร้าง URL เองด้วย role parameter
                          const currentUserId = user?.user_id || user?.officer_id || user?.admin_id || user?.executive_id
                          const userRole = user?.role || 'user'
                          if (currentUserId) {
                            imageUrl = `${BACKEND_BASE_URL}/api/upload/profile-image/${currentUserId}/${userRole}?t=${Date.now()}&r=${Math.random()}`
                            console.log('📷 ProfileForm: Created fallback image URL:', imageUrl)
                          }
                        }
                        return imageUrl
                      })()}
                      alt="Profile"
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-800 text-lg font-bold">
                      {(formData.first_name?.[0] || '') + (formData.last_name?.[0] || '') || '👤'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-3">
                คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์
              </p>
              {pendingImageFile && (
                <p className="text-sm text-orange-600 mt-1 font-medium">
                  🔄 รูปใหม่จะถูกบันทึกเมื่อกดปุ่ม "บันทึกข้อมูล"
                </p>
              )}
            </div>

            {/* Main Form - Horizontal Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

              {/* Left Column */}
              <div className="space-y-8">

                {/* บทบาทในระบบ */}
                <div>
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${theme.headerBg} flex items-center justify-center mr-3`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">บทบาทในระบบ</h3>
                      <p className="text-gray-500 text-sm">สิทธิ์และการเข้าถึงระบบของคุณ</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={userRole === 'user' ? 'ผู้ใช้งาน (User)' :
                        userRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' :
                          userRole === 'officer' ? 'เจ้าหน้าที่ (Officer)' :
                            userRole === 'executive' ? 'ผู้บริหาร (Executive)' : 'ไม่ระบุ'}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-800 cursor-not-allowed font-semibold"
                    />
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      🔒 บทบาทกำหนดโดยตำแหน่งงาน (แก้ไขไม่ได้)
                    </div>
                  </div>
                </div>

                {/* ข้อมูลส่วนตัว */}
                <div>
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${theme.headerBg} flex items-center justify-center mr-3`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">ข้อมูลส่วนตัว</h3>
                      <p className="text-gray-500 text-sm">ข้อมูลพื้นฐานและการติดต่อ</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ชื่อ */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อ *</label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} transition-all bg-white text-gray-800 font-medium`}
                        placeholder="กรุณาใส่ชื่อ"
                      />
                    </div>

                    {/* นามสกุล */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">นามสกุล *</label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} transition-all bg-white text-gray-800 font-medium`}
                        placeholder="กรุณาใส่นามสกุล"
                      />
                    </div>

                    {/* อีเมล */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">อีเมล *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          handleInputChange('email', e.target.value)
                          // ล้าง error เมื่อเริ่มพิมพ์ใหม่
                          if (fieldErrors.email) {
                            setFieldErrors(prev => ({ ...prev, email: '' }))
                          }
                        }}
                        className={`w-full px-4 py-3 border ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 ${fieldErrors.email ? 'focus:border-red-500 focus:ring-red-200' : theme.inputFocus} transition-all bg-white text-gray-800 font-medium`}
                        placeholder="example@email.com"
                      />
                      {fieldErrors.email && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">

                {/* ที่อยู่ */}
                <div>
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${theme.headerBg} flex items-center justify-center mr-3`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">ที่อยู่</h3>
                      <p className="text-gray-500 text-sm">ข้อมูลที่อยู่จากการสมัครสมาชิก</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <AddressSelector
                      value={tempAddressData}
                      onChange={(addressData) => setTempAddressData(prev => ({ ...prev, ...addressData }))}
                      onZipCodeChange={(zipcode) => setTempAddressData(prev => ({ ...prev, zipcode }))}
                    />

                    {/* รหัสไปรษณีย์ */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสไปรษณีย์</label>
                      <input
                        type="text"
                        value={tempAddressData.zipcode || ''}
                        onChange={(e) => setTempAddressData(prev => ({ ...prev, zipcode: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="รหัสไปรษณีย์"
                        maxLength="5"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        รหัสไปรษณีย์จะถูกเติมอัตโนมัติเมื่อเลือกตำบล
                      </div>
                    </div>
                  </div>
                </div>

                {/* ข้อมูลการทำงาน */}
                <div>
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${theme.headerBg} flex items-center justify-center mr-3`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">ข้อมูลการทำงาน</h3>
                      <p className="text-gray-500 text-sm">ข้อมูลหน่วยงานและตำแหน่งงาน</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* หน่วยงาน/คณะ */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        หน่วยงานที่สังกัด <span className="text-red-500">*</span>
                      </label>
                      {userRole === 'admin' ? (
                        // Admin สามารถแก้ไข department ได้
                        <Select
                          value={formData.department || ''}
                          onValueChange={(value) => handleInputChange('department', value)}
                        >
                          <SelectTrigger className="w-full border-2 rounded-lg px-4 py-3 text-base text-gray-800 font-medium focus:ring-2 transition-all duration-200 bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-200">
                            <SelectValue placeholder="เลือกหน่วยงานที่สังกัด" className="text-gray-800" />
                          </SelectTrigger>
                          <SelectContent className="max-h-80 bg-white border-2 border-gray-200 shadow-xl">
                            {/* คณะต่างๆ */}
                            <div className="px-3 py-2 text-sm font-bold text-blue-600 bg-blue-50 border-b">🎓 คณะต่างๆ</div>
                            {departments.faculties.options.map((dept, index) => (
                              <SelectItem key={`faculties-${index}`} value={dept} className="py-2 px-3 hover:bg-blue-50 text-gray-800 bg-white">
                                {dept}
                              </SelectItem>
                            ))}

                            {/* กองและศูนย์ต่างๆ */}
                            <div className="px-3 py-2 text-sm font-bold text-orange-600 bg-orange-50 border-b mt-1">🏢 กองและศูนย์ต่างๆ</div>
                            {departments.divisions.options.map((dept, index) => (
                              <SelectItem key={`divisions-${index}`} value={dept} className="py-2 px-3 hover:bg-orange-50 text-gray-800 bg-white">
                                {dept}
                              </SelectItem>
                            ))}

                            {/* สำนักต่างๆ */}
                            <div className="px-3 py-2 text-sm font-bold text-green-600 bg-green-50 border-b mt-1">📚 สำนักต่างๆ</div>
                            {departments.offices.options.map((dept, index) => (
                              <SelectItem key={`offices-${index}`} value={dept} className="py-2 px-3 hover:bg-green-50 text-gray-800 bg-white">
                                {dept}
                              </SelectItem>
                            ))}

                            {/* หน่วยงานอื่นๆ */}
                            <div className="px-3 py-2 text-sm font-bold text-purple-600 bg-purple-50 border-b mt-1">🏛️ หน่วยงานอื่นๆ</div>
                            {departments.others.options.map((dept, index) => (
                              <SelectItem key={`others-${index}`} value={dept} className="py-2 px-3 hover:bg-purple-50 text-gray-800 bg-white">
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        // User, Officer, Executive แก้ไขไม่ได้
                        <>
                          <input
                            type="text"
                            value={formData.department || 'ไม่ระบุหน่วยงาน'}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed font-medium"
                          />
                          <div className="flex items-center mt-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            🔐 แก้ไขโดยแอดมินเท่านั้น
                          </div>
                        </>
                      )}
                    </div>

                    {/* ตำแหน่งงาน */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">ตำแหน่งงาน</label>
                      <input
                        type="text"
                        value={formData.position || 'ไม่ระบุตำแหน่ง'}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed font-medium"
                      />
                      <div className="flex items-center mt-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        🔐 แก้ไขโดยแอดมินเท่านั้น
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-xl border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
              {/* แก้ไขล่าสุด */}
              <div className="text-sm text-gray-600 bg-white px-4 py-3 rounded-lg border border-gray-300 shadow-sm order-2 sm:order-1">
                <span className="font-medium">แก้ไขล่าสุด:</span>
                <span className="block sm:inline mt-1 sm:mt-0">
                  {new Date().toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {/* ปุ่ม */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto order-1 sm:order-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all hover:scale-105 hover:shadow-md font-medium text-base"
                >
                  ❌ ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={`px-8 py-3 text-white rounded-lg transition-all disabled:opacity-50 hover:scale-105 hover:shadow-lg font-medium text-base ${theme.buttonSave}`}
                >
                  {saving ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    '💾 บันทึกข้อมูล'
                  )}
                </button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  )
}