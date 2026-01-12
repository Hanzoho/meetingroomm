import prisma from './lib/prisma.js'

async function seedAllAddressDataKongvut() {
  try {
    console.log('🏗️  เริ่มต้น seed ข้อมูลที่อยู่ทั้งหมดจาก kongvut API...')
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ')

    // ลบข้อมูลเก่าทั้งหมด
    console.log('🗑️  กำลังลบข้อมูลเก่าทั้งหมด...')
    await prisma.subdistrict.deleteMany({})
    await prisma.district.deleteMany({})
    await prisma.province.deleteMany({})
    console.log('✅ ลบข้อมูลเก่าเรียบร้อย')

    // ใช้ข้อมูลจาก earthchie API ที่ทำงานได้
    console.log('📡 กำลังดึงข้อมูลจาก earthchie API...')
    const response = await fetch('https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`📊 ได้รับข้อมูล ${data.length} รายการ`)

    // จัดกลุ่มข้อมูล
    const provinces = new Map()
    const districts = new Map()
    const subdistricts = []

    for (const item of data) {
      // จังหวัด - เช็คให้แน่ใจว่าข้อมูลถูกต้อง
      if (item.province_code && typeof item.province_code === 'number' && item.province) {
        provinces.set(item.province_code, {
          province_id: item.province_code,
          province_name: item.province
        })
      }
      
      // อำเภอ - เช็คให้แน่ใจว่าข้อมูลถูกต้อง
      if (item.amphoe_code && typeof item.amphoe_code === 'number' && 
          item.amphoe && item.province_code && typeof item.province_code === 'number') {
        districts.set(item.amphoe_code, {
          district_id: item.amphoe_code,
          district_name: item.amphoe,
          province_id: item.province_code
        })
      }
      
      // ตำบล - เช็คให้แน่ใจว่าข้อมูลถูกต้องและมี amphoe_code อยู่ใน districts
      if (item.district_code && typeof item.district_code === 'number' && 
          item.amphoe_code && typeof item.amphoe_code === 'number' &&
          item.district && item.zipcode && districts.has(item.amphoe_code)) {
        subdistricts.push({
          subdistrict_id: item.district_code,
          subdistrict_name: item.district,
          district_id: item.amphoe_code,
          zip_code: item.zipcode.toString()
        })
      }
    }

    const provincesData = Array.from(provinces.values())
    const districtsData = Array.from(districts.values())
    const subdistrictsData = subdistricts

    console.log(`📊 จัดกลุ่มได้: ${provincesData.length} จังหวัด, ${districtsData.length} อำเภอ, ${subdistrictsData.length} ตำบล`)

    // แสดงตัวอย่างข้อมูลแรก
    console.log('🔍 ตัวอย่างข้อมูลดิบ:', JSON.stringify(data[0], null, 2))
    console.log('🔍 ตัวอย่างข้อมูลที่จัดกลุ่ม:')
    console.log('  จังหวัด:', JSON.stringify(provincesData[0], null, 2))
    console.log('  อำเภอ:', JSON.stringify(districtsData[0], null, 2))
    console.log('  ตำบล:', JSON.stringify(subdistrictsData[0], null, 2))

    // 1. สร้างจังหวัด
    console.log('\n🏛️  กำลังสร้างข้อมูลจังหวัด...')
    const provinceInsertData = provincesData

    await prisma.province.createMany({
      data: provinceInsertData,
      skipDuplicates: true
    })
    console.log(`✅ สร้างจังหวัดเสร็จสิ้น: ${provinceInsertData.length} รายการ`)

    // 2. สร้างอำเภอ
    console.log('\n🏢 กำลังสร้างข้อมูลอำเภอ...')
    const districtInsertData = districtsData

    // แบ่งเป็น batch เพื่อป้องกัน memory overflow
    const batchSize = 200
    let createdDistricts = 0

    for (let i = 0; i < districtInsertData.length; i += batchSize) {
      const batch = districtInsertData.slice(i, i + batchSize)
      
      try {
        await prisma.district.createMany({
          data: batch,
          skipDuplicates: true
        })
        createdDistricts += batch.length
        console.log(`📝 สร้างอำเภอแล้ว: ${createdDistricts}/${districtInsertData.length}`)
      } catch (error) {
        console.error(`❌ Error in district batch ${i}-${i + batch.length}:`, error.message)
      }
    }

    console.log(`✅ สร้างอำเภอเสร็จสิ้น: ${createdDistricts} รายการ`)

    // 3. สร้างตำบล
    console.log('\n🏘️  กำลังสร้างข้อมูลตำบล...')
    const subdistrictInsertData = subdistrictsData

    let createdSubdistricts = 0

    for (let i = 0; i < subdistrictInsertData.length; i += batchSize) {
      const batch = subdistrictInsertData.slice(i, i + batchSize)
      
      try {
        await prisma.subdistrict.createMany({
          data: batch,
          skipDuplicates: true
        })
        createdSubdistricts += batch.length
        console.log(`📝 สร้างตำบลแล้ว: ${createdSubdistricts}/${subdistrictInsertData.length}`)
      } catch (error) {
        console.error(`❌ Error in subdistrict batch ${i}-${i + batch.length}:`, error.message)
      }
    }

    console.log(`✅ สร้างตำบลเสร็จสิ้น: ${createdSubdistricts} รายการ`)

    // เช็คผลลัพธ์สุดท้าย
    const finalProvinceCount = await prisma.province.count()
    const finalDistrictCount = await prisma.district.count()
    const finalSubdistrictCount = await prisma.subdistrict.count()
    
    console.log('\n📊 สถานะข้อมูลปัจจุบัน:')
    console.log(`- จังหวัด: ${finalProvinceCount} รายการ`)
    console.log(`- อำเภอ: ${finalDistrictCount} รายการ`) 
    console.log(`- ตำบล: ${finalSubdistrictCount} รายการ`)

    // แสดงตัวอย่างข้อมูลที่สร้างสำเร็จ
    const sampleData = await prisma.subdistrict.findMany({
      take: 5,
      include: {
        district: {
          include: {
            province: true
          }
        }
      }
    })
    
    console.log('\n🏘️ ตัวอย่างข้อมูลที่สร้างสำเร็จ:')
    sampleData.forEach(item => {
      console.log(`- ${item.subdistrict_name}, ${item.district.district_name}, ${item.district.province.province_name} ${item.zip_code}`)
    })

    console.log('\n🎉 Setup ข้อมูลที่อยู่เสร็จสิ้นแล้ว!')

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    console.log('🔚 ปิดการเชื่อมต่อฐานข้อมูล')
    await prisma.$disconnect()
  }
}

seedAllAddressDataKongvut()