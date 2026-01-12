// ==========================================
// Notification Routes - ระบบแจ้งเตือนง่ายๆ
// ==========================================
// ใช้ข้อมูลจาก reservation table แทนการสร้าง table ใหม่

import { Elysia } from 'elysia'
import prisma from '../lib/prisma.js'
import { authMiddleware } from '../middleware/jwt.js'
import { canAccessDepartmentData } from '../middleware/permissions.js'

export const notificationRoutes = new Elysia({ prefix: '/protected/notifications' })
  .derive(async ({ headers, set }) => {
    const user = await authMiddleware({ headers }, set)
    return { user }
  })

  // API สำหรับ Officer - ดูการจองใหม่ที่รอการอนุมัติในคณะตัวเอง
  .get('/officer', async ({ user, set }) => {
    try {
      if (!user.department) {
        set.status = 400
        return { success: false, message: 'ไม่พบข้อมูลคณะของเจ้าหน้าที่' }
      }

      console.log('🔔 [Notifications] Officer:', user.officer_id, 'Department:', user.department)

      // ดึงการจองใหม่ที่ยังรอการอนุมัติในคณะตัวเอง
      const pendingReservations = await prisma.reservation.findMany({
        where: {
          status_r: 'pending',
          meeting_room: {
            department: user.department
          }
        },
        include: {
          users: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          },
          meeting_room: {
            select: {
              room_id: true,
              room_name: true,
              location_m: true,
              department: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
      const notifications = pendingReservations.map(reservation => {
        const roomName = reservation.meeting_room?.room_name || 'ห้องประชุม (ถูกลบแล้ว)'
        return {
          id: reservation.reservation_id,
          type: 'booking_request',
          title: 'การจองใหม่',
          message: `มีการจองห้องประชุม ${roomName} รอการอนุมัติ`,
          room_name: roomName,
          user_name: `${reservation.users.first_name} ${reservation.users.last_name}`,
          booking_date: reservation.start_at,
          booking_time: reservation.start_time && reservation.end_time ? 
            `${new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : 
            'ไม่ระบุเวลา',
          created_at: reservation.created_at,
          time_ago: getTimeAgo(reservation.created_at),
          is_new: isRecent(reservation.created_at, 24) // ถือว่า "ใหม่" ถ้าสร้างภายใน 24 ชม.
        }
      })

      return {
        success: true,
        data: {
          notifications,
          unread_count: notifications.filter(n => n.is_new).length,
          total_count: notifications.length
        }
      }

    } catch (error) {
      console.error('❌ Error fetching officer notifications:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแจ้งเตือน'
      }
    }
  })

  // API สำหรับ User - ดูผลการอนุมัติการจองของตัวเอง
  .get('/user', async ({ user, set }) => {
    try {
      console.log('🔔 [Notifications] User:', user.user_id)

      // ดึงการจองที่ได้รับการอนุมัติ/ปฏิเสธแล้วในช่วงล่าสุด
      const approvedReservations = await prisma.reservation.findMany({
        where: {
          user_id: user.user_id,
          status_r: {
            in: ['approved', 'rejected']
          },
          // ดูย้อนหลัง 7 วัน
          updated_at: {
            gte: new Date(Date.now() - 7*24*60*60*1000)
          }
        },
        include: {
          meeting_room: {
            select: {
              room_id: true,
              room_name: true,
              location_m: true,
              department: true
            }
          },
          officer: {
            select: {
              officer_id: true,
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: {
          updated_at: 'desc'
        }
      })

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
      const notifications = approvedReservations.map(reservation => {
        const isApproved = reservation.status_r === 'approved'
        const roomName = reservation.meeting_room?.room_name || 'ห้องประชุม (ถูกลบแล้ว)'
        return {
          id: reservation.reservation_id,
          type: isApproved ? 'booking_approved' : 'booking_rejected',
          title: isApproved ? 'การจองได้รับการอนุมัติ' : 'การจองถูกปฏิเสธ',
          message: `ห้องประชุม ${roomName} วันที่ ${new Date(reservation.start_at).toLocaleDateString('th-TH')}`,
          room_name: roomName,
          booking_date: reservation.start_at,
          booking_time: reservation.start_time && reservation.end_time ? 
            `${new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : 
            'ไม่ระบุเวลา',
          status: reservation.status_r,
          approved_by: reservation.officer ? 
            `${reservation.officer.first_name} ${reservation.officer.last_name}` : 
            null,
          updated_at: reservation.updated_at,
          time_ago: getTimeAgo(reservation.updated_at),
          is_new: isRecent(reservation.updated_at, 24), // ถือว่า "ใหม่" ถ้าอัปเดตภายใน 24 ชม.
          rejected_reason: reservation.rejected_reason
        }
      })

      return {
        success: true,
        data: {
          notifications,
          unread_count: notifications.filter(n => n.is_new).length,
          total_count: notifications.length
        }
      }

    } catch (error) {
      console.error('❌ Error fetching user notifications:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแจ้งเตือน'
      }
    }
  })

  // API สำหรับ mark notification as read
  .put('/:id/read', async ({ user, params, set }) => {
    try {
      const notificationId = parseInt(params.id)
      
      if (!notificationId) {
        set.status = 400
        return { success: false, message: 'ไม่พบข้อมูล notification ID' }
      }

      console.log('🔔 [Mark as Read] User:', user.user_id, 'Notification:', notificationId)

      // ค้นหา reservation ที่ตรงกับ ID
      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: notificationId },
        include: {
          users: { select: { user_id: true } },
          meeting_room: { 
            select: { 
              department: true,
              room_name: true 
            } 
          }
        }
      })

      if (!reservation) {
        set.status = 404
        return { success: false, message: 'ไม่พบการจองนี้' }
      }

      // ตรวจสอบสิทธิ์การเข้าถึง
      const isUser = reservation.users.user_id === user.user_id
      const isOfficer = user.department === reservation.meeting_room?.department
      
      if (!isUser && !isOfficer) {
        set.status = 403
        return { success: false, message: 'ไม่มีสิทธิ์เข้าถึงการแจ้งเตือนนี้' }
      }

      // อัปเดต read status ในฐานข้อมูล โดยใช้ field ใหม่
      // เนื่องจากไม่มี notification table แยก จึงใช้วิธีอื่น
      // เก็บข้อมูล read status ใน localStorage หรือ session ของ frontend
      
      console.log('✅ [Mark as Read] Notification marked as read:', notificationId)

      return {
        success: true,
        message: 'อัปเดตสถานะการอ่านแล้ว',
        data: {
          reservation_id: notificationId,
          marked_read_at: new Date()
        }
      }

    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการอ่าน'
      }
    }
  })

  // API สำหรับลบ notification (ใช้ localStorage จัดการใน frontend)
  .delete('/:id', async ({ user, params, set }) => {
    try {
      const notificationId = parseInt(params.id)
      
      if (!notificationId) {
        set.status = 400
        return { success: false, message: 'ไม่พบข้อมูล notification ID' }
      }

      console.log('🗑️ [Delete Notification] User:', user.user_id, 'Notification:', notificationId)

      // ค้นหา reservation ที่ตรงกับ ID
      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: notificationId },
        include: {
          users: { select: { user_id: true } },
          meeting_room: { 
            select: { 
              department: true,
              room_name: true 
            } 
          }
        }
      })

      if (!reservation) {
        set.status = 404
        return { success: false, message: 'ไม่พบการจองนี้' }
      }

      // ตรวจสอบสิทธิ์การเข้าถึง
      const isUser = reservation.users.user_id === user.user_id
      const isOfficer = user.department === reservation.meeting_room?.department
      
      if (!isUser && !isOfficer) {
        set.status = 403
        return { success: false, message: 'ไม่มีสิทธิ์ลบการแจ้งเตือนนี้' }
      }

      // เนื่องจากไม่มี notification table แยก
      // การลบจะทำใน frontend ด้วย localStorage
      // API นี้แค่ return success เพื่อให้ frontend รู้ว่าลบได้
      
      console.log('✅ [Delete Notification] Notification can be deleted:', notificationId)

      return {
        success: true,
        message: 'ลบการแจ้งเตือนสำเร็จ',
        data: {
          reservation_id: notificationId,
          deleted_at: new Date()
        }
      }

    } catch (error) {
      console.error('❌ Error deleting notification:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบการแจ้งเตือน'
      }
    }
  })

// ==========================================
// Helper Functions
// ==========================================

// คำนวณเวลาที่ผ่านมา (เช่น "5 นาทีที่แล้ว")
function getTimeAgo(date) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'เมื่อสักครู่'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`
  } else if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`
  } else {
    return `${diffDays} วันที่แล้ว`
  }
}

// เช็คว่าเป็นข้อมูลล่าสุดหรือไม่ (ภายในจำนวนชั่วโมงที่กำหนด)
function isRecent(date, hours = 24) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffHours = diffMs / (1000 * 60 * 60)
  
  return diffHours <= hours
}