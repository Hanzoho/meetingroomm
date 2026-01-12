// ===================================================================
// Protected Routes - APIs ที่ต้องการ JWT Authentication
// ===================================================================
// ไฟล์นี้จัดการ API ที่ต้องเข้าสู่ระบบ:
// - ใช้ Auth Middleware จาก ../middleware/auth.js
// - แยก level การเข้าถึงตาม role: user/officer/admin
// ===================================================================

import { Elysia } from 'elysia'
import { authMiddleware, isAdmin, isOfficer, isUser } from '../middleware/index.js'
import prisma from '../lib/prisma.js'
import { getTableFromPosition } from '../utils/positions.js'

export const protectedRoutes = new Elysia({ prefix: '/protected' })
  // API ทดสอบง่ายๆ (ไม่ต้อง auth)
  .get('/test', () => ({
    message: 'API ทำงานได้!!',
    timestamp: new Date().toISOString()
  }))

  // API สำหรับเสิร์ฟรูปโปรไฟล์จาก database
  .get('/profile/image/:role/:id', async ({ params, set }) => {
    try {
      const { role, id } = params
      const userId = parseInt(id)
      
      let user
      if (role === 'admin') {
        user = await prisma.admin.findUnique({
          where: { admin_id: userId },
          select: { profile_image: true }
        })
      } else if (role === 'user') {
        user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { profile_image: true }
        })
      }
      
      if (!user || !user.profile_image) {
        set.status = 404
        return { success: false, message: 'Profile image not found' }
      }
      
      // ส่งรูปเป็น response
      set.headers['Content-Type'] = 'image/jpeg'
      return new Response(user.profile_image)
      
    } catch (error) {
      console.error('❌ Error serving profile image:', error)
      set.status = 500
      return { success: false, message: 'Error serving profile image' }
    }
  })

  // === User Routes (ต้องมี user, officer, หรือ admin role) ===
  .group('/user', app =>
    app
      .get('/profile', async ({ request, set }) => {
        // เรียกใช้ auth middleware
        const user = await authMiddleware(request, set)
        
        // ถ้า middleware return error response
        if (user.success === false) {
          return user
        }
        
        // เช็ค role
        if (!isUser(user)) {
          set.status = 403
          return { 
            success: false, 
            message: 'ไม่มีสิทธิ์เข้าถึง' 
          }
        }
        
        return {
          success: true,
          message: 'ข้อมูลโปรไฟล์ของคุณ',
          profile: user
        }
      })
      .put('/profile', async ({ request, set, body }) => {
        try {
          // เรียกใช้ auth middleware
          const user = await authMiddleware(request, set)
          
          // ถ้า middleware return error response
          if (user.success === false) {
            return user
          }
          
          // เช็ค role
          if (!isUser(user)) {
            set.status = 403
            return { 
              success: false, 
              message: 'ไม่มีสิทธิ์เข้าถึง' 
            }
          }

          // ข้อมูลที่อนุญาตให้แก้ไข
          const allowedFields = ['first_name', 'last_name', 'email', 'citizen_id', 'position', 'department', 'zip_code']
          const updateData = {}
          
          // กรองเฉพาะข้อมูลที่อนุญาต
          for (const field of allowedFields) {
            if (body[field] !== undefined) {
              updateData[field] = body[field]
            }
          }

          // ตรวจสอบว่ามีข้อมูลที่จะอัปเดตหรือไม่
          if (Object.keys(updateData).length === 0) {
            set.status = 400
            return {
              success: false,
              message: 'ไม่มีข้อมูลที่จะอัปเดต'
            }
          }

          // กำหนด table ที่จะอัปเดตตาม role
          let tableName
          let idField
          let userId

          switch (user.role) {
            case 'user':
              tableName = 'users'
              idField = 'user_id'
              userId = user.user_id
              break
            case 'officer':
              tableName = 'officer'
              idField = 'officer_id'
              userId = user.officer_id
              break
            case 'admin':
              tableName = 'admin'
              idField = 'admin_id'
              userId = user.admin_id
              break
            case 'executive':
              tableName = 'executive'
              idField = 'executive_id'
              userId = user.executive_id
              break
            default:
              set.status = 400
              return {
                success: false,
                message: 'ไม่สามารถระบุ role ได้'
              }
          }

          // อัปเดตข้อมูลในฐานข้อมูล
          await prisma[tableName].update({
            where: {
              [idField]: userId
            },
            data: {
              ...updateData,
              updated_at: new Date()
            }
          })

          return {
            success: true,
            message: 'อัปเดตโปรไฟล์สำเร็จ',
            updated_fields: Object.keys(updateData)
          }

        } catch (error) {
          console.error('Error updating profile:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์'
          }
        }
      })
      .post('/profile/image', async ({ request, set, body }) => {
        try {
          // เรียกใช้ auth middleware
          const user = await authMiddleware(request, set)
          
          // ถ้า middleware return error response
          if (user.success === false) {
            return user
          }
          
          // เช็ค role
          if (!isUser(user)) {
            set.status = 403
            return { 
              success: false, 
              message: 'ไม่มีสิทธิ์เข้าถึง' 
            }
          }

          // ตรวจสอบไฟล์ที่อัปโหลด
          if (!body.profileImage || !(body.profileImage instanceof File)) {
            set.status = 400
            return {
              success: false,
              message: 'กรุณาเลือกไฟล์รูปภาพ'
            }
          }

          const file = body.profileImage
          
          // ตรวจสอบประเภทไฟล์
          const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
          if (!allowedExtensions.includes(ext)) {
            set.status = 400
            return {
              success: false,
              message: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF, WebP)'
            }
          }

          // ตรวจสอบขนาดไฟล์ (5MB)
          if (file.size > 5 * 1024 * 1024) {
            set.status = 400
            return {
              success: false,
              message: 'ขนาดไฟล์ต้องไม่เกิน 5MB'
            }
          }

          // เก็บรูปใน database แล้ว ไม่ใช้ filesystem

          // กำหนด table และ field ตาม role
          let tableName, idField, userId
          switch (user.role) {
            case 'admin':
              tableName = 'admin'
              idField = 'admin_id'
              userId = user.admin_id || user.user_id
              break
            case 'officer':
              tableName = 'officer'
              idField = 'officer_id'
              userId = user.officer_id || user.user_id
              break
            case 'executive':
              tableName = 'executive'
              idField = 'executive_id'
              userId = user.executive_id || user.user_id
              break
            default:
              tableName = 'users'
              idField = 'user_id'
              userId = user.user_id
          }

          // แปลงไฟล์เป็น Buffer เพื่อเก็บใน database
          const arrayBuffer = await file.arrayBuffer()
          const imageBuffer = Buffer.from(arrayBuffer)

          console.log('📷 Profile image converted to buffer, size:', imageBuffer.length, 'bytes')

          // อัปเดตรูปโปรไฟล์ในฐานข้อมูล (เก็บเป็น binary data)
          const updatedUser = await prisma[tableName].update({
            where: { [idField]: userId },
            data: { 
              profile_image: imageBuffer,
              updated_at: new Date()
            }
          })

          // รูปเก่าจะถูกเขียนทับใน database โดยอัตโนมัติ
          return {
            success: true,
            message: 'อัปโหลดรูปโปรไฟล์สำเร็จ',
            hasProfileImage: true
          }

        } catch (error) {
          console.error('Error uploading profile image:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
            error: error.message
          }
        }
      })
      .delete('/profile/image', async ({ request, set }) => {
        try {
          // เรียกใช้ auth middleware
          const user = await authMiddleware(request, set)
          
          // ถ้า middleware return error response
          if (user.success === false) {
            return user
          }
          
          // เช็ค role
          if (!isUser(user)) {
            set.status = 403
            return { 
              success: false, 
              message: 'ไม่มีสิทธิ์เข้าถึง' 
            }
          }

          // กำหนด table และ field ตาม role
          let tableName, idField, userId
          switch (user.role) {
            case 'admin':
              tableName = 'admin'
              idField = 'admin_id'
              userId = user.admin_id || user.user_id
              break
            case 'officer':
              tableName = 'officer'
              idField = 'officer_id'
              userId = user.officer_id || user.user_id
              break
            case 'executive':
              tableName = 'executive'
              idField = 'executive_id'
              userId = user.executive_id || user.user_id
              break
            default:
              tableName = 'users'
              idField = 'user_id'
              userId = user.user_id
          }

          // หารูปเก่าเพื่อลบ
          const currentUser = await prisma[tableName].findUnique({
            where: { [idField]: userId },
            select: { profile_image: true }
          })

          if (!currentUser.profile_image) {
            set.status = 400
            return {
              success: false,
              message: 'ไม่พบรูปโปรไฟล์ที่จะลบ'
            }
          }

          // ลบรูปจากระบบไฟล์
          const fs = await import('fs')
          const path = await import('path')
          const oldImagePath = path.join(process.cwd(), currentUser.profile_image.substring(1))
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath)
          }

          // อัปเดตฐานข้อมูลให้ profile_image เป็น null
          await prisma[tableName].update({
            where: { [idField]: userId },
            data: { 
              profile_image: null,
              updated_at: new Date()
            }
          })

          return {
            success: true,
            message: 'ลบรูปโปรไฟล์สำเร็จ'
          }

        } catch (error) {
          console.error('Error removing profile image:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบรูปภาพ',
            error: error.message
          }
        }
      })
      .get('/area', async ({ request, set }) => {
        // เรียกใช้ auth middleware
        const user = await authMiddleware(request, set)
        
        // ถ้า middleware return error response
        if (user.success === false) {
          return user
        }
        
        // เช็ค role
        if (!isUser(user)) {
          set.status = 403
          return { 
            success: false, 
            message: 'ไม่มีสิทธิ์เข้าถึง' 
          }
        }
        
        return {
          success: true,
          message: `สวัสดี ${user.first_name || 'Unknown'} ${user.last_name || ''}`,
          area: 'พื้นที่สำหรับผู้ใช้ทั่วไป',
          your_role: user.role || 'unknown',
          user_data: user
        }
      })
  )

// === Officer Routes (ต้องมี officer หรือ admin role) ===
export const officerRoutes = new Elysia({ prefix: '/protected' })
  .group('/officer', app =>
    app
      .get('/area', async ({ request, set }) => {
        // เรียกใช้ auth middleware
        const user = await authMiddleware(request, set)
        
        // ถ้า middleware return error response
        if (user.success === false) {
          return user
        }
        
        // เช็ค role
        if (!isOfficer(user)) {
          set.status = 403
          return { 
            success: false, 
            message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่หรือผู้ดูแลระบบเท่านั้น' 
          }
        }
        
        return {
          success: true,
          message: `สวัสดี ${user.first_name || 'Unknown'} ${user.last_name || ''} (เจ้าหน้าที่)`,
          area: 'พื้นที่สำหรับเจ้าหน้าที่',
          permissions: ['approve_reservations', 'manage_rooms'],
          your_role: user.role || 'unknown',
          user_data: user
        }
      })


      // === Officer Reports === 
      .get('/reports', async ({ request, query, set }) => {
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

          console.log('📊 Officer Reports - User:', user.email, 'Position:', user.position)
          const { period = 'current_month' } = query

          // ⚠️ SECURITY FIX: เจ้าหน้าที่เห็นเฉพาะข้อมูลในหน่วยงานที่รับผิดชอบ
          if (!user.department) {
            set.status = 403
            return {
              success: false,
              message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
            }
          }

          console.log('🏢 Officer department filter:', user.department)

          // คำนวณช่วงเวลาตาม period
          let startDate, endDate
          const now = new Date()
          
          switch (period) {
            case 'last_month':
              startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              endDate = new Date(now.getFullYear(), now.getMonth(), 0)
              break
            case 'last_3_months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
              break
            case 'last_6_months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
              break
            case 'current_quarter':
              const currentQuarter = Math.floor(now.getMonth() / 3)
              startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
              endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0)
              break
            case 'current_year':
              startDate = new Date(now.getFullYear(), 0, 1)
              endDate = new Date(now.getFullYear(), 11, 31)
              break
            default: // current_month
              startDate = new Date(now.getFullYear(), now.getMonth(), 1)
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          }

          console.log('📅 Date range:', startDate, 'to', endDate)

          // เตรียมข้อมูลสำหรับสถิติ
          const reservation_summary = []
          const room_utilization = []
          const monthly_trends = []

          // สถิติสรุปการจอง
          const totalReservations = await prisma.reservation.count({
            where: {
              meeting_room: {
                department: user.department
              },
              start_at: {
                gte: startDate,
                lte: endDate

              }
            }
          })


          const approvedReservations = await prisma.reservation.count({
            where: {
              meeting_room: {
                department: user.department
              },
              start_at: {
                gte: startDate,
                lte: endDate
              },
              status_r: 'approved'
            }
          })

          const pendingReservations = await prisma.reservation.count({
            where: {
              meeting_room: {
                department: user.department
              },
              start_at: {
                gte: startDate,
                lte: endDate
              },

              status_r: 'pending'
            }
          })


          const rejectedReservations = await prisma.reservation.count({
            where: {
              meeting_room: {
                department: user.department
              },
              start_at: {
                gte: startDate,
                lte: endDate
              },
              status_r: 'rejected'
            }
          })

          reservation_summary.push({
            category: 'การจองทั้งหมด',
            count: totalReservations,
            percentage: 100
          })

          if (totalReservations > 0) {
            reservation_summary.push({
              category: 'อนุมัติแล้ว',
              count: approvedReservations,
              percentage: Math.round((approvedReservations / totalReservations) * 100)
            })

            reservation_summary.push({
              category: 'รอการอนุมัติ',
              count: pendingReservations,
              percentage: Math.round((pendingReservations / totalReservations) * 100)
            })

            reservation_summary.push({
              category: 'ปฏิเสธ',
              count: rejectedReservations,
              percentage: Math.round((rejectedReservations / totalReservations) * 100)
            })
          }

          // สถิติการใช้งานห้องประชุม
          const roomUsageStats = await prisma.reservation.groupBy({
            by: ['room_id'],
            where: {
              meeting_room: {
                department: user.department
              },
              start_at: {
                gte: startDate,
                lte: endDate
              },
              status_r: 'approved'
            },
            _count: {
              reservation_id: true
            },
            orderBy: {
              _count: {
                reservation_id: 'desc'
              }
            }
          })

          for (const roomStat of roomUsageStats.slice(0, 10)) { // แสดง 10 ห้องแรก
            const room = await prisma.meeting_room.findUnique({
              where: { room_id: roomStat.room_id },
              select: { room_name: true }
            })

            room_utilization.push({
              room_name: room?.room_name || `ห้อง ${roomStat.room_id}`,
              usage_count: roomStat._count.reservation_id,
              percentage: Math.round((roomStat._count.reservation_id / approvedReservations) * 100) || 0
            })
          }

          // แนวโน้มการจองรายเดือน (สำหรับ 6 เดือนย้อนหลัง)
          for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
            
            const monthlyReservations = await prisma.reservation.count({
              where: {
                meeting_room: {
                  department: user.department
                },
                start_at: {
                  gte: monthDate,
                  lte: nextMonth
                },
                status_r: 'approved'
              }
            })

            monthly_trends.push({
              month: monthDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' }),
              reservations: monthlyReservations
            })
          }

          return {
            success: true,
            data: {
              reservation_summary,
              room_utilization,
              monthly_trends
            },
            meta: {
              department: user.department,
              period,
              date_range: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
              }

            }
          }

        } catch (error) {

          console.error('❌ Error in officer reports:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงาน',
            error: error.message

          }
        }
      })

      // === Officer Reviews (รายงานปัญหาและข้อเสนอแนะ) ===
      .get('/reviews', async ({ request, query, set }) => {
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
          // 📄 Pagination parameters
          const page = parseInt(query.page) || 1
          const limit = parseInt(query.limit) || 5
          const offset = (page - 1) * limit

          console.log('📝 Officer Reviews - User:', user.email, 'Department:', user.department)
          console.log('📄 Pagination - Page:', page, 'Limit:', limit, 'Offset:', offset)

          // ⚠️ SECURITY: เจ้าหน้าที่เห็นเฉพาะรีวิวของห้องประชุมในหน่วยงานตัวเอง
          if (!user.department) {
            set.status = 403
            return {
              success: false,
              message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
            }
          }

          // นับจำนวนรีวิวทั้งหมด
          const totalReviews = await prisma.review.count({
            where: {
              meeting_room: {
                department: user.department
              }
            }
          })

          const reviews = await prisma.review.findMany({
            where: {
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
                  email: true,
                  profile_image: true,
                  department: true,
                  position: true,
                  citizen_id: true
                }
              },
              meeting_room: {
                select: {
                  room_id: true,
                  room_name: true,
                  department: true
                }
              }
            },
            orderBy: {
              created_at: 'desc'
            },
            skip: offset,
            take: limit
          })

          const formattedReviews = reviews.map(review => ({
            review_id: review.review_id,
            // ข้อมูลผู้ใช้พื้นฐาน
            user_name: review.users ? `${review.users.first_name || ''} ${review.users.last_name || ''}`.trim() : 'ไม่ระบุชื่อ',
            first_name: review.users?.first_name || null,
            last_name: review.users?.last_name || null,
            user_email: review.users?.email || null,
            citizen_id: review.users?.citizen_id || null,
            
            // ข้อมูลโปรไฟล์และตำแหน่ง (แปลง Bytes เป็น base64 หากมี)
            user_profile_image: review.users?.profile_image ? 
              `data:image/jpeg;base64,${Buffer.from(review.users.profile_image).toString('base64')}` : null,
            user_department: review.users?.department || null,
            user_position: review.users?.position || null,
            
            // ข้อมูลห้องประชุมและรีวิว
            room_name: review.meeting_room?.room_name || 'ไม่ระบุห้อง',
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            department: review.meeting_room?.department
          }))

          const totalPages = Math.ceil(totalReviews / limit)

          console.log('📝 Found', formattedReviews.length, 'reviews for department:', user.department)
          console.log('📄 Pagination info - Total:', totalReviews, 'Pages:', totalPages, 'Current page:', page)

          return {
            success: true,
            reviews: formattedReviews,
            pagination: {
              current_page: page,
              total_pages: totalPages,
              total_items: totalReviews,
              items_per_page: limit,
              has_prev: page > 1,
              has_next: page < totalPages
            },
            total: totalReviews,
            department: user.department
          }

        } catch (error) {
          console.error('❌ Error fetching officer reviews:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงานปัญหา',
            error: error.message
          }
        }
      })

      // === Officer Approval History (ประวัติการอนุมัติ) ===
      .get('/approval-history', async ({ request, query, set }) => {
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
          const { status = 'all', limit = 10, offset = 0, page = 1 } = query
          
          // คำนวณ offset จาก page
          const actualOffset = (parseInt(page) - 1) * parseInt(limit)
          
          // ⚠️ SECURITY: เจ้าหน้าที่เห็นเฉพาะในคณะที่รับผิดชอบ
          if (!user.department) {
            set.status = 403
            return {
              success: false,
              message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
            }
          }
          
          console.log(`📋 [APPROVAL HISTORY] ${user.position} accessing: ${user.department}`)
          
          // เงื่อนไข: การจองเก่า (เก่ากว่า 2 วัน) + ในคณะที่รับผิดชอบ
          const twoDaysAgo = new Date()
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
          
          const where = {
            // เฉพาะห้องที่ยังอยู่ในคณะนี้ (ไม่เอาห้องที่ถูกลบแล้ว)
            meeting_room: {
              department: user.department
            },
            // การจองที่เก่ากว่า 2 วัน (สำหรับประวัติ)
            created_at: {
              lt: twoDaysAgo
            }
          }
          
          // กรอง status ถ้าไม่ใช่ 'all'
          if (status && status !== 'all') {
            where.status_r = status
          }

          // นับจำนวนรวม
          const total = await prisma.reservation.count({ where })
          
          // ดึงข้อมูล (เรียงจากใหม่มาเก่า)
          const reservations = await prisma.reservation.findMany({
            where,
            include: {
              users: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                  department: true
                }
              },
              meeting_room: {
                select: {
                  room_name: true,
                  location_m: true,
                  capacity: true
                }
              },
              officer: {
                select: {
                  first_name: true,
                  last_name: true
                }
              }
            },
            orderBy: {
              created_at: 'desc' // เรียงใหม่มาเก่า (ตรงข้ามกับหน้า approvals)
            },
            skip: actualOffset,
            take: parseInt(limit)
          })

          console.log(`📋 Found ${reservations.length} approval history records (total: ${total})`)

          return {
            success: true,
            message: `ประวัติการอนุมัติในคณะ ${user.department} (${total} รายการ)`,
            department: user.department,
            reservations: reservations.map(r => {
              // จัดการกรณีห้องถูกลบ - แยกชื่อห้องจาก details_r
              let roomName = r.meeting_room?.room_name
              let location = r.meeting_room?.location_m
              
              if (!roomName && r.details_r) {
                // ค้นหาชื่อห้องใน details_r ที่เก็บไว้
                const match = r.details_r.match(/\[ห้องประชุม: (.+?) \(.+?\) - ถูกลบแล้ว\]/)
                roomName = match ? `${match[1]} (ถูกลบแล้ว)` : 'ห้องประชุม (ถูกลบแล้ว)'
                location = 'ไม่ทราบ'
              }
              
              return {
                reservation_id: r.reservation_id,
                room_name: roomName || 'ห้องประชุม (ถูกลบแล้ว)',
                location: location || 'ไม่ทราบ',
                reserved_by: `${r.users.first_name} ${r.users.last_name}`,
                start_date: r.start_at,
                end_date: r.end_at,
                start_time: r.start_time,
                end_time: r.end_time,
                details: r.details_r,
                status: r.status_r,
                created_at: r.created_at,
                approved_by: r.officer ? `${r.officer.first_name} ${r.officer.last_name}` : null,
                rejected_reason: r.rejected_reason,
                updated_at: r.updated_at
              }
            }),
            pagination: {
              current_page: parseInt(page),
              total_pages: Math.ceil(total / parseInt(limit)),
              total_items: total,
              items_per_page: parseInt(limit),
              has_prev: parseInt(page) > 1,
              has_next: parseInt(page) < Math.ceil(total / parseInt(limit))
            }
          }

        } catch (error) {
          console.error('❌ Error fetching approval history:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงประวัติการอนุมัติ'
          }
        }
      })

      // === Officer Stats (Dashboard Statistics) ===
      .get('/stats', async ({ request, set }) => {
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
          console.log('📊 Officer Stats - User:', user.email, 'Position:', user.position)

          // ตรวจสอบสิทธิ์การดูแลห้องประชุม
          if (!user.department) {
            set.status = 403
            return {
              success: false,
              message: 'ไม่พบข้อมูลหน่วยงานที่สังกัด'
            }
          }

          const today = new Date()
          const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

          // 1. ดึงห้องประชุมของฉัน (ในหน่วยงานที่รับผิดชอบ) พร้อมสถิติการจอง
          const myRooms = await prisma.meeting_room.findMany({
            where: {
              department: user.department
            },
            include: {
              _count: {
                select: {
                  reservation: {
                    where: {
                      status_r: 'approved', // เฉพาะที่อนุมัติแล้ว
                      // ไม่รวมการจองที่ถูกยกเลิก (ตรวจสอบตามสถานะอื่น ๆ ถ้ามี)
                    }
                  }
                }
              }
            }
          })

          // 2. สถิติการจองตามหน่วยงานของผู้ใช้ที่มาจอง (ไม่ใช่หน่วยงานของเจ้าหน้าที่)
          const departmentReservationStats = await prisma.reservation.findMany({
            where: {
              meeting_room: {
                department: user.department
              },
              status_r: 'approved', // เฉพาะที่อนุมัติแล้ว
            },
            include: {
              users: {
                select: {
                  department: true
                }
              }
            }
          })

          // จัดกลุ่มสถิติตามหน่วยงานของผู้ใช้ที่จอง
          const departmentBookingStats = {}
          departmentReservationStats.forEach(reservation => {
            const userDepartment = reservation.users?.department || 'ไม่ระบุหน่วยงาน'
            if (!departmentBookingStats[userDepartment]) {
              departmentBookingStats[userDepartment] = 0
            }
            departmentBookingStats[userDepartment]++
          })

          // แปลงเป็น array และเรียงลำดับ
          const departmentStatsArray = Object.entries(departmentBookingStats).map(([department, bookings]) => ({
            department,
            bookings,
            percentage: 100 // จะคำนวณเปอร์เซ็นต์ใน frontend
          })).sort((a, b) => b.bookings - a.bookings)

          // 3. การจองที่รอการอนุมัติในหน่วยงานของฉัน
          const myDepartmentPendingApprovals = await prisma.reservation.count({
            where: {
              meeting_room: {
                department: user.department
              },
              status_r: 'pending'
            }
          })

          // 4. การจองในเดือนนี้ของหน่วยงานที่ดูแล
          const myDepartmentThisMonthReservations = await prisma.reservation.count({
            where: {
              meeting_room: {
                department: user.department
              },
              status_r: 'approved',
              start_at: {
                gte: thisMonth,
                lte: nextMonth
              }
            }
          })

          // 5. การจองวันนี้ทั้งระบบ
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
          
          const todayReservations = await prisma.reservation.count({
            where: {
              start_at: {
                gte: todayStart,
                lt: todayEnd
              }
            }
          })

          // 6. สถิติการใช้ห้องประชุมทั้งหมดในระบบ
          const allRooms = await prisma.meeting_room.findMany({
            include: {
              _count: {
                select: {
                  reservation: {
                    where: {
                      status_r: 'approved', // เฉพาะที่อนุมัติแล้ว
                    }
                  }
                }
              }
            },
            orderBy: {
              reservation: {
                _count: 'desc' // เรียงจากห้องที่ถูกจองมากที่สุด
              }
            }
          })

          // 7. สถิติการจองตามหน่วยงานทั้งหมดในระบบ (ของผู้ใช้ที่จอง)
          const allDepartmentReservationStats = await prisma.reservation.findMany({
            where: {
              status_r: 'approved', // เฉพาะที่อนุมัติแล้ว
            },
            include: {
              users: {
                select: {
                  department: true
                }
              }
            }
          })

          // จัดกลุ่มสถิติตามหน่วยงานของผู้ใช้ทั้งระบบ
          const allDepartmentBookingStats = {}
          allDepartmentReservationStats.forEach(reservation => {
            const userDepartment = reservation.users?.department || 'ไม่ระบุหน่วยงาน'
            if (!allDepartmentBookingStats[userDepartment]) {
              allDepartmentBookingStats[userDepartment] = 0
            }
            allDepartmentBookingStats[userDepartment]++
          })

          // แปลงเป็น array และเรียงลำดับ พร้อมคำนวณเปอร์เซ็นต์
          const totalAllBookings = allDepartmentReservationStats.length
          const allDepartmentStatsArray = Object.entries(allDepartmentBookingStats).map(([department, bookings]) => ({
            department,
            bookings,
            percentage: totalAllBookings > 0 ? ((bookings / totalAllBookings) * 100).toFixed(1) : 0
          })).sort((a, b) => b.bookings - a.bookings)

          const stats = {
            // สถิติห้องประชุมของเจ้าหน้าที่
            my_rooms_stats: {
              total_rooms: myRooms.length,
              rooms_detail: myRooms.map(room => ({
                room_id: room.room_id,
                room_name: room.room_name,
                capacity: room.capacity,
                department: room.department,
                bookings: room._count.reservation
              }))
            },
            
            // สถิติการจองตามหน่วยงานของผู้ใช้ที่มาจอง (เฉพาะห้องที่ดูแล)
            department_booking_stats: {
              data: departmentStatsArray,
              total_bookings: departmentReservationStats.length
            },
            
            // สถิติห้องประชุมทั้งหมดในระบบ
            all_rooms_stats: {
              total_rooms: allRooms.length,
              rooms_detail: allRooms.map(room => ({
                room_id: room.room_id,
                room_name: room.room_name,
                capacity: room.capacity,
                department: room.department,
                bookings: room._count.reservation
              })),
              total_bookings: allRooms.reduce((sum, room) => sum + room._count.reservation, 0)
            },
            
            // สถิติการจองตามหน่วยงานทั้งหมดในระบบ
            all_department_booking_stats: {
              data: allDepartmentStatsArray,
              total_bookings: totalAllBookings
            },
            
            // สถิติหน่วยงานของเจ้าหน้าที่
            my_department_stats: {
              this_month_reservations: myDepartmentThisMonthReservations,
              pending_approvals: myDepartmentPendingApprovals,
              today_reservations: todayReservations
            }
          }

          console.log('✅ Officer stats generated:', stats)

          return {
            success: true,
            message: 'ดึงสถิติเจ้าหน้าที่สำเร็จ',
            stats: stats
          }

        } catch (error) {
          console.error('❌ Error in officer stats:', error)
          set.status = 500
          return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
            error: error.message
          }
        }
      })
  )

// === Admin Routes (ต้องมี admin role เท่านั้น) ===
export const adminAreaRoutes = new Elysia({ prefix: '/protected' })
  .group('/admin', app =>
    app
      .get('/area', async ({ request, set }) => {
        // เรียกใช้ auth middleware
        const user = await authMiddleware(request, set)
        
        // ถ้า middleware return error response
        if (user.success === false) {
          return user
        }
        
        // เช็ค role
        if (!isAdmin(user)) {
          set.status = 403
          return { 
            success: false, 
            message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น' 
          }
        }
        
        return {
          success: true,
          message: `สวัสดี ${user.first_name || 'Unknown'} ${user.last_name || ''} (ผู้ดูแลระบบ)`,
          area: 'พื้นที่สำหรับผู้ดูแลระบบ',
          permissions: ['manage_all_users', 'manage_all_rooms', 'system_settings'],
          access_level: 'Super Admin',
          user_data: user
        }
      })
  )
