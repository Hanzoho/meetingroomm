// ==========================================
// Prisma Seed Script - ข้อมูลเริ่มต้นสำหรับ Fresh Database
// ==========================================
// รันด้วย: npx prisma db seed

import prisma from '../lib/prisma.js'

async function main() {
  console.log('🌱 เริ่มต้น seeding database...')

  // 1. สร้าง Roles
  console.log('👥 สร้าง Roles...')
  const userRole = await prisma.roles.upsert({
    where: { role_id: 1 },
    update: {},
    create: {
      role_id: 1,
      role_name: 'user',
      role_status: 'active'
    }
  })

  const officerRole = await prisma.roles.upsert({
    where: { role_id: 2 },
    update: {},
    create: {
      role_id: 2,
      role_name: 'officer',
      role_status: 'active'
    }
  })

  const adminRole = await prisma.roles.upsert({
    where: { role_id: 3 },
    update: {},
    create: {
      role_id: 3,
      role_name: 'admin',
      role_status: 'active'
    }
  })

  const executiveRole = await prisma.roles.upsert({
    where: { role_id: 4 },
    update: {},
    create: {
      role_id: 4,
      role_name: 'executive',
      role_status: 'active'
    }
  })

  console.log('✅ สร้าง Roles เสร็จแล้ว')

  console.log('')
  console.log('🎉 Seeding เสร็จสิ้น!')
  console.log('✅ ระบบพร้อมใช้งาน - มี 4 roles: user, officer, admin, executive')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })