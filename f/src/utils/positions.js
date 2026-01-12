// ===================================================================
// Position Utilities - Frontend
// ===================================================================
// ฟังก์ชันช่วยเหลือสำหรับจัดการ position ใน frontend
// เหมือนกับ backend/utils/positions.js แต่สำหรับ frontend
// ===================================================================

/**
 * แปลง position เป็น department/คณะ/หน่วยงาน
 * @param {string} position - ตำแหน่งของผู้ใช้
 * @returns {string|null} - ชื่อคณะ/หน่วยงาน หรือ null ถ้าไม่พบ
 */
export const getDepartmentFromPosition = (position) => {
  if (!position || typeof position !== 'string') return null

  // สำหรับผู้บริหารคณะ
  if (position.startsWith('ผู้บริหาร') && position !== 'ผู้บริหารระดับมหาวิทยาลัย') {
    return position.replace('ผู้บริหาร', '')
  }
  
  // สำหรับเจ้าหน้าที่ทั้งหมด - ลบ prefix แล้วจะได้ department/location
  if (position.startsWith('เจ้าหน้าที่ดูแลห้องประชุม')) {
    const department = position.replace('เจ้าหน้าที่ดูแลห้องประชุม', '')
    
    // แมปตำแหน่งพิเศษกับคณะ - แยกเป็น department เฉพาะตัว
    if (department === 'อาคาร 72 พรรษา') return 'อาคาร 72 พรรษา'
    if (department === 'หอประชุมเฉลิมพระเกียรติ 80 พรรษา') return 'หอประชุมเฉลิมพระเกียรติ 80 พรรษา'
    if (department === 'อาคาร 34 เฉลิมพระเกียรติ 60 ปี') return 'อาคาร 34 เฉลิมพระเกียรติ 60 ปี'
    
    // สำหรับคณะอื่นๆ ให้ return department ตรงๆ
    return department
  }
  
  return null
}

/**
 * ตรวจสอบประเภทของ executive
 * @param {string} position - ตำแหน่งของผู้ใช้
 * @returns {string|null} - 'university_executive' | 'faculty_executive' | null
 */
export const getExecutivePositionType = (position) => {
  if (!position || typeof position !== 'string') return null

  if (position === 'ผู้บริหารระดับมหาวิทยาลัย') {
    return 'university_executive'
  }
  
  if (position.startsWith('ผู้บริหาร') && position !== 'ผู้บริหารระดับมหาวิทยาลัย') {
    return 'faculty_executive'
  }
  
  return null
}

/**
 * ตรวจสอบว่าเป็น position ของเจ้าหน้าที่หรือไม่
 * @param {string} position - ตำแหน่งของผู้ใช้
 * @returns {boolean}
 */
export const isOfficerPosition = (position) => {
  if (!position || typeof position !== 'string') return false
  return position.startsWith('เจ้าหน้าที่ดูแลห้องประชุม')
}

/**
 * ตรวจสอบว่าเป็น position ของผู้บริหารหรือไม่
 * @param {string} position - ตำแหน่งของผู้ใช้
 * @returns {boolean}
 */
export const isExecutivePosition = (position) => {
  if (!position || typeof position !== 'string') return false
  return position.startsWith('ผู้บริหาร')
}

/**
 * ตรวจสอบว่าเป็นผู้บริหารระดับมหาวิทยาลัยหรือไม่ (เห็นทุกอย่าง)
 * @param {string} position - ตำแหน่งของผู้ใช้
 * @returns {boolean}
 */
export const isUniversityExecutive = (position) => {
  return position === 'ผู้บริหารระดับมหาวิทยาลัย'
}

/**
 * แสดงชื่อคณะ/หน่วยงานที่เจ้าหน้าที่รับผิดชอบ
 * @param {object} user - ข้อมูลผู้ใช้
 * @returns {string} - ชื่อคณะ/หน่วยงานที่แสดงใน UI
 */
export const getUserResponsibleDepartment = (user) => {
  if (!user) return 'ไม่ระบุ'

  // สำหรับ Officer ให้ดูจาก position
  if (user.role === 'officer' && user.position) {
    const dept = getDepartmentFromPosition(user.position)
    return dept || user.department || 'ไม่ระบุ'
  }

  // สำหรับ Executive ให้ดูจาก position
  if (user.role === 'executive' && user.position) {
    const dept = getDepartmentFromPosition(user.position)
    return dept || user.department || 'ไม่ระบุ'
  }

  // สำหรับ role อื่นๆ ให้ใช้ department ตรงๆ
  return user.department || 'ไม่ระบุ'
}

export default {
  getDepartmentFromPosition,
  getExecutivePositionType,
  isOfficerPosition,
  isExecutivePosition,
  isUniversityExecutive,
  getUserResponsibleDepartment
}