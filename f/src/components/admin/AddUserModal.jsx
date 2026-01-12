'use client'

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { authUtils } from '@/lib/fetchData'
import { AddressSelector } from '@/components/AddressSelector'
import { POSITIONS, DEPARTMENTS, determineRole } from '@/constants/userManagement'
import styles from '@/styles/animations.module.css'

export default function AddUserModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    zip_code: '',
    position: '',
    department: '',
    role: 'user',
    address: {
      province: null,
      district: null,
      subdistrict: null,
    }
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [modalKey, setModalKey] = useState(0) // เพิ่ม key เพื่อ force re-render

  // Force re-render เมื่อ modal เปิด
  React.useEffect(() => {
    if (isOpen) {
      setModalKey(prev => prev + 1)
      // Force document body scroll lock
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Validation function
  const validateForm = async () => {
    const newErrors = {}

    // Basic validation
    if (!formData.first_name.trim()) newErrors.first_name = 'กรุณากรอกชื่อ'
    if (!formData.last_name.trim()) newErrors.last_name = 'กรุณากรอกนามสกุล'

    if (!formData.email.trim()) {
      newErrors.email = 'กรุณากรอกอีเมล'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน'
    } else if (formData.password.length < 8) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'
    }

    if (!formData.position.trim()) {
      newErrors.position = 'กรุณาเลือกตำแหน่ง'
    }

    if (!formData.department.trim()) {
      newErrors.department = 'กรุณาเลือกหน่วยงานที่สังกัด'
    }

    // Check for duplicates
    if (Object.keys(newErrors).length === 0) {
      try {
        const token = authUtils.getToken()

        // Check email
        const emailResponse = await fetch(`/api/protected/admin/check-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: formData.email })
        })

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json()
          if (emailResult.exists) {
            newErrors.email = 'อีเมลนี้ถูกใช้แล้ว'
          }
        }


      } catch (error) {
        console.error('Error checking duplicates:', error)
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form handlers
  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))

    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }))
    }
  }

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddressChange = (addressData) => {
    setFormData(prev => ({ ...prev, address: addressData }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!(await validateForm())) return

    setLoading(true)
    setErrors({})

    try {
      const finalRole = determineRole(formData.position)
      const submitData = {
        ...formData,
        role: finalRole,
        zip_code: formData.zip_code ? parseInt(formData.zip_code, 10) : null,
        province_id: formData.address?.province?.province_id || null,
        district_id: formData.address?.district?.district_id || null,
        subdistrict_id: formData.address?.subdistrict?.subdistrict_id || null,
        address: undefined
      }

      const token = authUtils.getToken()
      const response = await fetch(`/api/protected/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        // แสดง success modal
        setShowSuccessModal(true)
      } else {
        const errorData = await response.json()
        console.log('🚨 Error response:', errorData)
        
        // ตรวจสอบประเภท error และแสดงที่ field ที่เหมาะสม
        if (response.status === 409) {
          // Conflict - มักจะเป็น email ซ้ำ
          if (errorData.error && errorData.error.includes('email')) {
            setErrors({ email: '❌ อีเมลนี้ถูกใช้แล้วในระบบ กรุณาใช้อีเมลอื่น' })
          } else {
            setErrors({ general: '❌ ข้อมูลที่กรอกมีการใช้งานแล้วในระบบ กรุณาตรวจสอบ Email' })
          }
        } else {
          setErrors({ general: errorData.error || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' })
        }
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setErrors({ general: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        zip_code: '',
        position: '',
        department: '',
        role: 'user',
        address: { province: null, district: null, subdistrict: null }
      })
      setErrors({})
    }, 300)
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      onSuccess()
      handleClose()
    }, 200)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 bottom-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in edit-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: '16px',
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }}

        onWheel={(e) => {
          // ให้ scroll ได้เฉพาะใน modal content
          if (!e.target.closest('.edit-modal-content')) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-slide-up edit-modal-content relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-6 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center">
                <span className="bg-white/20 rounded-xl w-12 h-12 flex items-center justify-center mr-4 shadow-lg">
                  👤
                </span>
                เพิ่มผู้ใช้ใหม่
              </h3>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center transition-all duration-200"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>
          </div>

          {/* Content - Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <form onSubmit={handleSubmit} id="addUserForm">
              <div className="space-y-8">
                {/* General Error */}
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 font-medium">{errors.general}</p>
                  </div>
                )}

                {/* Personal Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <h4 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    ข้อมูลส่วนตัว
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div className="space-y-3">
                      <label htmlFor="first_name" className="text-gray-700 font-semibold text-base">
                        ชื่อจริง <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="first_name"
                        type="text"
                        placeholder="กรอกชื่อจริง"
                        value={formData.first_name}
                        onChange={handleChange}
                        disabled={loading}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.first_name ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                          }`}
                      />
                      {errors.first_name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.first_name}
                        </p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-3">
                      <label htmlFor="last_name" className="text-gray-700 font-semibold text-base">
                        นามสกุล <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="last_name"
                        type="text"
                        placeholder="กรอกนามสกุล"
                        value={formData.last_name}
                        onChange={handleChange}
                        disabled={loading}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.last_name ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                          }`}
                      />
                      {errors.last_name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mt-6">
                    <div className="space-y-3">
                      <label htmlFor="email" className="text-gray-700 font-semibold text-base">
                        อีเมล <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                          }`}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-3">
                      <label htmlFor="password" className="text-gray-700 font-semibold text-base">
                        รหัสผ่าน <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="รหัสผ่านอย่างน้อย 8 ตัวอักษร"
                          value={formData.password}
                          onChange={handleChange}
                          disabled={loading}
                          className={`w-full border rounded-lg px-4 py-2.5 pr-12 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:text-indigo-600 transition-all duration-200"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="confirmPassword" className="text-gray-700 font-semibold text-base">
                        ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          disabled={loading}
                          className={`w-full border rounded-lg px-4 py-2.5 pr-12 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.confirmPassword ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:text-indigo-600 transition-all duration-200"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Position and Department */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <h4 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    ตำแหน่งและหน่วยงาน
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Position */}
                    <div className="space-y-3">
                      <label htmlFor="position" className="text-gray-700 font-semibold text-base">
                        ตำแหน่ง <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="position"
                        value={formData.position}
                        onChange={(e) => handleSelectChange('position', e.target.value)}
                        disabled={loading}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 transition-all duration-200 bg-white ${errors.position ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-purple-200'
                          }`}
                      >
                        <option value="">เลือกตำแหน่ง</option>

                        {/* General */}
                        <optgroup label="👤 บุคลากรทั่วไป">
                          {POSITIONS.general.options.map((position, index) => (
                            <option key={`general-${index}`} value={position}>
                              {position}
                            </option>
                          ))}
                        </optgroup>

                        {/* Admin */}
                        <optgroup label="🛡️ ผู้ดูแลระบบ">
                          {POSITIONS.admins.options.map((position, index) => (
                            <option key={`admins-${index}`} value={position}>
                              {position}
                            </option>
                          ))}
                        </optgroup>

                        {/* Executives */}
                        <optgroup label="👨‍💼 ผู้บริหาร">
                          {POSITIONS.executives.options.map((position, index) => (
                            <option key={`executives-${index}`} value={position}>
                              {position}
                            </option>
                          ))}
                        </optgroup>

                        {/* Officers */}
                        <optgroup label="👨‍💻 เจ้าหน้าที่ดูแลห้องประชุม">
                          {POSITIONS.officers.options.map((position, index) => (
                            <option key={`officers-${index}`} value={position}>
                              {position}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {errors.position && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.position}
                        </p>
                      )}
                    </div>

                    {/* Department */}
                    <div className="space-y-3">
                      <label htmlFor="department" className="text-gray-700 font-semibold text-base">
                        หน่วยงานที่สังกัด <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="department"
                        value={formData.department}
                        onChange={(e) => handleSelectChange('department', e.target.value)}
                        disabled={loading}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium focus:ring-2 transition-all duration-200 bg-white ${errors.department ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-purple-200'
                          }`}
                      >
                        <option value="">เลือกหน่วยงาน</option>

                        {/* Faculties */}
                        <optgroup label={DEPARTMENTS.faculties.label}>
                          {DEPARTMENTS.faculties.options.map((dept, index) => (
                            <option key={`faculty-${index}`} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </optgroup>

                        {/* Divisions */}
                        <optgroup label={DEPARTMENTS.divisions.label}>
                          {DEPARTMENTS.divisions.options.map((dept, index) => (
                            <option key={`division-${index}`} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </optgroup>

                        {/* Offices */}
                        <optgroup label={DEPARTMENTS.offices.label}>
                          {DEPARTMENTS.offices.options.map((dept, index) => (
                            <option key={`office-${index}`} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </optgroup>

                        {/* Others */}
                        <optgroup label={DEPARTMENTS.others.label}>
                          {DEPARTMENTS.others.options.map((dept, index) => (
                            <option key={`other-${index}`} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {errors.department && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.department}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Role Display */}
                  {formData.position && (
                    <div className="mt-6">
                      <div className="space-y-3">
                        <label className="text-gray-700 font-semibold text-base">
                          สิทธิ์การใช้งาน <span className="text-red-500">*</span>
                        </label>
                        <div className="w-full border-2 rounded-xl px-5 py-4 text-lg font-bold bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-gray-800 shadow-sm">
                          <div className="flex items-center">
                            <span className="flex-1">
                              {determineRole(formData.position) === 'user' && '👤 ผู้ใช้ทั่วไป'}
                              {determineRole(formData.position) === 'officer' && '👨‍💻 เจ้าหน้าที่'}
                              {determineRole(formData.position) === 'executive' && '👨‍💼 ผู้บริหาร'}
                              {determineRole(formData.position) === 'admin' && '👨‍💻 ผู้ดูแลระบบ'}
                            </span>
                            <span className="text-sm text-indigo-600 bg-white/60 px-2 py-1 rounded-lg">(กำหนดอัตโนมัติ)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <h4 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                    <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 shadow-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    ที่อยู่
                  </h4>

                  <AddressSelector
                    onChange={handleAddressChange}
                    value={formData.address}
                    onZipCodeChange={(zipCode) => {
                      setFormData(prev => ({
                        ...prev,
                        zip_code: zipCode
                      }))
                    }}
                    disabled={loading}
                  />

                  {/* Zip Code */}
                  <div className="mt-6">
                    <div className="space-y-3">
                      <label htmlFor="zip_code" className="text-gray-700 font-semibold text-base">
                        รหัสไปรษณีย์
                      </label>
                      <input
                        id="zip_code"
                        type="text"
                        placeholder="12345"
                        pattern="[0-9]{5}"
                        maxLength="5"
                        value={formData.zip_code}
                        onChange={handleChange}
                        disabled={loading}
                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.zip_code ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-green-400 focus:border-green-500 focus:ring-green-200'
                          }`}
                      />
                      {errors.zip_code && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {errors.zip_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sticky Footer with Buttons */}
          <div className="bg-gray-50 border-t border-gray-200 p-6 rounded-b-3xl flex-shrink-0">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="addUserForm"
                disabled={loading}
                className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className={`animate-spin -ml-1 mr-2 h-4 w-4 text-white ${styles.spinning}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังสร้าง...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    เพิ่มผู้ใช้ใหม่
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal - ต้องอยู่นอก main modal */}
      {showSuccessModal && (
        <div 
          className={`fixed top-0 left-0 right-0 bottom-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[9999] ${styles.successModalOverlay}`}
          style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}
        >
          <div 
            className={`bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 ${styles.successModalContent}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-4 animate-bounce">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">สำเร็จ!</h3>
              <p className="text-lg text-gray-600">เพิ่มผู้ใช้สำเร็จ</p>
            </div>

            {/* OK Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSuccessClose}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
