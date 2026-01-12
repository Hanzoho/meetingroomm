// ===================================================================
// Admin API - New 3-Table System
// ===================================================================

import { Elysia } from 'elysia'
import prisma from '../lib/prisma.js'
import { authMiddleware, isAdmin } from '../middleware/index.js'
import {
  getAccountApprovedEmail,
  getAccountRejectedEmail
} from '../utils/approvalEmailTemplates.js'
import { sendEmail } from '../utils/emailService.js'
import {
  isValidPosition,
  getDepartmentFromPosition,
  getExecutivePositionType,
  POSITIONS
} from '../utils/positions.js'

// ฟังก์ชันช่วยแปลงตำแหน่งให้แสดงเป็นภาษาไทย โดยเฉพาะผู้บริหาร
const positionDisplay = (role, position, department) => {
  // ตอนนี้ executive เก็บ position เป็นภาษาไทยแล้ว ไม่ต้องแปลง
  return position || null
}

export const adminRoutes = new Elysia({ prefix: '/protected/admin' })

  // ============================
  // 👥 ดูรายการผู้ใช้ทั้งหมด (สำหรับหน้าจัดการผู้ใช้)
  // ============================
  .get('/users', async ({ request, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('👥 Admin: ดูรายการผู้ใช้ทั้งหมด (เฉพาะที่อนุมัติแล้ว)')

      // ดึงข้อมูลจากทุก table พร้อม address fields - เฉพาะ status = 'approved'
      const [users, officers, executives, admins] = await Promise.all([
        prisma.users.findMany({
          where: {
            status: 'approved'  // เฉพาะที่อนุมัติแล้ว
          },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            profile_image: true,
            province_id: true,
            district_id: true,
            subdistrict_id: true,
            zip_code: true,
            created_at: true
          },
          orderBy: {
            created_at: 'asc'  // เรียงจากเก่าไปใหม่
          }
        }),
        prisma.officer.findMany({
          where: {
            status: 'approved'  // เฉพาะที่อนุมัติแล้ว
          },
          select: {
            officer_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            profile_image: true,
            province_id: true,
            district_id: true,
            subdistrict_id: true,
            zip_code: true,
            created_at: true
          },
          orderBy: {
            created_at: 'asc'  // เรียงจากเก่าไปใหม่
          }
        }),
        prisma.executive.findMany({
          where: {
            status: 'approved'  // เฉพาะที่อนุมัติแล้ว
          },
          select: {
            executive_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            profile_image: true,
            province_id: true,
            district_id: true,
            subdistrict_id: true,
            zip_code: true,
            created_at: true
          },
          orderBy: {
            created_at: 'asc'  // เรียงจากเก่าไปใหม่
          }
        }),
        prisma.admin.findMany({
          where: {
            status: 'approved'  // เฉพาะที่อนุมัติแล้ว
          },
          select: {
            admin_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            profile_image: true,
            province_id: true,
            district_id: true,
            subdistrict_id: true,
            zip_code: true,
            created_at: true
          },
          orderBy: {
            created_at: 'asc'  // เรียงจากเก่าไปใหม่
          }
        })
      ])

      // รวมข้อมูลและเพิ่ม role + position_display (ภาษาไทย)
      const allUsers = [
        ...users.map(u => ({ ...u, role: 'user' })),
        ...officers.map(o => ({ ...o, role: 'officer' })),
        ...executives.map(e => ({ ...e, role: 'executive' })),
        ...admins.map(a => ({ ...a, role: 'admin' }))
      ].map(u => ({
        ...u,
        position_display: positionDisplay(u.role, u.position, u.department)
      }))

      // เรียงตาม created_at จากเก่าไปใหม่ (ตามที่อาจารย์ต้องการ)
      allUsers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      return {
        success: true,
        message: `ดึงรายการผู้ใช้ทั้งหมด (${allUsers.length} คน)`,
        data: allUsers
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงรายการผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการผู้ใช้',
        error: error.message
      }
    }
  })

  // ============================
  // 👁️ ดูข้อมูลผู้ใช้รายคน (สำหรับแก้ไข)
  // ============================
  .get('/users/:userId/:role', async ({ request, set, params }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      const { userId, role } = params
      console.log(`👁️ Admin: ดูข้อมูลผู้ใช้ ID=${userId}, Role=${role}`)

      let userData = null

      // ดึงข้อมูลตาม role พร้อม address information
      if (role === 'user') {
        userData = await prisma.users.findUnique({
          where: { user_id: parseInt(userId) },
          include: {
            province: true,
            district: true,
            subdistrict: true
          }
        })
      } else if (role === 'officer') {
        userData = await prisma.officer.findUnique({
          where: { officer_id: parseInt(userId) },
          include: {
            province: true,
            district: true,
            subdistrict: true
          }
        })
      } else if (role === 'executive') {
        userData = await prisma.executive.findUnique({
          where: { executive_id: parseInt(userId) },
          include: {
            province: true,
            district: true,
            subdistrict: true
          }
        })
      } else if (role === 'admin') {
        userData = await prisma.admin.findUnique({
          where: { admin_id: parseInt(userId) },
          include: {
            province: true,
            district: true,
            subdistrict: true
          }
        })
      }

      if (!userData) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้'
        }
      }

      // เพิ่ม role และจัดรูปแบบข้อมูล address + position_display
      const responseData = {
        ...userData,
        role,
        // เพิ่มข้อมูลที่อยู่ที่มีชื่อ
        province_name: userData.province?.province_name || null,
        district_name: userData.district?.district_name || null,
        subdistrict_name: userData.subdistrict?.subdistrict_name || null,
        // เพิ่มตำแหน่งแสดงผลเป็นภาษาไทย
        position_display: positionDisplay(role, userData.position, userData.department)
      }

      return {
        success: true,
        message: `ดึงข้อมูลผู้ใช้ ${userData.first_name} ${userData.last_name}`,
        data: responseData
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
      }
    }
  })

  // ============================
  // ➕ เพิ่มผู้ใช้ใหม่ (สำหรับหน้าจัดการผู้ใช้)
  // ============================
  .post('/users', async ({ request, set, body }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log(`➕ Admin: เพิ่มผู้ใช้ใหม่ ${body.first_name} ${body.last_name} (${body.role})`)
      console.log(`📍 ข้อมูลที่อยู่: จังหวัด=${body.province_id}, อำเภอ=${body.district_id}, ตำบล=${body.subdistrict_id}, รหัสไปรษณีย์=${body.zip_code}`)

      // ตรวจสอบข้อมูลพื้นฐานก่อนแฮชรหัสผ่าน
      if (!body.email || !body.password || !body.first_name || !body.last_name || !body.role) {
        set.status = 400
        return { success: false, message: 'กรอกข้อมูลไม่ครบ (ต้องมี first_name, last_name, email, password, role)' }
      }

      // Hash password หลังตรวจสอบข้อมูลครบถ้วนแล้ว
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(body.password, 10)

      // ตรวจสอบอีเมลซ้ำด้วย unique lookup และส่งสถานะ 409
      const existingInUsers = await prisma.users.findUnique({ where: { email: body.email } })
      const existingInOfficer = await prisma.officer.findUnique({ where: { email: body.email } })
      const existingInExecutive = await prisma.executive.findUnique({ where: { email: body.email } })
      const existingInAdmin = await prisma.admin.findUnique({ where: { email: body.email } })

      if (existingInUsers || existingInOfficer || existingInExecutive || existingInAdmin) {
        set.status = 409
        return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' }
      }

      let newUser

      // สร้างผู้ใช้ใน table ที่เหมาะสมตาม role
      switch (body.role) {
        case 'user':
          newUser = await prisma.users.create({
            data: {
              role_id: 1, // role_id สำหรับ user
              email: body.email,
              password: hashedPassword,
              first_name: body.first_name,
              last_name: body.last_name,
              position: body.position || null,
              department: body.department || null,
              status: 'approved', // Admin เพิ่ม = อนุมัติเลย
              // Address fields
              province_id: body.province_id ? parseInt(body.province_id) : null,
              district_id: body.district_id ? parseInt(body.district_id) : null,
              subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
              zip_code: body.zip_code ? parseInt(body.zip_code) : null,
              created_at: new Date()
            }
          })
          break

        case 'officer':
          // officer ต้องมี position เป็น 'เจ้าหน้าที่ดูแลห้องประชุม'
          if (!body.position || body.position !== POSITIONS.OFFICER) {
            set.status = 400
            return { success: false, message: 'ตำแหน่งเจ้าหน้าที่ไม่ถูกต้อง' }
          }

          // คำนวณ department จาก position หากไม่ได้ส่งมา
          {
            const derivedDept = getDepartmentFromPosition(body.position)
            const finalDept = body.department || derivedDept || 'ไม่ระบุ'
            newUser = await prisma.officer.create({
              data: {
                role_id: 2, // role_id สำหรับ officer
                email: body.email,
                password: hashedPassword,
                first_name: body.first_name,
                last_name: body.last_name,
                position: body.position, // เก็บเป็นชื่อไทยที่เลือก
                department: finalDept,
                status: 'approved', // Admin เพิ่ม = อนุมัติเลย
                // Address fields
                province_id: body.province_id ? parseInt(body.province_id) : null,
                district_id: body.district_id ? parseInt(body.district_id) : null,
                subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
                zip_code: body.zip_code ? parseInt(body.zip_code) : null,
                created_at: new Date()
              }
            })
          }
          break

        case 'executive':
          // executive ต้องเป็นตำแหน่งที่รองรับ และต้องแปลงเป็นคีย์ภายใน
          if (!body.position || !isValidPosition(body.position)) {
            set.status = 400
            return { success: false, message: 'ตำแหน่งผู้บริหารไม่ถูกต้อง' }
          }

          {
            const execType = getExecutivePositionType(body.position) // 'university_executive' | 'faculty_executive'
            if (!execType) {
              set.status = 400
              return { success: false, message: 'ตำแหน่งผู้บริหารไม่ถูกต้อง' }
            }

            // department: ระดับมหาวิทยาลัย → สำนักงานอธิการบดี, ระดับคณะ → ดึงจาก position ถ้าไม่ส่งมา
            const derivedDept = execType === 'university_executive'
              ? 'สำนักงานอธิการบดี'
              : (getDepartmentFromPosition(body.position) || body.department)

            if (execType === 'faculty_executive' && !derivedDept) {
              set.status = 400
              return { success: false, message: 'กรุณาระบุคณะของผู้บริหารระดับคณะ' }
            }

            newUser = await prisma.executive.create({
              data: {
                role_id: 4, // role_id สำหรับ executive
                email: body.email,
                password: hashedPassword,
                first_name: body.first_name,
                last_name: body.last_name,
                position: body.position, // เก็บตำแหน่งภาษาไทยตามที่ผู้ใช้เลือก
                department: derivedDept,
                status: 'approved', // Admin เพิ่ม = อนุมัติเลย
                // Address fields
                province_id: body.province_id ? parseInt(body.province_id) : null,
                district_id: body.district_id ? parseInt(body.district_id) : null,
                subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
                zip_code: body.zip_code ? parseInt(body.zip_code) : null,
                created_at: new Date()
              }
            })
          }
          break

        case 'admin':
          newUser = await prisma.admin.create({
            data: {
              role_id: 3, // role_id สำหรับ admin
              email: body.email,
              password: hashedPassword,
              first_name: body.first_name,
              last_name: body.last_name,
              position: body.position || 'ผู้ดูแลระบบ',
              department: body.department || 'สำนักงานอธิการบดี',
              status: 'approved', // Admin เพิ่ม = อนุมัติเลย
              // Address fields
              province_id: body.province_id ? parseInt(body.province_id) : null,
              district_id: body.district_id ? parseInt(body.district_id) : null,
              subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
              zip_code: body.zip_code ? parseInt(body.zip_code) : null,
              created_at: new Date()
            }
          })
          break

        default:
          throw new Error('Invalid role specified')
      }

      // ไม่ส่ง password กลับ + เติม position_display (ชื่อไทย)
      const { password, ...safeUser } = newUser || {}
      const responseData = {
        ...safeUser,
        role: body.role,
        position_display: positionDisplay(body.role, safeUser.position, safeUser.department)
      }
      return {
        success: true,
        message: `เพิ่มผู้ใช้ ${body.role} สำเร็จ`,
        data: responseData
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเพิ่มผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้',
        error: error.message
      }
    }
  })

  // ============================
  // ✏️ แก้ไขข้อมูลผู้ใช้ (สำหรับหน้าจัดการผู้ใช้)
  // ============================
  .put('/users/:userId', async ({ request, set, params, body }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      const { userId } = params
      const { first_name, last_name, email, department, originalRole, zip_code, province_id, district_id, subdistrict_id } = body

      console.log(`✏️ Admin: แก้ไขข้อมูลผู้ใช้ ID=${userId}, Role=${originalRole}`)

      // ตรวจสอบอีเมลซ้ำ (ยกเว้นตัวเอง)
      const existingEmail = await Promise.all([
        prisma.users.findFirst({
          where: {
            email,
            NOT: originalRole === 'user' ? { user_id: parseInt(userId) } : {}
          }
        }),
        prisma.officer.findFirst({
          where: {
            email,
            NOT: originalRole === 'officer' ? { officer_id: parseInt(userId) } : {}
          }
        }),
        prisma.executive.findFirst({
          where: {
            email,
            NOT: originalRole === 'executive' ? { executive_id: parseInt(userId) } : {}
          }
        }),
        prisma.admin.findFirst({
          where: {
            email,
            NOT: originalRole === 'admin' ? { admin_id: parseInt(userId) } : {}
          }
        })
      ])

      if (existingEmail.some(result => result !== null)) {
        set.status = 400
        return {
          success: false,
          message: '❌ ข้อมูลที่กรอกมีการใช้งานแล้วในระบบ กรุณาตรวจสอบ Email',
          error: 'email already exists'
        }
      }



      let updatedUser

      // แก้ไขข้อมูลใน table เดิม (ไม่เปลี่ยน role)
      switch (originalRole) {
        case 'user':
          updatedUser = await prisma.users.update({
            where: { user_id: parseInt(userId) },
            data: {
              first_name,
              last_name,
              email,
              department: department || 'ไม่ระบุ',
              zip_code: zip_code ? parseInt(zip_code, 10) : null,
              province_id: province_id ? parseInt(province_id, 10) : null,
              district_id: district_id ? parseInt(district_id, 10) : null,
              subdistrict_id: subdistrict_id ? parseInt(subdistrict_id, 10) : null
            }
          })
          break
        case 'officer':
          updatedUser = await prisma.officer.update({
            where: { officer_id: parseInt(userId) },
            data: {
              first_name,
              last_name,
              email,
              department: department || 'ไม่ระบุ',
              zip_code: zip_code ? parseInt(zip_code, 10) : null,
              province_id: province_id ? parseInt(province_id, 10) : null,
              district_id: district_id ? parseInt(district_id, 10) : null,
              subdistrict_id: subdistrict_id ? parseInt(subdistrict_id, 10) : null
            }
          })
          break
        case 'executive':
          updatedUser = await prisma.executive.update({
            where: { executive_id: parseInt(userId) },
            data: {
              first_name,
              last_name,
              email,
              department: department || 'ไม่ระบุ',
              zip_code: zip_code ? parseInt(zip_code, 10) : null,
              province_id: province_id ? parseInt(province_id, 10) : null,
              district_id: district_id ? parseInt(district_id, 10) : null,
              subdistrict_id: subdistrict_id ? parseInt(subdistrict_id, 10) : null
            }
          })
          break
        case 'admin':
          updatedUser = await prisma.admin.update({
            where: { admin_id: parseInt(userId) },
            data: {
              first_name,
              last_name,
              email,
              department: department || 'ไม่ระบุ',
              zip_code: zip_code ? parseInt(zip_code, 10) : null,
              province_id: province_id ? parseInt(province_id, 10) : null,
              district_id: district_id ? parseInt(district_id, 10) : null,
              subdistrict_id: subdistrict_id ? parseInt(subdistrict_id, 10) : null
            }
          })
          break
      }

      return {
        success: true,
        message: `แก้ไขข้อมูลผู้ใช้สำเร็จ`,
        data: {
          ...updatedUser,
          role: originalRole,
          position_display: positionDisplay(originalRole, updatedUser.position, updatedUser.department)
        }
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการแก้ไขผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้',
        error: error.message
      }
    }
  })

  // ============================
  // 🗑️ ลบผู้ใช้ (สำหรับหน้าจัดการผู้ใช้)
  // ============================
  .delete('/users/:userId', async ({ request, set, params, query }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      const { userId } = params
      const { role } = query

      if (!role) {
        console.log('❌ ไม่ได้รับ role จาก query parameter')
        set.status = 400
        return {
          success: false,
          message: 'ไม่ได้รับข้อมูล role'
        }
      }

      console.log(`🗑️ Admin: ลบผู้ใช้ ID=${userId}, Role=${role}`)

      let deleteResult

      // ลบจาก table ที่ถูกต้องตาม role
      switch (role) {
        case 'user':
          // ลบ reservations ที่เชื่อมโยงก่อน (Cascade Delete)
          const deletedUserReservations = await prisma.reservation.deleteMany({
            where: { user_id: parseInt(userId) }
          })
          console.log(`🗑️ ลบ ${deletedUserReservations.count} reservations ที่เชื่อมโยงกับ user ID=${userId}`)

          // ลบ reviews ที่เชื่อมโยงก่อน (Cascade Delete)
          const deletedUserReviews = await prisma.review.deleteMany({
            where: { user_id: parseInt(userId) }
          })
          console.log(`🗑️ ลบ ${deletedUserReviews.count} reviews ที่เชื่อมโยงกับ user ID=${userId}`)

          deleteResult = await prisma.users.delete({
            where: { user_id: parseInt(userId) }
          })
          break
        case 'officer':
          // ลบ reservations ที่เชื่อมโยงก่อน (Cascade Delete)
          const deletedReservations = await prisma.reservation.deleteMany({
            where: { officer_id: parseInt(userId) }
          })
          console.log(`🗑️ ลบ ${deletedReservations.count} reservations ที่เชื่อมโยงกับ officer ID=${userId}`)

          deleteResult = await prisma.officer.delete({
            where: { officer_id: parseInt(userId) }
          })
          break
        case 'executive':
          deleteResult = await prisma.executive.delete({
            where: { executive_id: parseInt(userId) }
          })
          break
        case 'admin':
          // ตรวจสอบจำนวนแอดมินก่อนลบ - ต้องมีมากกว่า 1 คน
          const adminCount = await prisma.admin.count()

          if (adminCount <= 1) {
            set.status = 400
            return {
              success: false,
              message: 'ไม่สามารถลบผู้ดูแลระบบได้ เนื่องจากต้องมีผู้ดูแลระบบอย่างน้อย 1 คนในระบบ',
              error: 'CANNOT_DELETE_LAST_ADMIN'
            }
          }

          deleteResult = await prisma.admin.delete({
            where: { admin_id: parseInt(userId) }
          })
          break
        default:
          throw new Error('Invalid role specified')
      }

      return {
        success: true,
        message: `ลบผู้ใช้ ${role} เรียบร้อยแล้ว`,
        data: deleteResult
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการลบผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบผู้ใช้',
        error: error.message
      }
    }
  })

  // ============================
  // 👁️ ดูข้อมูล Executive ทั้งหมด (Admin เห็นได้ทุกอย่าง)
  // ============================
  // ============================
  // 📊 ดูสถิติผู้ใช้ทั้ง 3 tables
  // ============================
  .get('/stats', async ({ request, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('📊 Admin: ดูสถิติผู้ใช้งาน (ทุก 4 tables)')

      // นับจำนวนใน users table
      const userCount = await prisma.users.count()

      // นับจำนวนใน officer table
      const officerCount = await prisma.officer.count()

      // นับจำนวนใน admin table
      const adminCount = await prisma.admin.count()

      // นับจำนวนใน executive table - ที่ admin เห็นได้ทั้งหมด
      const executiveCount = await prisma.executive.count()

      return {
        success: true,
        message: 'Admin เห็นข้อมูลทุกอย่าง (รวม executives)',
        stats: {
          total: userCount + officerCount + adminCount + executiveCount,
          users: userCount,
          officers: officerCount,
          admins: adminCount,
          executives: executiveCount
        }
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error)
      set.status = 500
      return {
        success: false,
      }
    }
  })

  // ============================
  // � สถิติการเข้าใช้ระบบตามคณะ/หน่วยงาน
  // ============================
  .get('/department-stats', async ({ request, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('📊 Admin: ดูสถิติการเข้าใช้ระบบตามคณะ')

      // นับจำนวนผู้ใช้จาก users table ตาม department
      const usersByDept = await prisma.users.groupBy({
        by: ['department'],
        _count: {
          user_id: true
        }
      })

      // นับจำนวน officer ตาม department
      const officersByDept = await prisma.officer.groupBy({
        by: ['department'],
        _count: {
          officer_id: true
        }
      })

      // นับจำนวน executive ตาม department
      const executivesByDept = await prisma.executive.groupBy({
        by: ['department'],
        _count: {
          executive_id: true
        }
      })

      // รวมข้อมูลทั้งหมดตาม department
      const departmentStats = new Map()

      // เพิ่มข้อมูล users (filter out null/empty department)
      usersByDept.forEach(item => {
        const dept = item.department
        if (dept && dept.trim() !== '') { // ข้าม null, undefined, และ empty string
          if (!departmentStats.has(dept)) {
            departmentStats.set(dept, { department: dept, users: 0, officers: 0, executives: 0, total: 0 })
          }
          departmentStats.get(dept).users = item._count.user_id
        }
      })

      // เพิ่มข้อมูล officers (filter out null/empty department)
      officersByDept.forEach(item => {
        const dept = item.department
        if (dept && dept.trim() !== '') { // ข้าม null, undefined, และ empty string
          if (!departmentStats.has(dept)) {
            departmentStats.set(dept, { department: dept, users: 0, officers: 0, executives: 0, total: 0 })
          }
          departmentStats.get(dept).officers = item._count.officer_id
        }
      })

      // เพิ่มข้อมูล executives (filter out null/empty department)
      executivesByDept.forEach(item => {
        const dept = item.department
        if (dept && dept.trim() !== '') { // ข้าม null, undefined, และ empty string
          if (!departmentStats.has(dept)) {
            departmentStats.set(dept, { department: dept, users: 0, officers: 0, executives: 0, total: 0 })
          }
          departmentStats.get(dept).executives = item._count.executive_id
        }
      })

      // คำนวณ total แต่ละ department
      departmentStats.forEach(dept => {
        dept.total = dept.users + dept.officers + dept.executives
      })

      // แปลงเป็น array และเรียงตาม total จากมากไปน้อย
      const sortedStats = Array.from(departmentStats.values())
        .sort((a, b) => b.total - a.total)

      return {
        success: true,
        message: `สถิติการเข้าใช้ระบบตามคณะ (${sortedStats.length} คณะ)`,
        data: sortedStats
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงสถิติคณะ:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติคณะ',
        error: error.message
      }
    }
  })

  // ============================
  // �👁️ ดูข้อมูล Executive ทั้งหมด (Admin เห็นได้ทุกอย่าง)
  // ============================
  .get('/executives', async ({ request, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('👁️ Admin: ดูข้อมูล Executive ทั้งหมด')

      let executives = await prisma.executive.findMany({
        select: {
          executive_id: true,
          role_id: true,
          first_name: true,
          last_name: true,
          email: true,
          position: true,
          department: true,
          citizen_id: true,
          zip_code: true,
          created_at: true
        }
      })
      // เติมตำแหน่งภาษาไทยเพื่อแสดงผล
      executives = executives.map(e => ({
        ...e,
        position_display: positionDisplay('executive', e.position, e.department)
      }))

      return {
        success: true,
        message: `Admin เห็นข้อมูล Executive ทั้งหมด (${executives.length} คน)`,
        executives
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดูข้อมูล Executive'
      }
    }
  })

  // ============================
  // 👁️ ดูข้อมูลผู้ใช้ทั้งหมด (Admin เห็นได้ทุกตาราง)
  // ============================
  .get('/all-users', async ({ request, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('👁️ Admin: ดูข้อมูลผู้ใช้ทั้งหมดจาก 4 tables')

      const [users, officers, admins, executives] = await Promise.all([
        prisma.users.findMany({
          where: { status: 'approved' }, // เฉพาะคนที่ approved เท่านั้น
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            position: true,
            department: true,
            created_at: true
          }
        }),
        prisma.officer.findMany({
          where: { status: 'approved' }, // เฉพาะคนที่ approved เท่านั้น
          select: {
            officer_id: true,
            first_name: true,
            last_name: true,
            email: true,
            position: true,
            department: true,
            created_at: true
          }
        }),
        prisma.admin.findMany({
          where: { status: 'approved' }, // เฉพาะคนที่ approved เท่านั้น
          select: {
            admin_id: true,
            first_name: true,
            last_name: true,
            email: true,
            position: true,
            department: true,
            created_at: true
          }
        }),
        prisma.executive.findMany({
          where: { status: 'approved' }, // เฉพาะคนที่ approved เท่านั้น
          select: {
            executive_id: true,
            first_name: true,
            last_name: true,
            email: true,
            position: true,
            department: true,
            created_at: true
          }
        })
      ])

      return {
        success: true,
        message: `Admin เห็นข้อมูลทุกคน จาก 4 tables`,
        data: {
          users: users.map(u => ({
            ...u,
            role: 'user',
            position_display: positionDisplay('user', u.position, u.department)
          })),
          officers: officers.map(o => ({
            ...o,
            role: 'officer',
            position_display: positionDisplay('officer', o.position, o.department)
          })),
          admins: admins.map(a => ({
            ...a,
            role: 'admin',
            position_display: positionDisplay('admin', a.position, a.department)
          })),
          executives: executives.map(e => ({
            ...e,
            role: 'executive',
            position_display: positionDisplay('executive', e.position, e.department)
          }))
        },
        summary: {
          total: users.length + officers.length + admins.length + executives.length,
          users: users.length,
          officers: officers.length,
          admins: admins.length,
          executives: executives.length
        }
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดูข้อมูลผู้ใช้'
      }
    }
  })

  // ============================
  // 👆 เปลี่ยน User → Officer
  // ============================
  .post('/promote/user-to-officer', async ({ request, body, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const auth = await authMiddleware(request, set)
    if (auth.success === false) return auth

    if (!isAdmin(auth)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('👆 Admin: เปลี่ยน User → Officer')

      if (!body.email) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณาระบุอีเมล'
        }
      }

      // Simple promotion logic - แทนที่ role-transfer function
      const targetUser = await prisma.users.findUnique({
        where: { email: body.email }
      })

      if (!targetUser) {
        set.status = 404
        return {
          success: false,
          message: `ไม่พบ user: ${body.email}`
        }
      }

      // ตรวจสอบว่ามี officer ที่ใช้อีเมลนี้แล้วหรือไม่
      const existingOfficer = await prisma.officer.findUnique({
        where: { email: body.email }
      })

      if (existingOfficer) {
        set.status = 409
        return {
          success: false,
          message: `มี officer ที่ใช้อีเมลนี้แล้ว: ${body.email}`
        }
      }

      // สร้าง officer ใหม่ พร้อมคัดลอกข้อมูลที่อยู่
      await prisma.officer.create({
        data: {
          role_id: 2, // officer role
          first_name: targetUser.first_name,
          last_name: targetUser.last_name,
          email: targetUser.email,
          password: targetUser.password,
          citizen_id: targetUser.citizen_id,
          position: targetUser.position,
          department: targetUser.department,
          province_id: targetUser.province_id,
          district_id: targetUser.district_id,
          subdistrict_id: targetUser.subdistrict_id,
          zip_code: targetUser.zip_code
        }
      })

      // ลบ user เดิม
      await prisma.users.delete({ where: { email: body.email } })

      return { success: true, message: `เปลี่ยน ${body.email} เป็น Officer สำเร็จ` }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเปลี่ยน role'
      }
    }
  })

  // ============================
  // 👆 เปลี่ยน Officer → Admin
  // ============================
  .post('/promote/officer-to-admin', async ({ request, body, set }) => {
    // ตรวจสอบสิทธิ์ admin
    const auth = await authMiddleware(request, set)
    if (auth.success === false) return auth
    if (!isAdmin(auth)) {
      set.status = 403
      return { success: false, message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น' }
    }

    try {
      console.log('👆 Admin: เปลี่ยน Officer → Admin')
      if (!body?.email) {
        set.status = 400
        return { success: false, message: 'กรุณาระบุอีเมล' }
      }

      const officer = await prisma.officer.findUnique({ where: { email: body.email } })
      if (!officer) {
        set.status = 404
        return { success: false, message: `ไม่พบ officer: ${body.email}` }
      }

      const existingAdmin = await prisma.admin.findUnique({ where: { email: body.email } })
      if (existingAdmin) {
        set.status = 409
        return { success: false, message: `มี admin ที่ใช้อีเมลนี้แล้ว: ${body.email}` }
      }

      await prisma.admin.create({
        data: {
          role_id: 3,
          first_name: officer.first_name,
          last_name: officer.last_name,
          email: officer.email,
          password: officer.password,
          citizen_id: officer.citizen_id,
          position: 'ผู้ดูแลระบบ',
          department: 'สำนักงานอธิการบดี',
          province_id: officer.province_id,
          district_id: officer.district_id,
          subdistrict_id: officer.subdistrict_id,
          zip_code: officer.zip_code
        }
      })

      await prisma.officer.delete({ where: { email: body.email } })

      return { success: true, message: `เปลี่ยน ${body.email} เป็น Admin สำเร็จ` }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error)
      set.status = 500
      return { success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยน role' }
    }
  })

  // ============================
  // 📧 เช็คอีเมลซ้ำ (สำหรับการแก้ไข)
  // ============================
  .post('/check-email', async ({ request, set, body }) => {
    // ตรวจสอบสิทธิ์ admin
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      const { email, userId, role } = body

      console.log(`📧 Admin: เช็คอีเมลซ้ำ - ${email} (ยกเว้น ${role} ID: ${userId})`)

      // เช็คอีเมลซ้ำในทุก table ยกเว้นผู้ใช้ปัจจุบัน
      const [existingUsers, existingOfficers, existingExecutives, existingAdmins] = await Promise.all([
        prisma.users.findFirst({
          where: {
            email,
            NOT: role === 'user' ? { user_id: parseInt(userId) } : undefined
          }
        }),
        prisma.officer.findFirst({
          where: {
            email,
            NOT: role === 'officer' ? { officer_id: parseInt(userId) } : undefined
          }
        }),
        prisma.executive.findFirst({
          where: {
            email,
            NOT: role === 'executive' ? { executive_id: parseInt(userId) } : undefined
          }
        }),
        prisma.admin.findFirst({
          where: {
            email,
            NOT: role === 'admin' ? { admin_id: parseInt(userId) } : undefined
          }
        })
      ])

      const emailExists = existingUsers || existingOfficers || existingExecutives || existingAdmins

      return {
        success: true,
        available: !emailExists,
        message: emailExists ? 'อีเมลนี้ถูกใช้แล้ว' : 'อีเมลนี้ใช้ได้'
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบอีเมล:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล'
      }
    }
  })

  // ============================
  // 👥 ดูรายการผู้ใช้รออนุมัติ
  // ============================
  .get('/pending-users', async ({ request, set }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      console.log('👥 Admin: ดูรายการผู้ใช้รออนุมัติ')

      const [users, officers, executives, admins] = await Promise.all([
        prisma.users.findMany({
          where: { status: 'pending' },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            created_at: true,
            status: true
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.officer.findMany({
          where: { status: 'pending' },
          select: {
            officer_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            created_at: true,
            status: true
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.executive.findMany({
          where: { status: 'pending' },
          select: {
            executive_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            created_at: true,
            status: true
          },
          orderBy: { created_at: 'desc' }
        }),
        prisma.admin.findMany({
          where: { status: 'pending' },
          select: {
            admin_id: true,
            first_name: true,
            last_name: true,
            email: true,
            citizen_id: true,
            position: true,
            department: true,
            created_at: true,
            status: true
          },
          orderBy: { created_at: 'desc' }
        })
      ])

      const allPendingUsers = [
        ...users.map(u => ({ ...u, role: 'user' })),
        ...officers.map(o => ({ ...o, role: 'officer' })),
        ...executives.map(e => ({ ...e, role: 'executive' })),
        ...admins.map(a => ({ ...a, role: 'admin' }))
      ]

      return {
        success: true,
        message: `ดึงรายการผู้ใช้รออนุมัติ (${allPendingUsers.length} คน)`,
        data: allPendingUsers
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงรายการผู้ใช้รออนุมัติ:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายการผู้ใช้รออนุมัติ'
      }
    }
  })

  // ============================
  // ✅ อนุมัติผู้ใช้
  // ============================
  .post('/approve-user', async ({ request, set, body }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      const { userId, role } = body

      if (!userId || !role) {
        set.status = 400
        return {
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน'
        }
      }

      let updatedUser = null
      let userEmail = null

      switch (role) {
        case 'user':
          updatedUser = await prisma.users.update({
            where: { user_id: userId },
            data: { status: 'approved' }
          })
          userEmail = updatedUser.email
          break
        case 'officer':
          updatedUser = await prisma.officer.update({
            where: { officer_id: userId },
            data: { status: 'approved' }
          })
          userEmail = updatedUser.email
          break
        case 'executive':
          updatedUser = await prisma.executive.update({
            where: { executive_id: userId },
            data: { status: 'approved' }
          })
          userEmail = updatedUser.email
          break
        case 'admin':
          updatedUser = await prisma.admin.update({
            where: { admin_id: userId },
            data: { status: 'approved' }
          })
          userEmail = updatedUser.email
          break
        default:
          set.status = 400
          return {
            success: false,
            message: 'ประเภทผู้ใช้ไม่ถูกต้อง'
          }
      }

      console.log(`✅ Admin: อนุมัติผู้ใช้ ${role} ID: ${userId}`)

      // ส่งอีเมลแจ้งเตือนผู้ใช้ว่าได้รับการอนุมัติ (แบบ non-blocking)
      const approvedEmail = getAccountApprovedEmail(updatedUser.first_name, updatedUser.last_name)
      const emailResult = await sendEmail(userEmail, approvedEmail.subject, approvedEmail.html)

      if (emailResult.success) {
        console.log('✅ ส่งอีเมลแจ้งเตือนการอนุมัติเรียบร้อย')
      } else {
        console.error('❌ ส่งอีเมลแจ้งเตือนการอนุมัติไม่สำเร็จ:', emailResult.error)
        // ไม่ block การอนุมัติ แม้อีเมลส่งไม่ได้
      }

      return {
        success: true,
        message: 'อนุมัติผู้ใช้เรียบร้อยแล้ว',
        data: { userId, role, email: userEmail }
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอนุมัติผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติผู้ใช้'
      }
    }
  })

  // ============================
  // ❌ ปฏิเสธผู้ใช้
  // ============================
  .post('/reject-user', async ({ request, set, body }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isAdmin(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้ดูแลระบบเท่านั้น'
      }
    }

    try {
      const { userId, role } = body

      if (!userId || !role) {
        set.status = 400
        return {
          success: false,
          message: 'ข้อมูลไม่ครับถ้วน'
        }
      }

      let updatedUser = null
      let userEmail = null

      // ดึงข้อมูลผู้ใช้ก่อนลบ (เพื่อส่งอีเมล)
      switch (role) {
        case 'user':
          updatedUser = await prisma.users.findUnique({
            where: { user_id: userId }
          })
          userEmail = updatedUser.email
          // ลบข้อมูลออกจาก database
          await prisma.users.delete({
            where: { user_id: userId }
          })
          break
        case 'officer':
          updatedUser = await prisma.officer.findUnique({
            where: { officer_id: userId }
          })
          userEmail = updatedUser.email
          // ลบข้อมูลออกจาก database
          await prisma.officer.delete({
            where: { officer_id: userId }
          })
          break
        case 'executive':
          updatedUser = await prisma.executive.findUnique({
            where: { executive_id: userId }
          })
          userEmail = updatedUser.email
          // ลบข้อมูลออกจาก database
          await prisma.executive.delete({
            where: { executive_id: userId }
          })
          break
        case 'admin':
          updatedUser = await prisma.admin.findUnique({
            where: { admin_id: userId }
          })
          userEmail = updatedUser.email
          // ลบข้อมูลออกจาก database
          await prisma.admin.delete({
            where: { admin_id: userId }
          })
          break
        default:
          set.status = 400
          return {
            success: false,
            message: 'ประเภทผู้ใช้ไม่ถูกต้อง'
          }
      }

      console.log(`❌ Admin: ปฏิเสธและลบผู้ใช้ ${role} ID: ${userId}`)

      // ส่งอีเมลแจ้งเตือนผู้ใช้ว่าถูกปฏิเสธ (ก่อนลบข้อมูล, แบบ non-blocking)
      const rejectedEmail = getAccountRejectedEmail(updatedUser.first_name, updatedUser.last_name)
      const emailResult = await sendEmail(userEmail, rejectedEmail.subject, rejectedEmail.html)

      if (emailResult.success) {
        console.log('✅ ส่งอีเมลแจ้งเตือนการปฏิเสธเรียบร้อย')
      } else {
        console.error('❌ ส่งอีเมลแจ้งเตือนการปฏิเสธไม่สำเร็จ:', emailResult.error)
        // ไม่ block การปฏิเสธ แม้อีเมลส่งไม่ได้
      }

      return {
        success: true,
        message: 'ปฏิเสธและลบข้อมูลผู้ใช้เรียบร้อยแล้ว',
        data: { userId, role, email: userEmail }
      }

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการปฏิเสธผู้ใช้:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการปฏิเสธผู้ใช้'
      }
    }
  })

export default adminRoutes