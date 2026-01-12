// ===================================================================
// JWT Authentication Middleware
// ===================================================================
// ตรวจสอบ JWT Token และดึงข้อมูลผู้ใช้จาก Database
// ===================================================================

import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

// JWT Authentication Middleware
export const authMiddleware = async (request, set) => {
  // แปลง Headers object เป็น plain object ผ่าน JSON
  const headersString = JSON.stringify(request.headers)
  const headersObj = JSON.parse(headersString)
  const authHeader = headersObj.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    set.status = 401
    return { success: false, message: 'ต้องเข้าสู่ระบบก่อน' }
  }

  try {
    // แยก token
    const token = authHeader.substring(7)

    // ตรวจสอบ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Log token verification details
    const timeLeft = decoded.exp * 1000 - Date.now()
    const minutesLeft = Math.round(timeLeft / (1000 * 60))
    console.log(`🔍 Token Verification - Role: ${decoded.role}, Time left: ${minutesLeft} minutes`)

    if (timeLeft <= 0) {
      console.log('⏰ Token หมดอายุแล้ว')
      set.status = 401
      return {
        success: false,
        message: 'Token หมดอายุแล้ว',
        expired: true
      }
    }

    // ดึงข้อมูลผู้ใช้จาก table ที่ระบุใน token
    let user = null
    const userTable = decoded.userTable // ใช้ข้อมูลจาก token

    // Query ข้อมูลจาก table ที่ถูกต้องตาม token
    if (userTable === 'users') {
      user = await prisma.users.findUnique({
        where: { user_id: decoded.userId },
        select: {
          user_id: true,
          email: true,
          first_name: true,
          last_name: true,
          citizen_id: true,
          position: true,
          department: true,
          zip_code: true,
          profile_image: true, // 🔥 เพิ่มกลับมาเพื่อให้ TopBar แสดงรูปถูกต้อง
          created_at: true,
          updated_at: true,
          // เพิ่มข้อมูล address
          province_id: true,
          district_id: true,
          subdistrict_id: true,
          roles: {
            select: {
              role_name: true
            }
          }
        }
      })

      // 🔥 แปลง profile_image จาก Buffer เป็น path string เพื่อลด localStorage size
      if (user) {
        // ถ้ามี profile_image (เป็น Buffer) ให้แปลงเป็น path พร้อม role
        user.profile_image = user.profile_image 
          ? `/api/upload/profile-image/${user.user_id}/user`
          : null
      }

      // ถ้ามีข้อมูล address ให้ดึงชื่อจริงๆ มาด้วย
      if (user && (user.province_id || user.district_id || user.subdistrict_id)) {
        // ดึงชื่อจังหวัด
        if (user.province_id) {
          const province = await prisma.province.findUnique({
            where: { province_id: user.province_id },
            select: { province_name: true }
          })
          user.province_name = province?.province_name || null
        }

        // ดึงชื่ออำเภอ
        if (user.district_id) {
          const district = await prisma.district.findUnique({
            where: { district_id: user.district_id },
            select: { district_name: true }
          })
          user.district_name = district?.district_name || null
        }

        // ดึงชื่อตำบล
        if (user.subdistrict_id) {
          const subdistrict = await prisma.subdistrict.findUnique({
            where: { subdistrict_id: user.subdistrict_id },
            select: { subdistrict_name: true }
          })
          user.subdistrict_name = subdistrict?.subdistrict_name || null
        }
      }
    } else if (userTable === 'officer') {
      user = await prisma.officer.findUnique({
        where: { officer_id: decoded.userId },
        select: {
          officer_id: true,
          email: true,
          first_name: true,
          last_name: true,
          citizen_id: true,
          position: true,
          department: true,
          zip_code: true,
          profile_image: true, // 🔥 เพิ่มกลับมาเพื่อให้ TopBar แสดงรูปถูกต้อง
          created_at: true,
          updated_at: true,
          // เพิ่มข้อมูล address
          province_id: true,
          district_id: true,
          subdistrict_id: true,
          roles: {
            select: {
              role_name: true
            }
          }
        }
      })

      if (user) {
        console.log(`🔍 [JWT] Found officer: officer_id=${user.officer_id}, email=${user.email}`)

        // 🔥 ไม่ส่ง profile_image ใน JWT response - ให้ frontend จัดการเอง
        // user.profile_image = `/api/upload/profile-image/${user.officer_id}`

        // ✅ ไม่ต้องเปลี่ยน officer_id เป็น user_id อีกแล้ว - ใช้ของตัวเอง

        // ถ้ามีข้อมูล address ให้ดึงชื่อจริงๆ มาด้วย
        if (user.province_id || user.district_id || user.subdistrict_id) {
          // ดึงชื่อจังหวัด
          if (user.province_id) {
            const province = await prisma.province.findUnique({
              where: { province_id: user.province_id },
              select: { province_name: true }
            })
            user.province_name = province?.province_name || null
          }

          // ดึงชื่ออำเภอ
          if (user.district_id) {
            const district = await prisma.district.findUnique({
              where: { district_id: user.district_id },
              select: { district_name: true }
            })
            user.district_name = district?.district_name || null
          }

          // ดึงชื่อตำบล
          if (user.subdistrict_id) {
            const subdistrict = await prisma.subdistrict.findUnique({
              where: { subdistrict_id: user.subdistrict_id },
              select: { subdistrict_name: true }
            })
            user.subdistrict_name = subdistrict?.subdistrict_name || null
          }
        }
      }
    } else if (userTable === 'admin') {
      user = await prisma.admin.findUnique({
        where: { admin_id: decoded.userId },
        select: {
          admin_id: true,
          email: true,
          first_name: true,
          last_name: true,
          citizen_id: true,
          position: true,
          department: true,
          zip_code: true,
          profile_image: true, // 🔥 เพิ่มกลับมาเพื่อให้ TopBar แสดงรูปถูกต้อง
          created_at: true,
          updated_at: true,
          // เพิ่มข้อมูล address
          province_id: true,
          district_id: true,
          subdistrict_id: true,
          roles: {
            select: {
              role_name: true
            }
          }
        }
      })

      if (user) {
        console.log(`🔍 [JWT] Found admin: admin_id=${user.admin_id}, email=${user.email}`)

        // 🔥 แปลง profile_image จาก Buffer เป็น path string พร้อม role
        user.profile_image = user.profile_image 
          ? `/api/upload/profile-image/${user.admin_id}/admin`
          : null

        // ถ้ามีข้อมูล address ให้ดึงชื่อจริงๆ มาด้วย
        if (user.province_id || user.district_id || user.subdistrict_id) {
          // ดึงชื่อจังหวัด
          if (user.province_id) {
            const province = await prisma.province.findUnique({
              where: { province_id: user.province_id },
              select: { province_name: true }
            })
            user.province_name = province?.province_name || null
          }

          // ดึงชื่ออำเภอ
          if (user.district_id) {
            const district = await prisma.district.findUnique({
              where: { district_id: user.district_id },
              select: { district_name: true }
            })
            user.district_name = district?.district_name || null
          }

          // ดึงชื่อตำบล
          if (user.subdistrict_id) {
            const subdistrict = await prisma.subdistrict.findUnique({
              where: { subdistrict_id: user.subdistrict_id },
              select: { subdistrict_name: true }
            })
            user.subdistrict_name = subdistrict?.subdistrict_name || null
          }
        }
      }
    } else if (userTable === 'executive') {
      user = await prisma.executive.findUnique({
        where: { executive_id: decoded.userId },
        select: {
          executive_id: true,
          email: true,
          first_name: true,
          last_name: true,
          citizen_id: true,
          position: true,
          department: true,
          zip_code: true,
          profile_image: true, // 🔥 เพิ่มกลับมาเพื่อให้ TopBar แสดงรูปถูกต้อง
          created_at: true,
          updated_at: true,
          // เพิ่มข้อมูล address
          province_id: true,
          district_id: true,
          subdistrict_id: true,
          roles: {
            select: {
              role_name: true
            }
          }
        }
      })

      if (user) {
        console.log(`🔍 [JWT] Found executive: executive_id=${user.executive_id}, email=${user.email}`)

        // 🔥 แปลง profile_image จาก Buffer เป็น path string พร้อม role
        user.profile_image = user.profile_image 
          ? `/api/upload/profile-image/${user.executive_id}/executive`
          : null

        // ถ้ามีข้อมูล address ให้ดึงชื่อจริงๆ มาด้วย
        if (user.province_id || user.district_id || user.subdistrict_id) {
          // ดึงชื่อจังหวัด
          if (user.province_id) {
            const province = await prisma.province.findUnique({
              where: { province_id: user.province_id },
              select: { province_name: true }
            })
            user.province_name = province?.province_name || null
          }

          // ดึงชื่ออำเภอ
          if (user.district_id) {
            const district = await prisma.district.findUnique({
              where: { district_id: user.district_id },
              select: { district_name: true }
            })
            user.district_name = district?.district_name || null
          }

          // ดึงชื่อตำบล
          if (user.subdistrict_id) {
            const subdistrict = await prisma.subdistrict.findUnique({
              where: { subdistrict_id: user.subdistrict_id },
              select: { subdistrict_name: true }
            })
            user.subdistrict_name = subdistrict?.subdistrict_name || null
          }
        }
      }
    }

    if (!user) {
      set.status = 401
      return { success: false, message: 'ผู้ใช้ไม่ถูกต้อง' }
    }

    // เพิ่ม role เข้าไปใน user object
    const userWithRole = {
      ...user,
      role: decoded.role || user.roles?.role_name || 'user', // ใช้ role จาก token ก่อน
      userTable: userTable // เพิ่มข้อมูลว่ามาจาก table ไหน
    }

    // ตอนนี้ไม่ต้องใช้ position_department แล้ว เพราะใช้ user.department โดยตรง
    if (userTable === 'officer') {
      console.log(`🔐 [SECURITY] Officer department:`, {
        officer_id: user.officer_id,
        department: user.department,
        position: user.position
      })
    }

    // ✅ ล้าง ID ที่ไม่ถูกต้อง - ให้แต่ละ role มีแค่ ID ของตัวเอง
    if (userTable === 'users') {
      delete userWithRole.officer_id
      delete userWithRole.admin_id
      delete userWithRole.executive_id
    } else if (userTable === 'officer') {
      delete userWithRole.user_id
      delete userWithRole.admin_id
      delete userWithRole.executive_id
    } else if (userTable === 'admin') {
      delete userWithRole.user_id
      delete userWithRole.officer_id
      delete userWithRole.executive_id
    } else if (userTable === 'executive') {
      delete userWithRole.user_id
      delete userWithRole.officer_id
      delete userWithRole.admin_id
    }

    // เติม position_display เพื่อให้ UI แสดงตำแหน่งเป็นภาษาไทยเข้าใจง่าย
    if (userTable === 'executive') {
      // ตอนนี้ executive เก็บ position เป็นภาษาไทยแล้ว ไม่ต้องแปลง
      userWithRole.position_display = userWithRole.position || null
    } else if (userTable === 'officer') {
      // officer เก็บ position เป็นชื่อไทยอยู่แล้วจากหน้าสมัคร
      userWithRole.position_display = userWithRole.position || null
    } else {
      // users/admin แสดงตามค่าที่เก็บไว้
      userWithRole.position_display = userWithRole.position || null
    }

    // แปลง profile_image binary data เป็น URL
    if (userWithRole.profile_image) {
      const userId = userWithRole.user_id || userWithRole.officer_id || userWithRole.admin_id || userWithRole.executive_id
      const role = decoded.role || 'user' // ใช้ role จาก token
      userWithRole.profile_image = `/api/upload/profile-image/${userId}/${role}`
      console.log(`🖼️ [JWT] Set profile_image URL for ${userTable} ID ${userId}: ${userWithRole.profile_image}`)
    }

    // คืนค่า user กลับไป
    return userWithRole

  } catch (error) {
    console.log('❌ JWT Error:', error.name, error.message)

    // ตรวจสอบประเภท error เฉพาะเจาะจง
    if (error.name === 'TokenExpiredError') {
      set.status = 401
      return {
        success: false,
        message: 'Token หมดอายุแล้ว',
        expired: true
      }
    } else if (error.name === 'JsonWebTokenError') {
      set.status = 401
      return {
        success: false,
        message: 'Token ไม่ถูกต้อง',
        invalid: true
      }
    } else if (error.name === 'NotBeforeError') {
      set.status = 401
      return {
        success: false,
        message: 'Token ยังไม่สามารถใช้งานได้',
        notActive: true
      }
    }

    // กรณี error อื่นๆ
    set.status = 401
    return { success: false, message: 'การยืนยันตัวตนล้มเหลว' }
  }
}
