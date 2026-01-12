// ===================================================================
// Theme Utility - ระบบสีธีมตาม Role
// ===================================================================
// ฟังก์ชันจัดการสีและธีมตาม Role สำหรับใช้ทั้งระบบ
// ใช้ร่วมกันได้ระหว่าง Sidebar, Calendar, Loading และ components อื่นๆ
// ===================================================================

/**
 * รับสีธีมตาม role ของผู้ใช้
 * @param {string} role - user role ('user', 'officer', 'admin', 'executive')
 * @returns {object} ชุดสีธีมสำหรับ role นั้น
 */
export const getThemeColors = (role) => {
  switch (role) {
    case 'officer': 
      return {
        // สีหลักสำหรับ gradient
        primary: 'from-blue-500 to-indigo-600',
        // สีสำหรับ text gradient
        text: 'from-blue-600 to-indigo-600',
        // สีพื้นหลัง
        bg: 'from-blue-500 to-indigo-600',
        // สีสำหรับ solid colors
        solid: {
          primary: 'blue-600',
          light: 'blue-50',
          medium: 'blue-100',
          dark: 'blue-700'
        },
        // สีสำหรับ loading spinner
        spinner: 'border-blue-600',
        // สีสำหรับ buttons
        button: 'bg-blue-600 hover:bg-blue-700',
        // สีสำหรับ links
        link: 'text-blue-600 hover:text-blue-700'
      }
    case 'admin': 
      return {
        primary: 'from-red-500 to-pink-600',
        text: 'from-red-600 to-pink-600',
        bg: 'from-red-500 to-pink-600',
        solid: {
          primary: 'red-600',
          light: 'red-50',
          medium: 'red-100',
          dark: 'red-700'
        },
        spinner: 'border-red-600',
        button: 'bg-red-600 hover:bg-red-700',
        link: 'text-red-600 hover:text-red-700'
      }
    case 'executive': 
      return {
        primary: 'from-purple-500 to-violet-600',
        text: 'from-purple-600 to-violet-600',
        bg: 'from-purple-500 to-violet-600',
        solid: {
          primary: 'purple-600',
          light: 'purple-50',
          medium: 'purple-100',
          dark: 'purple-700'
        },
        spinner: 'border-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        link: 'text-purple-600 hover:text-purple-700'
      }
    case 'user':
    default: 
      return {
        primary: 'from-green-500 to-emerald-600',
        text: 'from-green-600 to-emerald-600',
        bg: 'from-green-500 to-emerald-600',
        solid: {
          primary: 'green-600',
          light: 'green-50',
          medium: 'green-100',
          dark: 'green-700'
        },
        spinner: 'border-green-600',
        button: 'bg-green-600 hover:bg-green-700',
        link: 'text-green-600 hover:text-green-700'
      }
  }
}

/**
 * รับชื่อสีหลักของ role (สำหรับใช้ใน className)
 * @param {string} role - user role
 * @returns {string} ชื่อสี เช่น 'green', 'blue', 'red', 'purple'
 */
export const getRoleColorName = (role) => {
  switch (role) {
    case 'officer': return 'blue'
    case 'admin': return 'red'
    case 'executive': return 'purple'
    case 'user':
    default: return 'green'
  }
}

/**
 * รับข้อความบรรยายสีของ role
 * @param {string} role - user role
 * @returns {string} ข้อความบรรยาย
 */
export const getRoleColorDescription = (role) => {
  switch (role) {
    case 'officer': return 'สีน้ำเงิน - เจ้าหน้าที่'
    case 'admin': return 'สีแดง - ผู้ดูแลระบบ'
    case 'executive': return 'สีม่วง - ผู้บริหาร'
    case 'user':
    default: return 'สีเขียว - ผู้ใช้งานทั่วไป'
  }
}

/**
 * สร้าง className สำหรับ gradient background ตาม role
 * @param {string} role - user role
 * @returns {string} className สำหรับ gradient
 */
export const getGradientBg = (role) => {
  const colors = getThemeColors(role)
  return `bg-gradient-to-br ${colors.primary}`
}

/**
 * สร้าง className สำหรับ gradient text ตาม role
 * @param {string} role - user role
 * @returns {string} className สำหรับ gradient text
 */
export const getGradientText = (role) => {
  const colors = getThemeColors(role)
  return `bg-gradient-to-r ${colors.text} bg-clip-text text-transparent`
}

/**
 * ตรวจสอบว่า role ถูกต้องหรือไม่
 * @param {string} role - user role
 * @returns {boolean} true ถ้า role ถูกต้อง
 */
export const isValidRole = (role) => {
  return ['user', 'officer', 'admin', 'executive'].includes(role)
}

/**
 * รับ role เริ่มต้นถ้า role ไม่ถูกต้อง
 * @param {string} role - user role
 * @returns {string} role ที่ถูกต้อง
 */
export const validateRole = (role) => {
  return isValidRole(role) ? role : 'user'
}
