// ===================================================================
// Position APIs 
// ===================================================================
// APIs สำหรับจัดการข้อมูล positions สำหรับ Registration Form
// ===================================================================

import { Elysia } from 'elysia'
import { 
  getPositionGroups, 
  ALL_POSITIONS,
  isValidPosition,
  getTableFromPosition
} from '../utils/positions.js'
import { getAllDepartments } from '../utils/departments.js'

export const positionRoutes = new Elysia({ prefix: '/positions' })
  // ดูรายการ position ทั้งหมดแบบจัดกลุ่ม
  .get('/', () => {
    return {
      success: true,
      message: 'รายการตำแหน่งสำหรับ Registration',
      data: getPositionGroups(),
      total_positions: ALL_POSITIONS.length
    }
  })
  
  // ดูรายการ position แบบ flat list
  .get('/all', () => {
    return {
      success: true,
      message: 'รายการตำแหน่งทั้งหมด',
      positions: ALL_POSITIONS
    }
  })
  
  // ตรวจสอบ position และบอกว่าจะไปตารางไหน
  .post('/validate', ({ body }) => {
    const { position } = body
    
    if (!position) {
      return {
        success: false,
        message: 'กรุณาระบุตำแหน่ง'
      }
    }
    
    const isValid = isValidPosition(position)
    const targetTable = getTableFromPosition(position)
    
    return {
      success: true,
      position,
      is_valid: isValid,
      target_table: targetTable,
      message: isValid ? 
        `ตำแหน่งถูกต้อง → จะเก็บข้อมูลในตาราง ${targetTable}` : 
        'ตำแหน่งไม่ถูกต้อง'
    }
  })
  
  // ดู mapping ระหว่าง departments และ positions
  .get('/departments-mapping', () => {
    const departments = getAllDepartments()
    const positionGroups = getPositionGroups()
    
    return {
      success: true,
      message: 'ความสัมพันธ์ระหว่าง departments และ positions',
      departments,
      position_groups: positionGroups,
      mapping_info: {
        total_departments: departments.length,
        total_positions: ALL_POSITIONS.length,
        executives_per_department: positionGroups.executives.positions.length - 1, // ลบ university executive
        officers_per_department: positionGroups.officers.positions.length
      }
    }
  })
  
  // เพิ่ม endpoint สำหรับ Frontend
  .get('/groups', () => {
    return {
      success: true,
      message: 'ดึงข้อมูลตำแหน่งสำเร็จ',
      data: getPositionGroups(),
      total: ALL_POSITIONS.length
    }
  })

export default positionRoutes
