// ===================================================================
// Meeting Room APIs - ระบบจัดการห้องประชุม
// ===================================================================
// ไฟล์นี้จัดการ:
// - GET /api/rooms - ดูรายการห้องประชุมทั้งหมด (ไม่ต้อง auth)
// - GET /api/rooms/:id - ดูรายละเอียดห้องประชุม (ไม่ต้อง auth)
// 
// ⚠️ ADMIN ไม่มีสิทธิ์จัดการห้องประชุม - จัดการแค่สมาชิกเท่านั้น
// ✅ OFFICER เท่านั้นที่จัดการห้องประชุมในคณะ/ตึกตัวเองได้
// ===================================================================

import { Elysia } from 'elysia'
import prisma from '../lib/prisma.js'
import { authMiddleware, isOfficer, canManageRoom } from '../middleware/index.js'
import { getDepartmentFromPosition } from '../utils/positions.js'

// Public Room APIs (ไม่ต้อง authentication)
export const roomRoutes = new Elysia({ prefix: '/rooms' })
  
  // API สำหรับเสิร์ฟรูปภาพจาก database
  .get('/image/:id', async ({ params, set }) => {
    try {
      const roomId = parseInt(params.id)
      
      const room = await prisma.meeting_room.findUnique({
        where: { room_id: roomId },
        select: { image: true }
      })
      
      if (!room || !room.image) {
        set.status = 404
        set.headers['Content-Type'] = 'text/plain'
        return 'Image not found'
      }
      
      // ส่งรูปเป็น binary response ตรงๆ
      set.headers['Content-Type'] = 'image/png'
      set.headers['Cache-Control'] = 'public, max-age=3600' // cache 1 ชั่วโมง
      return room.image
      
    } catch (error) {
      set.status = 500
      return { success: false, message: 'Error serving image' }
    }
  })

  // ดูรายการห้องประชุมทั้งหมด
  .get('/', async ({ query, request, set }) => {
    try {
      const { status, capacity, search, department } = query
      
      // ⚠️ SECURITY CHECK: หาก request มี Authorization header แสดงว่าเป็น authenticated user
      // ต้องตรวจสอบสิทธิ์การดูห้องประชุม
      let authenticatedUser = null
      try {
        if (request.headers.authorization) {
          authenticatedUser = await authMiddleware(request, set)
          if (authenticatedUser.success === false) {
            // หากมี token แต่ invalid ให้ clear authenticatedUser
            authenticatedUser = null
          }
        }
      } catch (error) {
        // หาก auth middleware ล้มเหลว ให้ดำเนินการเป็น public request
        authenticatedUser = null
      }
      
      // สร้าง filter conditions
      const where = {}
      
      if (status) {
        where.status_m = status
      }
      
      if (capacity) {
        where.capacity = { gte: parseInt(capacity) }
      }

      // ⚠️ SECURITY FIX: Officer สามารถดูได้เฉพาะห้องตาม department เท่านั้น
      if (authenticatedUser && authenticatedUser.role === 'officer') {
        if (authenticatedUser.department) {
          where.department = authenticatedUser.department // บังคับให้เห็นเฉพาะห้องที่มีสิทธิ์ตาม department
        } else {
          // หาก Officer ไม่มี department ให้ return empty result
          where.room_id = -1 // Impossible room_id to return no results
        }
      } else if (department) {
        // สำหรับ role อื่นๆ หรือ public request ให้ filter ตาม parameter ปกติ
        where.department = department
      }
      
      if (search) {
        where.OR = [
          { room_name: { contains: search, mode: 'insensitive' } },
          { location_m: { contains: search, mode: 'insensitive' } },
          { details_m: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } }
        ]
      }

      const rooms = await prisma.meeting_room.findMany({
        where,
        select: {
          room_id: true,
          room_name: true,
          capacity: true,
          location_m: true,
          department: true,  // เพิ่ม department
          status_m: true,
          image: true, // 🖼️ เพิ่ม image เพื่อตรวจสอบว่ามีรูปหรือไม่
          details_m: true,
          created_at: true,
          updated_at: true,
          equipment: {
            select: {
              equipment_id: true,
              equipment_n: true,
              quantity: true
            }
          },
          _count: {
            select: {
              reservation: {
                where: {
                  status_r: 'approved',
                  end_at: {
                    gte: new Date() // เฉพาะการจองที่ยังไม่หมดอายุ
                  }
                }
              },
              review: true
            }
          }
        },
        orderBy: { room_name: 'asc' }
      })

      // 🖼️ แปลง image binary เป็น hasImage boolean และลบ binary data ออก
      const roomsWithImageFlag = rooms.map(room => ({
        ...room,
        hasImage: !!room.image, // แปลงเป็น boolean
        has_image: !!room.image, // เพิ่มเพื่อ compatibility
        active_bookings_count: room._count.reservation, // จำนวนการจองที่ใช้งานอยู่
        image: undefined // ลบ binary data ออกเพื่อประสิทธิภาพ
      }))

      return {
        success: true,
        message: 'รายการห้องประชุม',
        rooms: roomsWithImageFlag,
        total: roomsWithImageFlag.length
      }

    } catch (error) {
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องประชุม'
      }
    }
  })

  // ดูรายละเอียดห้องประชุมตาม ID
  .get('/:id', async ({ params, set }) => {
    try {
      const roomId = parseInt(params.id)
      
      if (isNaN(roomId)) {
        set.status = 400
        return {
          success: false,
          message: 'ID ห้องประชุมไม่ถูกต้อง'
        }
      }

      const room = await prisma.meeting_room.findUnique({
        where: { room_id: roomId },
        select: {
          room_id: true,
          room_name: true,
          capacity: true,
          location_m: true,
          department: true,  // เพิ่ม department
          status_m: true,
          image: true,
          details_m: true,
          created_at: true,
          updated_at: true,
          equipment: {
            select: {
              equipment_id: true,
              equipment_n: true,
              quantity: true
            }
          },
          review: {
            select: {
              review_id: true,
              comment: true,
              rating: true,
              created_at: true,
              users: {
                select: {
                  first_name: true,
                  last_name: true
                }
              }
            },
            orderBy: { created_at: 'desc' },
            take: 10 // แสดงรีวิวล่าสุด 10 รายการ
          },
          _count: {
            select: {
              reservation: true,
              review: true
            }
          }
        }
      })

      if (!room) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบห้องประชุมที่ระบุ'
        }
      }

      // คำนวณคะแนนรีวิวเฉลี่ย
      const reviews = await prisma.review.findMany({
        where: { room_id: roomId },
        select: { rating: true }
      })

      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
        : 0

      return {
        success: true,
        message: 'รายละเอียดห้องประชุม',
        room: {
          ...room,
          average_rating: parseFloat(averageRating.toFixed(1)),
          total_reviews: reviews.length
        }
      }

    } catch (error) {
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องประชุม'
      }
    }
  })

// Protected Room Management APIs (เฉพาะ Officer เท่านั้น - จัดการห้องใน department ตัวเอง)
// ⚠️ Admin ไม่มีสิทธิ์จัดการห้องประชุม - จัดการแค่สมาชิกเท่านั้น
export const officerRoomRoutes = new Elysia({ prefix: '/protected/officer' })
  .group('/rooms', app =>
    app
      // สร้างห้องประชุมใหม่ (ใน department ตัวเอง)
      .post('/', async ({ request, body, set }) => {
        // ตรวจสอบสิทธิ์ officer
        const user = await authMiddleware(request, set)
        if (user.success === false) return user
        
        if (!isOfficer(user)) {
          set.status = 403
          return {
            success: false,
            message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
          }
        }

        try {
          // จัดการข้อมูลจาก body (Elysia ได้ parse FormData แล้ว)
          const room_name = body.room_name
          const capacity = body.capacity
          const location_m = body.location_m
          const status_m = body.status_m || 'available'
          const details_m = body.details_m || null
          
          // จัดการอุปกรณ์
          let equipment = []
          if (body.equipment) {
            try {
              equipment = typeof body.equipment === 'string' 
                ? JSON.parse(body.equipment) 
                : body.equipment
            } catch (e) {
              equipment = []
            }
          }

          // จัดการรูปภาพ - เก็บใน database เป็น binary data
          let imageBuffer = null
          if (body.image && typeof body.image === 'object' && body.image.name) {
            try {
              // แปลงไฟล์เป็น Buffer เพื่อเก็บใน database
              const arrayBuffer = await body.image.arrayBuffer()
              imageBuffer = Buffer.from(arrayBuffer)
            } catch (error) {
              imageBuffer = null
            }
          }

          if (!room_name || !capacity || !location_m) {
            set.status = 400
            return {
              success: false,
              message: 'กรุณากรอกข้อมูลที่จำเป็น: ชื่อห้อง, ความจุ, สถานที่'
            }
          }

          // ⚠️ SECURITY FIX: ใช้ department จาก JWT middleware
          if (!user.department) {
            set.status = 403
            return {
              success: false,
              message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
            }
          }

          // สร้างห้องประชุมใหม่ (department ตาม department ของผู้ใช้)
          const newRoom = await prisma.meeting_room.create({
            data: {
              room_name,
              capacity: parseInt(capacity),
              location_m,
              department: user.department, // ⚠️ SECURITY FIX: ใช้ department
              status_m,
              image: imageBuffer, // เก็บรูปเป็น binary data ใน database
              details_m
            }
          })

          // เพิ่มอุปกรณ์ถ้ามี
          if (equipment && Array.isArray(equipment) && equipment.length > 0) {
            await prisma.equipment.createMany({
              data: equipment.map(item => ({
                room_id: newRoom.room_id,
                equipment_n: item.equipment_n,
                quantity: parseInt(item.quantity)
              }))
            })
          }

          return {
            success: true,
            message: 'สร้างห้องประชุมใหม่สำเร็จ',
            room: newRoom
          }

        } catch (error) {
          console.error('❌ Error creating room:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างห้องประชุม'
          }
        }
      })

      // แก้ไขห้องประชุม (เฉพาะห้องใน department ตัวเอง)
      .put('/:id', async ({ request, params, body, set }) => {
        // ตรวจสอบสิทธิ์ officer
        const user = await authMiddleware(request, set)
        if (user.success === false) return user
        
        if (!isOfficer(user)) {
          set.status = 403
          return {
            success: false,
            message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
          }
        }

        try {
          const roomId = parseInt(params.id)
          
          if (isNaN(roomId)) {
            set.status = 400
            return {
              success: false,
              message: 'ID ห้องประชุมไม่ถูกต้อง'
            }
          }

          // ตรวจสอบว่าห้องมีอยู่จริงและอยู่ใน department ของ officer
          const existingRoom = await prisma.meeting_room.findUnique({
            where: { room_id: roomId }
          })

          if (!existingRoom) {
            set.status = 404
            return {
              success: false,
              message: 'ไม่พบห้องประชุมที่ระบุ'
            }
          }

          // เช็คสิทธิ์ในการจัดการห้องนี้
          if (!(await canManageRoom(user, existingRoom.department))) {
            set.status = 403
            return {
              success: false,
              message: 'คุณไม่มีสิทธิ์จัดการห้องประชุมนี้'
            }
          }

          const { room_name, capacity, location_m, status_m, details_m } = body

          // จัดการอุปกรณ์ (เหมือนกับ POST)
          let equipment = []
          if (body.equipment) {
            try {
              equipment = typeof body.equipment === 'string' 
                ? JSON.parse(body.equipment) 
                : body.equipment
            } catch (e) {
              equipment = []
            }
          }

          // ⚡ ไม่จัดการรูปภาพใน PUT API แล้ว (ใช้ PUT /:id/image แทน)

          // อัปเดตข้อมูลห้อง (ไม่อนุญาตให้เปลี่ยน department)
          const updatedRoom = await prisma.meeting_room.update({
            where: { room_id: roomId },
            data: {
              ...(room_name && { room_name }),
              ...(capacity && { capacity: parseInt(capacity) }),
              ...(location_m && { location_m }),
              ...(status_m && { status_m }),
              ...(details_m !== undefined && { details_m }),
              updated_at: new Date()  // ⚡ ไม่อัพเดทรูป ทำให้เร็วขึ้น
            }
          })

          // อัปเดตอุปกรณ์ - ลบอุปกรณ์เก่าทั้งหมดแล้วเพิ่มใหม่
          await prisma.equipment.deleteMany({
            where: { room_id: roomId }
          })

          // เพิ่มอุปกรณ์ใหม่ถ้ามี
          if (equipment && Array.isArray(equipment) && equipment.length > 0) {
            await prisma.equipment.createMany({
              data: equipment.map(item => ({
                room_id: roomId,
                equipment_n: item.equipment_n,
                quantity: parseInt(item.quantity)
              }))
            })
          }

          return {
            success: true,
            message: 'แก้ไขข้อมูลห้องประชุมสำเร็จ',
            room: updatedRoom
          }

        } catch (error) {
          console.error('❌ Error updating room:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการแก้ไขห้องประชุม'
          }
        }
      })

      // 🚀 อัพโหลดรูปภาพแยกต่างหาก (Fast Image Upload)
      .put('/:id/image', async ({ request, params, body, set }) => {
        // ตรวจสอบสิทธิ์ officer
        const user = await authMiddleware(request, set)
        if (user.success === false) return user
        
        if (!isOfficer(user)) {
          set.status = 403
          return {
            success: false,
            message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
          }
        }

        try {
          const roomId = parseInt(params.id)
          
          if (isNaN(roomId)) {
            set.status = 400
            return {
              success: false,
              message: 'ID ห้องประชุมไม่ถูกต้อง'
            }
          }

          // ตรวจสอบว่าห้องมีอยู่จริงและอยู่ใน department ของ officer
          const existingRoom = await prisma.meeting_room.findUnique({
            where: { room_id: roomId }
          })

          if (!existingRoom) {
            set.status = 404
            return {
              success: false,
              message: 'ไม่พบห้องประชุมที่ระบุ'
            }
          }

          if (existingRoom.department !== user.department) {
            set.status = 403
            return {
              success: false,
              message: 'คุณไม่มีสิทธิ์แก้ไขห้องประชุมนี้'
            }
          }

          // จัดการรูปภาพจาก FormData
          const image = body.image
          if (!image) {
            set.status = 400
            return {
              success: false,
              message: 'กรุณาเลือกไฟล์รูปภาพ'
            }
          }

          if (!image.name) {
            set.status = 400
            return {
              success: false,
              message: 'ไฟล์รูปภาพไม่ถูกต้อง'
            }
          }

          // แปลงไฟล์เป็น Buffer เพื่อเก็บใน database
          let arrayBuffer, imageBuffer
          try {
            arrayBuffer = await image.arrayBuffer()
            imageBuffer = Buffer.from(arrayBuffer)
          } catch (bufferError) {
            console.error('Error converting image to buffer in /rooms/:id/image:', bufferError)
            set.status = 500
            return {
              success: false,
              message: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ'
            }
          }

          // อัพเดทเฉพาะรูปภาพ
          let updatedRoom
          try {
            updatedRoom = await prisma.meeting_room.update({
              where: { room_id: roomId },
              data: {
                image: imageBuffer,
                updated_at: new Date()
              },
              select: {
                room_id: true,
                image: true,
                updated_at: true
              }
            })
          } catch (dbError) {
            console.error('Database error saving room image in /rooms/:id/image:', dbError)
            set.status = 500
            return {
              success: false,
              message: 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ'
            }
          }

          return {
            success: true,
            message: 'อัพโหลดรูปภาพสำเร็จ'
          }

        } catch (error) {
          console.error('❌ Error uploading image:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ'
          }
        }
      })

      // 🗑️ ลบรูปภาพของห้องประชุม
      .delete('/:id/image', async ({ request, params, set }) => {
        try {
          // ตรวจสอบสิทธิ์ officer
          const user = await authMiddleware(request, set)
          if (user.success === false) return user

          const roomId = parseInt(params.id)
          if (!roomId) {
            set.status = 400
            return {
              success: false,
              message: 'ID ห้องประชุมไม่ถูกต้อง'
            }
          }

          // ตรวจสอบว่าห้องประชุมมีอยู่และอยู่ใน department เดียวกัน
          const room = await prisma.meeting_room.findFirst({
            where: {
              room_id: roomId,
              department: user.department
            }
          })

          if (!room) {
            set.status = 404
            return {
              success: false,
              message: 'ไม่พบห้องประชุมหรือไม่มีสิทธิ์เข้าถึง'
            }
          }

          // ลบรูปภาพ (set เป็น null)
          await prisma.meeting_room.update({
            where: { room_id: roomId },
            data: {
              image: null,
              updated_at: new Date()
            }
          })

          return {
            success: true,
            message: 'ลบรูปภาพสำเร็จ'
          }

        } catch (error) {
          console.error('❌ Error deleting image:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบรูปภาพ'
          }
        }
      })

      // ลบห้องประชุม (เฉพาะห้องใน department ตัวเอง)
      .delete('/:id', async ({ request, params, set }) => {
        // ตรวจสอบสิทธิ์ officer
        const user = await authMiddleware(request, set)
        if (user.success === false) return user
        
        if (!isOfficer(user)) {
          set.status = 403
          return {
            success: false,
            message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
          }
        }

        try {
          const roomId = parseInt(params.id)
          
          if (isNaN(roomId)) {
            set.status = 400
            return {
              success: false,
              message: 'ID ห้องประชุมไม่ถูกต้อง'
            }
          }

          // ตรวจสอบว่าห้องมีอยู่จริงและอยู่ใน department ของ officer
          const existingRoom = await prisma.meeting_room.findUnique({
            where: { room_id: roomId }
          })

          if (!existingRoom) {
            set.status = 404
            return {
              success: false,
              message: 'ไม่พบห้องประชุมที่ระบุ'
            }
          }

          // เช็คสิทธิ์ในการจัดการห้องนี้
          if (!(await canManageRoom(user, existingRoom.department))) {
            set.status = 403
            return {
              success: false,
              message: 'คุณไม่มีสิทธิ์จัดการห้องประชุมนี้'
            }
          }

          // 🗑️ เริ่มลบห้องประชุมโดยไม่เช็คการจอง (ตามความต้องการของอาจารย์)

          // ลบข้อมูลที่เกี่ยวข้องก่อน (ตาม Foreign Key Dependencies)
          
          // 1. ลบ review ก่อน
          const reviewCount = await prisma.review.deleteMany({
            where: { room_id: roomId }
          })

          // 2. ลบ equipment ก่อน
          const equipmentCount = await prisma.equipment.deleteMany({
            where: { room_id: roomId }
          })

          // 3. ลบ reservations ทั้งหมดของห้องนี้
          const reservationCount = await prisma.reservation.deleteMany({
            where: { room_id: roomId }
          })

          // 4. สุดท้ายลบห้องประชุม
          await prisma.meeting_room.delete({
            where: { room_id: roomId }
          })

          return {
            success: true,
            message: 'ลบห้องประชุมสำเร็จ'
          }

        } catch (error) {
          console.error('❌ Error deleting room:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบห้องประชุม'
          }
        }
      })

      // ดูห้องประชุมใน department ตัวเอง
      .get('/', async ({ request, query, set }) => {
        // ตรวจสอบสิทธิ์ officer
        const user = await authMiddleware(request, set)
        if (user.success === false) return user
        
        if (!isOfficer(user)) {
          set.status = 403
          return {
            success: false,
            message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
          }
        }

        try {
          const { status, capacity, search } = query
          
          // ⚠️ SECURITY FIX: ใช้ department แทน user.department  
          if (!user.department) {
            set.status = 403
            return {
              success: false,
              message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
            }
          }
          
          // สร้าง filter conditions (เฉพาะ department ตัวเอง)
          const where = {
            department: user.department // ⚠️ SECURITY FIX: ใช้ department
          }
          
          if (status) {
            where.status_m = status
          }
          
          if (capacity) {
            where.capacity = { gte: parseInt(capacity) }
          }
          
          if (search) {
            where.OR = [
              { room_name: { contains: search, mode: 'insensitive' } },
              { location_m: { contains: search, mode: 'insensitive' } },
              { details_m: { contains: search, mode: 'insensitive' } }
            ]
          }

          const rooms = await prisma.meeting_room.findMany({
            where,
            select: {
              room_id: true,
              room_name: true,
              capacity: true,
              location_m: true,
              department: true,
              status_m: true,
              // � ใช้ _count แทนการดึง binary data เพื่อ performance
              details_m: true,
              created_at: true,
              updated_at: true,
              equipment: {
                select: {
                  equipment_id: true,
                  equipment_n: true,
                  quantity: true
                }
              },
              _count: {
                select: {
                  reservation: true,
                  review: true
                }
              }
            },
            orderBy: { room_name: 'asc' }
          })

          // � ตรวจสอบว่ามีรูปหรือไม่โดยไม่ดึง binary data
          const roomsWithImageCheck = await Promise.all(
            rooms.map(async (room) => {
              // เช็คว่ามี image หรือไม่โดยไม่ดึง binary data
              const imageCheck = await prisma.meeting_room.findUnique({
                where: { room_id: room.room_id },
                select: { image: true }
              })
              
              // 👥 คำนวณจำนวนคนที่กำลังใช้งานในขณะนี้
              const now = new Date()
              
              // ใช้เวลาประเทศไทย (UTC+7)
              const bangkokTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
              const today = bangkokTime.toISOString().split('T')[0] // YYYY-MM-DD
              const currentTime = bangkokTime.toISOString().split('T')[1].substring(0, 5) // HH:MM
              
              // หา reservation ที่กำลัง active อยู่ในขณะนี้ - รองรับ multi-day booking
              const allReservations = await prisma.reservation.findMany({
                where: {
                  room_id: room.room_id,
                  status_r: 'approved'
                },
                select: {
                  reservation_id: true,
                  user_id: true,
                  start_time: true,
                  end_time: true,
                  start_at: true,
                  is_multi_day: true,
                  booking_dates: true
                }
              })
              
              // กรองเฉพาะการจองที่กำลัง active ในขณะนี้ และการจองในอนาคต
              const activeReservations = allReservations.filter(reservation => {
                const currentDateTime = bangkokTime
                
                if (reservation.is_multi_day && reservation.booking_dates) {
                  // Multi-day booking: เช็คว่าวันนี้อยู่ในช่วงวันที่จองหรือไม่ หรือยังมีวันในอนาคต
                  const bookingDates = reservation.booking_dates.split(',')
                  const todayString = today
                  
                  // หาวันที่สุดท้ายที่จอง
                  const lastDate = bookingDates[bookingDates.length - 1]
                  
                  if (todayString <= lastDate) {
                    // ยังมีการจองที่ยังไม่สิ้นสุด (วันนี้หรือในอนาคต)
                    if (todayString === lastDate) {
                      // วันสุดท้ายคือวันนี้ เช็คเวลา
                      return reservation.end_time > currentDateTime
                    } else {
                      // ยังมีวันในอนาคต
                      return true
                    }
                  } else {
                    return false // หมดไปแล้ว
                  }
                } else {
                  // Single day booking: เช็คว่าการจองยังไม่จบสมบูรณ์
                  // รวมทั้งการจองในอนาคตและการจองที่กำลังดำเนินอยู่
                  return reservation.end_time > currentDateTime
                }
              })
              
              // ใช้จำนวนการจองทั้งหมดที่ยังมีผล (ไม่ใช่แค่ปัจจุบัน)
              const currentUsers = activeReservations.length
              
              return {
                ...room,
                has_image: !!imageCheck?.image, // ✅ ใช้ snake_case ตาม Frontend
                current_users: currentUsers // 👥 จำนวนคนที่กำลังใช้งานปัจจุบัน
              }
            })
          )

          return {
            success: true,
            message: `ห้องประชุมที่รับผิดชอบ (${user.department})`,
            rooms: roomsWithImageCheck,
            total: roomsWithImageCheck.length,
            department: user.department,
            position_info: {
              department: user.department,
              position: user.position
            }
          }

        } catch (error) {
          console.error('❌ Error fetching officer rooms:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องประชุม'
          }
        }
      })
  )
