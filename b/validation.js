// ===================================================================
// Validation Utils สำหรับ Meeting Room Backend
// ===================================================================
// จัดการการตรวจสอบข้อมูลต่างๆ (Email, Password, etc.)
// 
// Features:
// - Email Format Validation
// - Password Policy Validation
// - Helper Functions
// ===================================================================

import { isValidDepartment } from './utils/departments.js'

// Email Validation
export const validateEmail = (email) => {
  const errors = []
  
  // ตรวจสอบว่ามี email หรือไม่
  if (!email) {
    errors.push('กรุณาใส่อีเมล')
    return { isValid: false, errors }
  }
  
  // ตรวจสอบความยาว
  if (email.length > 255) {
    errors.push('อีเมลต้องมีความยาวไม่เกิน 255 ตัวอักษร')
  }
  
  // ตรวจสอบรูปแบบ email ด้วย regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.push('กรุณาใส่อีเมลที่ถูกต้อง')
  }
  
  // ตรวจสอบว่ามี @ และ . ในตำแหน่งที่ถูกต้อง
  const atIndex = email.indexOf('@')
  const dotIndex = email.lastIndexOf('.')
  
  if (atIndex < 1 || dotIndex < atIndex + 2 || dotIndex >= email.length - 1) {
    errors.push('รูปแบบอีเมลไม่ถูกต้อง')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Password Policy Validation
export const validatePassword = (password) => {
  const errors = []
  
  // ตรวจสอบว่ามี password หรือไม่
  if (!password) {
    errors.push('กรุณาใส่รหัสผ่าน')
    return { isValid: false, errors }
  }
  
  // ตรวจสอบความยาวขั้นต่ำ
  if (password.length < 8) {
    errors.push('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  }
  
  // ตรวจสอบความยาวสูงสุด
  if (password.length > 128) {
    errors.push('รหัสผ่านต้องมีไม่เกิน 128 ตัวอักษร')
  }
  
  // ตรวจสอบต้องมีตัวอักษร
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว')
  }
  
  // ตรวจสอบต้องมีตัวเลข
  if (!/[0-9]/.test(password)) {
    errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')
  }
  
  // ตรวจสอบต้องมีอักขระพิเศษ (optional - เอาไว้ใช้ภายหลัง)
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('Password must contain at least one special character')
  // }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper: รวม validation errors เป็น message เดียว
export const formatValidationErrors = (errors) => {
  if (!errors || errors.length === 0) return null
  
  if (errors.length === 1) {
    return errors[0]
  }
  
  return `พบข้อผิดพลาดหลายข้อ: ${errors.join(', ')}`
}

// Helper: ตรวจสอบข้อมูลสำหรับ register
export const validateRegisterData = (data) => {
  const { email, password, first_name, last_name } = data
  const allErrors = []
  
  // ตรวจสอบ email
  const emailValidation = validateEmail(email)
  if (!emailValidation.isValid) {
    allErrors.push(...emailValidation.errors)
  }
  
  // ตรวจสอบ password
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.isValid) {
    allErrors.push(...passwordValidation.errors)
  }
  
  // ตรวจสอบฟิลด์ที่จำเป็น
  if (!first_name || first_name.trim().length === 0) {
    allErrors.push('กรุณาใส่ชื่อจริง')
  }
  
  if (!last_name || last_name.trim().length === 0) {
    allErrors.push('กรุณาใส่นามสกุล')
  }
  
  // ตรวจสอบ department (ถ้ามี)
  if (data.department && !isValidDepartment(data.department)) {
    allErrors.push('กรุณาเลือก department ที่ถูกต้อง')
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}
