# Meeting Room Booking System Backend

ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม

## เทคโนโลジี
- **Runtime**: Bun v1.2.6
- **Framework**: Elysia
- **Database**: PostgreSQL (Prisma ORM)
- **Authentication**: JWT + bcryptjs

## การติดตั้ง

```bash
bun install
```

## การรันโปรแกรม

```bash
bun run index.js
```

## โครงสร้าง API
- `/api/auth/*` - สมัครสมาชิก/เข้าสู่ระบบ
- `/api/rooms/*` - จัดการห้องประชุม
- `/api/protected/*` - APIs ที่ต้อง authentication
- `/api/positions/*` - ข้อมูลตำแหน่ง
- `/api/departments/*` - ข้อมูลคณะ/หน่วยงาน

## Health Check
- `GET /health` - ตรวจสอบสถานะระบบ
