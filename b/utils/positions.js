// ===================================================================
// Position Constants & Validation
// ===================================================================
// จัดการ positions ทั้งหมดในระบบ สำหรับ Registration
// ===================================================================

import { DEPARTMENTS } from './departments.js'

// รายการ Position หลักสำหรับ Registration (Simplified Version)
export const POSITIONS = {
  // บุคลากรทั่วไป → จะไปตาราง users
  GENERAL_STAFF: 'บุคลากร/อาจารย์ มหาวิทยาลัยราชภัฏมหาสารคาม',
  OTHER: 'อื่นๆ',
  
  // ผู้ดูแลระบบ → จะไปตาราง admin
  ADMIN: 'ผู้ดูแลระบบ',
  
  // ผู้บริหาร → จะไปตาราง executive (Simplified to single option)
  EXECUTIVE: 'ผู้บริหาร',
  
  // เจ้าหน้าที่ → จะไปตาราง officer (Simplified to single option)
  OFFICER: 'เจ้าหน้าที่ดูแลห้องประชุม'
}

// รวม Position ทั้งหมด (Simplified Version)
export const ALL_POSITIONS = [
  POSITIONS.GENERAL_STAFF,
  POSITIONS.OTHER,
  POSITIONS.ADMIN,
  POSITIONS.EXECUTIVE,
  POSITIONS.OFFICER
]

// ฟังก์ชันตรวจสอบ position ที่ถูกต้อง
export const isValidPosition = (position) => {
  return ALL_POSITIONS.includes(position)
}

// ฟังก์ชันกำหนดว่า position จะไปตารางไหน (Simplified Version)
export const getTableFromPosition = (position) => {
  if (position === POSITIONS.GENERAL_STAFF || position === POSITIONS.OTHER) {
    return 'users'
  }
  
  if (position === POSITIONS.ADMIN) {
    return 'admin'
  }
  
  if (position === POSITIONS.EXECUTIVE) {
    return 'executive'
  }
  
  if (position === POSITIONS.OFFICER) {
    return 'officer'
  }
  
  return null // ไม่รู้จัก position
}

// ฟังก์ชันแปลง position เป็น role_id
export const getRoleIdFromPosition = (position) => {
  const table = getTableFromPosition(position)
  
  switch(table) {
    case 'users': return 1 // user role
    case 'officer': return 2 // officer role  
    case 'admin': return 3 // admin role
    case 'executive': return 4 // executive role
    default: return 1 // default เป็น user
  }
}

// ฟังก์ชันแยกคณะจาก position (Simplified - now returns null since positions don't contain department info)
export const getDepartmentFromPosition = (position) => {
  // ตอนนี้ positions ไม่มีข้อมูล department แล้ว จะใช้ field department โดยตรงแทน
  return null
}

// ฟังก์ชันกำหนด executive position type (Simplified - now determined by department)
export const getExecutivePositionType = (position) => {
  if (position === POSITIONS.EXECUTIVE) {
    // ตอนนี้จะดูจาก department แทน position
    return 'faculty_executive' // default เป็น faculty_executive
  }
  
  return null
}

// ฟังก์ชันจัดกลุ่ม positions สำหรับ UI (Simplified Version)
export const getPositionGroups = () => {
  return {
    general: {
      label: 'บุคลากรทั่วไป',
      positions: [POSITIONS.GENERAL_STAFF, POSITIONS.OTHER]
    },
    admin: {
      label: 'ผู้ดูแลระบบ',
      positions: [POSITIONS.ADMIN]
    },
    executives: {
      label: 'ผู้บริหาร',
      positions: [POSITIONS.EXECUTIVE]
    },
    officers: {
      label: 'เจ้าหน้าที่ดูแลห้องประชุม',
      positions: [POSITIONS.OFFICER]
    }
  }
}

export default {
  POSITIONS,
  ALL_POSITIONS,
  isValidPosition,
  getTableFromPosition,
  getRoleIdFromPosition,
  getDepartmentFromPosition,
  getExecutivePositionType,
  getPositionGroups
}
