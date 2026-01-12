// ===================================================================
// Department APIs d
// ===================================================================
// APIs สำหรับจัดการข้อมูล departments
// ===================================================================

import { Elysia } from 'elysia'
import { getAllDepartments, DEPARTMENT_GROUPS } from '../utils/departments.js'

export const departmentRoutes = new Elysia({ prefix: '/departments' })
  // ดูรายการ department ทั้งหมด
  .get('/', () => {
    return {
      success: true,
      message: 'รายการ departments',
      departments: getAllDepartments(),
      groups: DEPARTMENT_GROUPS
    }
  })
  
  // ดูข้อมูลสถิติ department
  .get('/stats', async () => {
    try {
      const prisma = await import('../lib/prisma.js').then(m => m.default)
      
      // นับจำนวนผู้ใช้แต่ละ department
      const userStats = await prisma.users.groupBy({
        by: ['department'],
        _count: {
          user_id: true
        },
        where: {
          department: {
            not: null
          }
        }
      })
      
      // นับจำนวนห้องประชุมแต่ละ department
      const roomStats = await prisma.meeting_room.groupBy({
        by: ['department'],
        _count: {
          room_id: true
        }
      })
      
      return {
        success: true,
        message: 'สถิติ departments',
        userStats,
        roomStats
      }
      
    } catch (error) {
      console.error('❌ Error fetching department stats:', error)
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ'
      }
    }
  })
