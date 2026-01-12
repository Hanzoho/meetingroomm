// ===================================================================
// สร้าง Roles พื้นฐานสำหรับระบบ
// ===================================================================

import { PrismaClient } from './generated/prisma/index.js'

const prisma = new PrismaClient()

async function seedRoles() {
  console.log('🔄 กำลังสร้าง roles พื้นฐาน...')

  try {
    // ลบ roles เก่าออก (ถ้ามี)
    await prisma.roles.deleteMany()

    // สร้าง roles ใหม่
    const roles = [
      {
        role_id: 1,
        role_name: 'user',
        role_status: 'active'
      },
      {
        role_id: 2, 
        role_name: 'officer',
        role_status: 'active'
      },
      {
        role_id: 3,
        role_name: 'admin', 
        role_status: 'active'
      },
      {
        role_id: 4,
        role_name: 'executive',
        role_status: 'active'
      }
    ]

    for (const role of roles) {
      const createdRole = await prisma.roles.create({
        data: role
      })
      console.log(`✅ สร้าง role: ${createdRole.role_name} (ID: ${createdRole.role_id})`)
    }

    console.log('🎉 สร้าง roles สำเร็จทั้งหมด!')

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้าง roles:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

seedRoles()
