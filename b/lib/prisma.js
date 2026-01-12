// ===================================================================
// Prisma Client Singleton
// ===================================================================
// ไฟล์นี้จัดการ Prisma Client เดียวสำหรับทั้งโปรเจค
// - ป้องกันการสร้าง connection ซ้ำ
// - ป้องกัน memory leak
// - ใช้งานง่าย import prisma จากไฟล์เดียว
// ===================================================================

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

export default prisma
