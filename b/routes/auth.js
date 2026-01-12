// @ts-nocheck
// ===================================================================
// Authentication APIs - ระบบสมัครสมาชิก และ เข้าสู่ระบบ
// ===================================================================
// ไฟล์นี้จัดการ:
// - POST /api/auth/register - สมัครสมาชิกใหม่ (พร้อม Position-based routing)
// - POST /api/auth/login    - เข้าสู่ระบบและรับ JWT token
// ===================================================================

import { Elysia } from 'elysia'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { validateRegisterData, formatValidationErrors } from '../validation.js'
import { isValidDepartment, getAllDepartments } from '../utils/departments.js'
import {
  getSuccessfulRegistrationEmail,
  getNewUserNotificationForAdmin
} from '../utils/approvalEmailTemplates.js'
import { sendEmail } from '../utils/emailService.js'
import {
  isValidPosition,
  getTableFromPosition,
  getRoleIdFromPosition,
  getDepartmentFromPosition,
  getExecutivePositionType
} from '../utils/positions.js'
import { authMiddleware } from '../middleware/index.js'
import { sendResetEmail } from '../utils/email.js'

export const authRoutes = new Elysia({ prefix: '/auth' })
  // API สมัครสมาชิก (Position-based)
  .post('/register', async ({ body, set }) => {
    try {
      // ตรวจสอบข้อมูลด้วย validation
      const validation = validateRegisterData(body)

      if (!validation.isValid) {
        set.status = 400
        return {
          success: false,
          message: formatValidationErrors(validation.errors)
        }
      }

      // ตรวจสอบ position ที่เลือก
      if (!body.position) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณาเลือกตำแหน่ง'
        }
      }

      if (!isValidPosition(body.position)) {
        set.status = 400
        return {
          success: false,
          message: 'ตำแหน่งไม่ถูกต้อง'
        }
      }

      // กำหนดตารางและ role_id จาก position
      const targetTable = getTableFromPosition(body.position)
      const roleId = getRoleIdFromPosition(body.position)
      const departmentFromPosition = getDepartmentFromPosition(body.position)
      const executiveType = getExecutivePositionType(body.position)

      // ตรวจสอบ email ซ้ำในทุก table (users, officer, admin, executive)
      const existingInUsers = await prisma.users.findUnique({
        where: { email: body.email }
      })

      const existingInOfficer = await prisma.officer.findUnique({
        where: { email: body.email }
      })

      const existingInAdmin = await prisma.admin.findUnique({
        where: { email: body.email }
      })

      const existingInExecutive = await prisma.executive.findUnique({
        where: { email: body.email }
      })

      if (existingInUsers || existingInOfficer || existingInAdmin || existingInExecutive) {
        set.status = 409
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว'
        }
      }

      // ตรวจสอบ citizen_id ซ้ำในทุก table (ถ้ามีการใส่มา)
      if (body.citizen_id) {
        const existingCitizenInUsers = await prisma.users.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        const existingCitizenInOfficer = await prisma.officer.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        const existingCitizenInAdmin = await prisma.admin.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        const existingCitizenInExecutive = await prisma.executive.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        if (existingCitizenInUsers || existingCitizenInOfficer || existingCitizenInAdmin || existingCitizenInExecutive) {
          set.status = 409
          return {
            success: false,
            message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว'
          }
        }
      }

      // เข้ารหัสรหัสผ่าน
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(body.password, 10)

      // 🎯 Position-based Registration Logic
      let newUser = null

      if (targetTable === 'users') {
        // บุคลากรทั่วไป → users table
        newUser = await prisma.users.create({
          data: {
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            role_id: roleId, // 3 = user
            position: body.position,
            department: body.department || null,
            status: 'pending', // สถานะ: pending - รอ admin อนุมัติ
            // Address fields - รับ IDs และ zip_code
            province_id: body.province_id ? parseInt(body.province_id) : null,
            district_id: body.district_id ? parseInt(body.district_id) : null,
            subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
            zip_code: body.zip_code ? parseInt(body.zip_code) : null,
          }
        })

      } else if (targetTable === 'officer') {
        // เจ้าหน้าที่ → officer table
        newUser = await prisma.officer.create({
          data: {
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            role_id: roleId, // 2 = officer
            position: body.position,
            department: departmentFromPosition || body.department,
            status: 'pending', // สถานะ: pending - รอ admin อนุมัติ
            // Address fields - รับ IDs และ zip_code  
            province_id: body.province_id ? parseInt(body.province_id) : null,
            district_id: body.district_id ? parseInt(body.district_id) : null,
            subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
            zip_code: body.zip_code ? parseInt(body.zip_code) : null,
          }
        })

      } else if (targetTable === 'executive') {
        // ผู้บริหาร → executive table
        newUser = await prisma.executive.create({
          data: {
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            role_id: roleId, // 4 = executive
            position: body.position, // เก็บตำแหน่งภาษาไทยตามที่ผู้ใช้เลือก
            department: departmentFromPosition ||
              (executiveType === 'university_executive' ? 'สำนักงานอธิการบดี' : body.department),
            status: 'pending', // สถานะ: pending - รอ admin อนุมัติ
            // Address fields - รับ IDs และ zip_code
            province_id: body.province_id ? parseInt(body.province_id) : null,
            district_id: body.district_id ? parseInt(body.district_id) : null,
            subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
            zip_code: body.zip_code ? parseInt(body.zip_code) : null,
          }
        })
      }

      // ส่งอีเมลแจ้งเตือนผู้ใช้ว่าต้องรอการอนุมัติ
      try {
        const successEmail = getSuccessfulRegistrationEmail(body.first_name, body.last_name)
        await sendEmail(body.email, successEmail.subject, successEmail.html)
      } catch (emailError) {
        // ไม่ให้ error นี้หยุดการสมัครสมาชิก
      }

      // ส่งอีเมลแจ้งเตือน Admin ว่ามีผู้ใช้ใหม่
      try {
        // หา email ของ admin ทั้งหมด
        const admins = await prisma.admin.findMany({
          where: { status: 'approved' },
          select: { email: true }
        })

        if (admins.length > 0) {
          const adminEmail = getNewUserNotificationForAdmin(
            body.first_name,
            body.last_name,
            body.email,
            body.position,
            body.department
          )

          // ส่งให้ admin ทุกคน
          for (const admin of admins) {
            await sendEmail(admin.email, adminEmail.subject, adminEmail.html)
          }
        }
      } catch (emailError) {
        // ไม่ให้ error นี้หยุดการสมัครสมาชิก
      }

      // ลบ password ออกจาก response
      const { password, ...userWithoutPassword } = newUser

      return {
        success: true,
        message: `สมัครสมาชิกสำเร็จ! กรุณารอการอนุมัติจากผู้ดูแลระบบ`,
        user: {
          ...userWithoutPassword,
          userTable: targetTable,
          selectedPosition: body.position
        }
      }

    } catch (err) {
      console.error('Error in /auth/register:', err)
      // จัดการ error เฉพาะ
      if (err.code === 'P2002' && err.meta?.target?.includes('citizen_id')) {
        set.status = 409
        return {
          success: false,
          message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว'
        }
      }

      if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        set.status = 409
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว'
        }
      }

      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
      }
    }
  })

  // 🎯 API สมัครสมาชิก Admin โดยตรง (สำหรับสร้าง Admin คนแรก)
  .post('/register-admin', async ({ body, set }) => {
    try {
      // ตรวจสอบข้อมูลด้วย validation
      const validation = validateRegisterData(body)

      if (!validation.isValid) {
        set.status = 400
        return {
          success: false,
          message: formatValidationErrors(validation.errors)
        }
      }

      // ตรวจสอบ email ซ้ำในทุก table
      const existingInUsers = await prisma.users.findUnique({
        where: { email: body.email }
      })

      const existingInOfficer = await prisma.officer.findUnique({
        where: { email: body.email }
      })

      const existingInAdmin = await prisma.admin.findUnique({
        where: { email: body.email }
      })

      const existingInExecutive = await prisma.executive.findUnique({
        where: { email: body.email }
      })

      if (existingInUsers || existingInOfficer || existingInAdmin || existingInExecutive) {
        set.status = 409
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว'
        }
      }

      // ตรวจสอบ citizen_id ซ้ำในทุก table (ถ้ามีการใส่มา)
      if (body.citizen_id) {
        const existingCitizenInUsers = await prisma.users.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        const existingCitizenInOfficer = await prisma.officer.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        const existingCitizenInAdmin = await prisma.admin.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        const existingCitizenInExecutive = await prisma.executive.findUnique({
          where: { citizen_id: body.citizen_id }
        })

        if (existingCitizenInUsers || existingCitizenInOfficer || existingCitizenInAdmin || existingCitizenInExecutive) {
          set.status = 409
          return {
            success: false,
            message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว'
          }
        }
      }

      // เข้ารหัสรหัสผ่าน
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(body.password, 10)

      // สร้าง Admin ใหม่
      const newAdmin = await prisma.admin.create({
        data: {
          email: body.email,
          password: hashedPassword,
          first_name: body.first_name,
          last_name: body.last_name,
          role_id: 3, // admin role
          position: body.position || 'ผู้ดูแลระบบ',
          department: body.department || 'สำนักงานอธิการบดี',
          // Address fields
          province_id: body.province_id ? parseInt(body.province_id) : null,
          district_id: body.district_id ? parseInt(body.district_id) : null,
          subdistrict_id: body.subdistrict_id ? parseInt(body.subdistrict_id) : null,
          zip_code: body.zip_code ? parseInt(body.zip_code) : null,
        }
      })

      // ลบ password ออกจาก response
      const { password, ...adminWithoutPassword } = newAdmin

      return {
        success: true,
        message: 'สมัครสมาชิก Admin สำเร็จ!',
        user: {
          ...adminWithoutPassword,
          userTable: 'admin',
          role: 'admin'
        }
      }

    } catch (err) {
      console.error('Error in /auth/register-admin:', err)
      // จัดการ error เฉพาะ
      if (err.code === 'P2002' && err.meta?.target?.includes('citizen_id')) {
        set.status = 409
        return {
          success: false,
          message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว'
        }
      }

      if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        set.status = 409
        return {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว'
        }
      }

      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก Admin'
      }
    }
  })

  // API เข้าสู่ระบบ (4-table login)
  .post('/login', async ({ body, set }) => {
    try {
      // ตรวจสอบข้อมูล
      if (!body.email || !body.password) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณากรอก email และ password'
        }
      }

      // หาผู้ใช้ในฐานข้อมูลจาก 4 tables
      let user = null
      let userTable = null
      let userId = null

      // ลองหาใน users table ก่อน
      user = await prisma.users.findUnique({
        where: { email: body.email },
        include: {
          roles: {
            select: {
              role_name: true
            }
          }
        }
      })

      if (user) {
        userTable = 'users'
        userId = user.user_id
      } else {
        // ลองหาใน officer table
        user = await prisma.officer.findUnique({
          where: { email: body.email },
          include: {
            roles: {
              select: {
                role_name: true
              }
            }
          }
        })

        if (user) {
          userTable = 'officer'
          userId = user.officer_id
        } else {
          // ลองหาใน admin table
          user = await prisma.admin.findUnique({
            where: { email: body.email },
            include: {
              roles: {
                select: {
                  role_name: true
                }
              }
            }
          })

          if (user) {
            userTable = 'admin'
            userId = user.admin_id
          } else {
            // ลองหาใน executive table
            user = await prisma.executive.findUnique({
              where: { email: body.email },
              include: {
                roles: {
                  select: {
                    role_name: true
                  }
                }
              }
            })

            if (user) {
              userTable = 'executive'
              userId = user.executive_id
            }
          }
        }
      }

      if (!user) {
        set.status = 401
        return {
          success: false,
          message: 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        }
      }


      // ตรวจสอบรหัสผ่าน
      const bcrypt = await import('bcryptjs')
      const isValidPassword = await bcrypt.compare(body.password, user.password)

      if (!isValidPassword) {
        set.status = 401
        return {
          success: false,
          message: 'ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        }
      }


      // ตรวจสอบสถานะการอนุมัติ
      if (user.status !== 'approved') {
        set.status = 403
        return {
          success: false,
          message: user.status === 'pending'
            ? 'บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ'
            : 'บัญชีของคุณไม่ได้รับการอนุมัติ'
        }
      }

      // สร้าง JWT Token
      const jwt = await import('jsonwebtoken')

      // ตรวจสอบถ้าเป็น test mode (สำหรับทดสอบ expiry)
      const isTestMode = body.testExpiry === true
      const expiryTime = isTestMode ? '30s' : '1h' // Test: 30 วินาที, Production: 8 ชั่วโมง (วันทำงาน)

      const token = jwt.sign(
        {
          userId: userId,
          email: user.email,
          role: user.roles?.role_name || 'user',
          userTable: userTable
        },
        process.env.JWT_SECRET,
        { expiresIn: expiryTime }
      )

      // ตรวจสอบ token payload
      const decoded = jwt.decode(token)
      const expiryTimeReadable = new Date(decoded.exp * 1000)
      const minutesLeft = Math.round((decoded.exp * 1000 - Date.now()) / (1000 * 60))

      // ลบ password ออกจาก response และปรับ user_id ให้ consistent
      const { password, ...userWithoutPassword } = user

      // ปรับ field ให้เหมือนกันทุก table - แต่ไม่ลบ original ID ออก
      if (userTable === 'officer') {
        userWithoutPassword.user_id = userWithoutPassword.officer_id
        // เก็บ officer_id ไว้ด้วยเพื่อใช้ในการสร้าง URL
      } else if (userTable === 'admin') {
        userWithoutPassword.user_id = userWithoutPassword.admin_id
        // เก็บ admin_id ไว้ด้วยเพื่อใช้ในการสร้าง URL
      } else if (userTable === 'executive') {
        userWithoutPassword.user_id = userWithoutPassword.executive_id
        // เก็บ executive_id ไว้ด้วยเพื่อใช้ในการสร้าง URL
      }

      return {
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        user: {
          ...userWithoutPassword,
          role: user.roles?.role_name || 'user', // เพิ่ม role field
          userTable: userTable
        },
        token: token
      }

    } catch (err) {
      console.error('Error in /auth/login:', err)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
      }
    }
  })

  // API สำหรับตรวจสอบอีเมลและรีเซ็ตรหัสผ่าน
  // API Forgot Password - มี Rate Limiting
  .post('/forgot-password', async ({ body, set }) => {
    try {
      if (!body.email) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณากรอกอีเมล'
        }
      }

      // หาผู้ใช้ในฐานข้อมูลจาก 4 tables
      let user = null
      let userTable = null
      let userIdField = null
      let userId = null

      // ตรวจสอบใน users table ก่อน
      user = await prisma.users.findUnique({
        where: { email: body.email }
      })

      if (user) {
        userTable = 'users'
        userIdField = 'user_id'
        userId = user.user_id
      } else {
        // ตรวจสอบใน officer table
        user = await prisma.officer.findUnique({
          where: { email: body.email }
        })

        if (user) {
          userTable = 'officer'
          userIdField = 'officer_id'
          userId = user.officer_id
        } else {
          // ตรวจสอบใน admin table
          user = await prisma.admin.findUnique({
            where: { email: body.email }
          })

          if (user) {
            userTable = 'admin'
            userIdField = 'admin_id'
            userId = user.admin_id
          } else {
            // ตรวจสอบใน executive table
            user = await prisma.executive.findUnique({
              where: { email: body.email }
            })

            if (user) {
              userTable = 'executive'
              userIdField = 'executive_id'
              userId = user.executive_id
            }
          }
        }
      }

      // ตรวจสอบผลลัพธ์และให้ feedback ชัดเจน
      if (!user) {
        set.status = 404
        return {
          success: false,
          found: false,
          message: 'ไม่พบอีเมลนี้ในระบบ กรุณาลงทะเบียนใหม่',
          action: 'register'
        }
      }

      // สร้าง Reset Token (32 bytes = 64 hex characters)
      const crypto = await import('crypto')
      const resetToken = crypto.randomBytes(32).toString('hex')
      const tokenExpiry = new Date(Date.now() + 3600000) // 1 ชั่วโมง

      // บันทึก Token ลงฐานข้อมูล
      await prisma[userTable].update({
        where: {
          [userIdField]: userId
        },
        data: {
          reset_token: resetToken,
          reset_token_expiry: tokenExpiry
        }
      })

      return {
        success: true,
        found: true,
        message: 'พบอีเมลในระบบ กำลังนำคุณไปหน้ารีเซ็ตรหัสผ่าน',
        action: 'reset',
        user: {
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          table: userTable
        },
        reset_token: resetToken
      }

    } catch (error) {
      console.error('Error in /auth/forgot-password:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล'
      }
    }
  })

  // API สำหรับรีเซ็ตรหัสผ่านด้วย Token
  .post('/reset-password', async ({ body, set }) => {
    try {
      if (!body.token || !body.password) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณาระบุ token และรหัสผ่านใหม่'
        }
      }

      if (body.password.length < 6) {
        set.status = 400
        return {
          success: false,
          message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
        }
      }

      // หา Token ในฐานข้อมูลจาก 4 tables
      let user = null
      let userTable = null
      let userIdField = null

      // ตรวจสอบใน users table ก่อน
      user = await prisma.users.findFirst({
        where: {
          reset_token: body.token,
          reset_token_expiry: {
            gt: new Date() // มากกว่าเวลาปัจจุบัน (ยังไม่หมดอายุ)
          }
        }
      })

      if (user) {
        userTable = 'users'
        userIdField = 'user_id'
      } else {
        // ตรวจสอบใน officer table
        user = await prisma.officer.findFirst({
          where: {
            reset_token: body.token,
            reset_token_expiry: {
              gt: new Date()
            }
          }
        })

        if (user) {
          userTable = 'officer'
          userIdField = 'officer_id'
        } else {
          // ตรวจสอบใน admin table
          user = await prisma.admin.findFirst({
            where: {
              reset_token: body.token,
              reset_token_expiry: {
                gt: new Date()
              }
            }
          })

          if (user) {
            userTable = 'admin'
            userIdField = 'admin_id'
          } else {
            // ตรวจสอบใน executive table
            user = await prisma.executive.findFirst({
              where: {
                reset_token: body.token,
                reset_token_expiry: {
                  gt: new Date()
                }
              }
            })

            if (user) {
              userTable = 'executive'
              userIdField = 'executive_id'
            }
          }
        }
      }

      if (!user) {
        set.status = 400
        return {
          success: false,
          message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
        }
      }

      // เข้ารหัสรหัสผ่านใหม่
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(body.password, 10)

      // อัปเดตรหัสผ่านและลบ Token
      await prisma[userTable].update({
        where: {
          [userIdField]: user[userIdField]
        },
        data: {
          password: hashedPassword,
          reset_token: null,
          reset_token_expiry: null,
          updated_at: new Date()
        }
      })

      return {
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่'
      }

    } catch (error) {
      console.error('Error in /auth/reset-password:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
      }
    }
  })

  // API สำหรับอัปเดตโปรไฟล์ตนเอง
  .put('/profile', async ({ request, set, body }) => {
    try {
      // ตรวจสอบ authentication
      const user = await authMiddleware(request, set)
      if (user.success === false) {
        return user
      }


      // แยก token เพื่อดึง original userId จาก JWT
      const headersString = JSON.stringify(request.headers)
      const headersObj = JSON.parse(headersString)
      const authHeader = headersObj.authorization
      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // ข้อมูลพื้นฐานที่ทุกคนแก้ไขได้
      const basicFields = [
        'first_name', 'last_name', 'email', 'citizen_id',
        'department', // ✅ ปลดล็อค department ให้ทุกคนแก้ไขได้
        'province_id', 'district_id', 'subdistrict_id', 'zip_code'
      ]

      // ข้อมูลที่เฉพาะ admin แก้ไขได้ (เพื่อป้องกันการเปลี่ยน role/สิทธิ์)
      const adminOnlyFields = ['position'] // 🔐 เฉพาะ position ที่ล็อคไว้

      let allowedFields = [...basicFields]

      // เฉพาะ admin เท่านั้นที่แก้ไข position ได้
      if (user.role === 'admin') {
        allowedFields.push(...adminOnlyFields)
      } else {
        // เช็คว่ามีการพยายามแก้ไข position หรือไม่
        const blockedAttempts = adminOnlyFields.filter(field => body[field] !== undefined)
        if (blockedAttempts.length > 0) {
          set.status = 403
          return {
            success: false,
            message: 'คุณไม่มีสิทธิ์ในการแก้ไขตำแหน่งงาน ติดต่อแอดมินเพื่อขอความช่วยเหลือ'
          }
        }
      }

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
      let tableName, idField, userId

      switch (user.role) {
        case 'user':
          tableName = 'users'
          idField = 'user_id'
          userId = decoded.userId  // ใช้ original userId จาก token
          break
        case 'officer':
          tableName = 'officer'
          idField = 'officer_id'
          userId = decoded.userId  // ใช้ original officer_id จาก token
          break
        case 'admin':
          tableName = 'admin'
          idField = 'admin_id'
          userId = decoded.userId  // ใช้ original admin_id จาก token
          break
        case 'executive':
          tableName = 'executive'
          idField = 'executive_id'
          userId = decoded.userId  // ใช้ original executive_id จาก token
          break
        default:
          set.status = 400
          return {
            success: false,
            message: 'ไม่สามารถระบุ role ได้'
          }
      }

      // ตรวจสอบ userId ว่าเป็น undefined หรือไม่
      if (!userId) {
        set.status = 400
        return {
          success: false,
          message: 'ไม่สามารถระบุ ID ผู้ใช้ได้'
        }
      }

      // ตรวจสอบ email และ citizen_id ซ้ำก่อนอัปเดต
      if (updateData.email || updateData.citizen_id) {
        // ตรวจสอบ email ซ้ำในทุก table ยกเว้นข้อมูลตัวเอง
        if (updateData.email) {
          const emailChecks = await Promise.all([
            prisma.users.findFirst({ where: { email: updateData.email, NOT: { user_id: tableName === 'users' ? userId : undefined } } }),
            prisma.officer.findFirst({ where: { email: updateData.email, NOT: { officer_id: tableName === 'officer' ? userId : undefined } } }),
            prisma.admin.findFirst({ where: { email: updateData.email, NOT: { admin_id: tableName === 'admin' ? userId : undefined } } }),
            prisma.executive.findFirst({ where: { email: updateData.email, NOT: { executive_id: tableName === 'executive' ? userId : undefined } } })
          ])

          const duplicateEmail = emailChecks.find(check => check !== null)
          if (duplicateEmail) {
            set.status = 409
            return {
              success: false,
              message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'
            }
          }
        }

        // ตรวจสอบ citizen_id ซ้ำในทุก table ยกเว้นข้อมูลตัวเอง
        if (updateData.citizen_id) {
          const citizenChecks = await Promise.all([
            prisma.users.findFirst({ where: { citizen_id: updateData.citizen_id, NOT: { user_id: tableName === 'users' ? userId : undefined } } }),
            prisma.officer.findFirst({ where: { citizen_id: updateData.citizen_id, NOT: { officer_id: tableName === 'officer' ? userId : undefined } } }),
            prisma.admin.findFirst({ where: { citizen_id: updateData.citizen_id, NOT: { admin_id: tableName === 'admin' ? userId : undefined } } }),
            prisma.executive.findFirst({ where: { citizen_id: updateData.citizen_id, NOT: { executive_id: tableName === 'executive' ? userId : undefined } } })
          ])

          const duplicateCitizen = citizenChecks.find(check => check !== null)
          if (duplicateCitizen) {
            set.status = 409
            return {
              success: false,
              message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว กรุณาตรวจสอบข้อมูล'
            }
          }
        }
      }

      // อัปเดตข้อมูลในฐานข้อมูล
      const updatedUser = await prisma[tableName].update({
        where: {
          [idField]: userId
        },
        data: {
          ...updateData,
          updated_at: new Date()
        },
        select: {
          [idField]: true,
          email: true,
          first_name: true,
          last_name: true,
          citizen_id: true,
          position: true,
          department: true,
          zip_code: true,
          subdistrict_id: true,  // แก้จาก tambon_id เป็น subdistrict_id
          // 🔥 ลบ profile_image: true และจะเพิ่ม path ทีหลัง
          created_at: true,
          updated_at: true,
          roles: {
            select: {
              role_name: true
            }
          }
        }
      })

      // ปรับ field ให้เหมือนกันทุก table (เหมือนใน login API)
      let responseUser = { ...updatedUser }

      if (tableName === 'officer') {
        // 🔥 เพิ่ม profile_image เป็น path แทน binary
        responseUser.profile_image = `/api/upload/profile-image/${responseUser.officer_id}`
        responseUser.user_id = responseUser.officer_id
        // เก็บ officer_id ไว้ด้วยเพื่อใช้ในการสร้าง URL
      } else if (tableName === 'admin') {
        // 🔥 เพิ่ม profile_image เป็น path แทน binary
        responseUser.profile_image = `/api/upload/profile-image/${responseUser.admin_id}`
        responseUser.user_id = responseUser.admin_id
        // เก็บ admin_id ไว้ด้วยเพื่อใช้ในการสร้าง URL
      } else if (tableName === 'executive') {
        // 🔥 เพิ่ม profile_image เป็น path แทน binary
        responseUser.profile_image = `/api/upload/profile-image/${responseUser.executive_id}`
        responseUser.user_id = responseUser.executive_id
        // เก็บ executive_id ไว้ด้วยเพื่อใช้ในการสร้าง URL
      } else if (tableName === 'users') {
        // 🔥 เพิ่ม profile_image เป็น path แทน binary
        responseUser.profile_image = `/api/upload/profile-image/${responseUser.user_id}`
      }

      return {
        success: true,
        message: 'อัปเดตโปรไฟล์สำเร็จ',
        updated_fields: Object.keys(updateData),
        user: {
          ...responseUser,
          role: responseUser.roles?.role_name || user.role,
          userTable: tableName
        }
      }

    } catch (error) {
      console.error('Error in /auth/profile (PUT):', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์: ' + error.message
      }
    }
  })

  // API สำหรับดูโปรไฟล์ตนเอง
  .get('/profile', async ({ request, set }) => {
    try {
      // ตรวจสอบ authentication
      const user = await authMiddleware(request, set)
      if (user.success === false) {
        return user
      }

      return {
        success: true,
        message: 'ข้อมูลโปรไฟล์ของคุณ',
        profile: user
      }

    } catch (error) {
      console.error('Error in /auth/profile (GET):', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์'
      }
    }
  })
