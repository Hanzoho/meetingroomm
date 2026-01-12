// ===================================================================
// Seed Sample Meeting Rooms Data
// ===================================================================
// สคริปต์สำหรับเพิ่มข้อมูลห้องประชุมตัวอย่างเข้าฐานข้อมูล
// ===================================================================

import prisma from './lib/prisma.js'

const sampleRooms = [
  {
    room_name: 'ห้องประชุมผู้บริหาร A',
    capacity: 20,
    location_m: 'ชั้น 10 อาคาร A',
    department: 'IT',
    status_m: 'available',
    details_m: 'ห้องประชุมขนาดใหญ่ เหมาะสำหรับการประชุมผู้บริหาร มีระบบ AV ครบครัน',
    image: 'https://example.com/room1.jpg',
    equipment: [
      { equipment_n: 'โปรเจกเตอร์', quantity: 1 },
      { equipment_n: 'ไมโครโฟน', quantity: 2 },
      { equipment_n: 'จอโทรทัศน์ 65 นิ้ว', quantity: 1 },
      { equipment_n: 'ระบบเสียง', quantity: 1 }
    ]
  },
  {
    room_name: 'ห้องประชุมทีมงาน B1',
    capacity: 8,
    location_m: 'ชั้น 5 อาคาร B',
    department: 'IT',
    status_m: 'available',
    details_m: 'ห้องประชุมขนาดกลาง เหมาะสำหรับการประชุมทีมงาน',
    image: 'https://example.com/room2.jpg',
    equipment: [
      { equipment_n: 'จอโทรทัศน์ 55 นิ้ว', quantity: 1 },
      { equipment_n: 'กระดานไวท์บอร์ด', quantity: 1 }
    ]
  },
  {
    room_name: 'ห้องประชุมการเงิน C1',
    capacity: 12,
    location_m: 'ชั้น 7 อาคาร C',
    department: 'Finance',
    status_m: 'available',
    details_m: 'ห้องประชุมสำหรับแผนกการเงิน มีระบบรักษาความปลอดภัยเพิ่มเติม',
    image: 'https://example.com/room3.jpg',
    equipment: [
      { equipment_n: 'โปรเจกเตอร์', quantity: 1 },
      { equipment_n: 'ระบบประชุมทางไกล', quantity: 1 },
      { equipment_n: 'ตู้เซฟ', quantity: 1 }
    ]
  },
  {
    room_name: 'ห้องประชุมฝ่ายขาย D1',
    capacity: 15,
    location_m: 'ชั้น 3 อาคาร D',
    department: 'Sales',
    status_m: 'available',
    details_m: 'ห้องประชุมฝ่ายขาย มีจอแสดงผลขนาดใหญ่สำหรับนำเสนอ',
    image: 'https://example.com/room4.jpg',
    equipment: [
      { equipment_n: 'จอ LED 85 นิ้ว', quantity: 1 },
      { equipment_n: 'ระบบเสียงไร้สาย', quantity: 1 },
      { equipment_n: 'คอมพิวเตอร์นำเสนอ', quantity: 1 }
    ]
  },
  {
    room_name: 'ห้องประชุมเล็ก HR-1',
    capacity: 6,
    location_m: 'ชั้น 2 อาคาร A',
    department: 'HR',
    status_m: 'available',
    details_m: 'ห้องประชุมขนาดเล็ก เหมาะสำหรับการสัมภาษณ์งาน',
    image: 'https://example.com/room5.jpg',
    equipment: [
      { equipment_n: 'จอโทรทัศน์ 43 นิ้ว', quantity: 1 },
      { equipment_n: 'กระดานไวท์บอร์ด', quantity: 1 }
    ]
  },
  {
    room_name: 'ห้องประชุมใหญ่ Main Hall',
    capacity: 50,
    location_m: 'ชั้น 1 อาคารหลัก',
    department: 'IT',
    status_m: 'maintenance',
    details_m: 'ห้องประชุมใหญ่ เหมาะสำหรับงานสัมมนา กำลังซ่อมบำรุง',
    image: 'https://example.com/room6.jpg',
    equipment: [
      { equipment_n: 'ระบบเสียงห้องใหญ่', quantity: 1 },
      { equipment_n: 'โปรเจกเตอร์ 4K', quantity: 2 },
      { equipment_n: 'ไมโครโฟนไร้สาย', quantity: 6 }
    ]
  }
]

async function seedRooms() {
  console.log('🌱 เริ่มเพิ่มข้อมูลห้องประชุมตัวอย่าง...')
  
  try {
    for (const roomData of sampleRooms) {
      const { equipment, ...room } = roomData
      
      // สร้างห้องประชุม
      const createdRoom = await prisma.meeting_room.create({
        data: room
      })
      
      console.log(`✅ สร้างห้อง: ${room.room_name}`)
      
      // สร้างอุปกรณ์
      for (const eq of equipment) {
        await prisma.equipment.create({
          data: {
            room_id: createdRoom.room_id,
            equipment_n: eq.equipment_n,
            quantity: eq.quantity
          }
        })
        console.log(`  📦 เพิ่มอุปกรณ์: ${eq.equipment_n} (${eq.quantity})`)
      }
    }
    
    console.log('\n🎉 เพิ่มข้อมูลสำเร็จ!')
    console.log(`📊 รวมทั้งหมด: ${sampleRooms.length} ห้องประชุม`)
    
    // แสดงสรุป
    const roomCount = await prisma.meeting_room.count()
    const equipmentCount = await prisma.equipment.count()
    
    console.log(`\n📈 สถิติปัจจุบัน:`)
    console.log(`   ห้องประชุม: ${roomCount} ห้อง`)
    console.log(`   อุปกรณ์: ${equipmentCount} รายการ`)
    
    // แสดงรายการห้องตาม department
    const departments = await prisma.meeting_room.groupBy({
      by: ['department'],
      _count: {
        room_id: true
      }
    })
    
    console.log(`\n🏢 จำนวนห้องตาม Department:`)
    departments.forEach(dept => {
      console.log(`   ${dept.department}: ${dept._count.room_id} ห้อง`)
    })
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedRooms()
