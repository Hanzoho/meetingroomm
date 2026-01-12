// ===================================================================
// Department Constants & Validation
// ===================================================================
// จัดการ department ทั้งหมดในระบบ
// ===================================================================

// รายการ Department ที่อนุญาต - มหาวิทยาลัยราชภัฏมหาสารคาม (ครบถ้วนทุกหน่วยงาน)
export const DEPARTMENTS = {
  // 9 คณะหลัก ตามข้อมูลจริงที่ผู้ใช้ให้มา
  SCIENCE_TECH: 'คณะวิทยาศาสตร์ฯ',
  EDUCATION: 'คณะครุศาสตร์', 
  MANAGEMENT: 'คณะวิทยาการจัดการ',
  HUMANITIES_SOCIAL: 'คณะมนุษยศาสตร์ฯ',
  AGRI_TECH: 'คณะเทคโนโลยีการเกษตร',
  POLITICAL_ADMIN: 'คณะรัฐศาสตร์ฯ',
  LAW: 'คณะนิติศาสตร์',
  ENGINEERING: 'คณะวิศวกรรมศาสตร์',
  
  // กองต่างๆ สำนักงานอธิการบดี (8 กอง)
  RECTOR_OFFICE: 'สำนักงานอธิการบดี',
  CENTRAL_DIVISION: 'กองกลาง',
  FINANCE_DIVISION: 'กองคลัง', 
  POLICY_DIVISION: 'กองนโยบายและแผน',
  HR_DIVISION: 'กองบริหารงานบุคคล',
  STUDENT_DIVISION: 'กองพัฒนานักศึกษา',
  COOP_CENTER: 'ศูนย์สหกิจศึกษาและพัฒนอาชีพ',
  DIGITAL_CENTER: 'ศูนย์เทคโนโลยีดิจิทัลและนวัตกรรม',
  
  // สำนักต่างๆ (4 สำนัก)
  RESEARCH_INSTITUTE: 'สถาบันวิจัยและพัฒนา',
  LIBRARY_IT: 'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ',
  ARTS_CULTURE: 'สำนักศิลปะและวัฒนธรรม',
  ACADEMIC_REGISTRY: 'สำนักส่งเสริมวิชาการและงานทะเบียน',
  
  // หน่วยงานอื่นๆ (4 หน่วยงาน)
  PR_OFFICE: 'งานประชาสัมพันธ์มหาวิทยาลัยราชภัฏมหาสารคาม',
  ACADEMIC_COUNCIL: 'สภาวิชาการ',
  UNIVERSITY_COUNCIL: 'สภามหาวิทยาลัยราชภัฏมหาสารคาม',
  INTERNAL_AUDIT: 'หน่วยตรวจสอบภายใน',
  
  // อาคาร/หอประชุมพิเศษ (3 อาคาร)
  BUILDING_72: 'อาคารประชุม 72 พรรษา มหาราชินี',
  AUDITORIUM: 'หอประชุมเฉลิมพระเกียรติ 80 พรรษา',
  BUILDING_34: 'อาคาร 34 เฉลิมพระเกียรติ 60 ปี'
}

// แปลงเป็น Array สำหรับ validation
export const DEPARTMENT_LIST = Object.values(DEPARTMENTS)

// ฟังก์ชันตรวจสอบ department ที่ถูกต้อง
export const isValidDepartment = (department) => {
  return DEPARTMENT_LIST.includes(department)
}

// ฟังก์ชันดึงรายการ department
export const getAllDepartments = () => {
  return DEPARTMENT_LIST
}

// ฟังก์ชันเปรียบเทียบ department (case insensitive)
export const isSameDepartment = (dept1, dept2) => {
  if (!dept1 || !dept2) return false
  return dept1.toLowerCase().trim() === dept2.toLowerCase().trim()
}

// ฟังก์ชันหา department จากชื่อคล้ายๆ
export const findDepartmentByName = (searchTerm) => {
  const search = searchTerm.toLowerCase().trim()
  return DEPARTMENT_LIST.find(dept => 
    dept.toLowerCase().includes(search) || 
    search.includes(dept.toLowerCase())
  )
}

// แมปกลุ่ม department (ถ้าต้องการจัดกลุ่ม)
export const DEPARTMENT_GROUPS = {
  SCIENCE_TECHNOLOGY: [
    'คณะวิทยาศาสตร์ฯ', 
    'คณะเทคโนโลยีการเกษตร',
    'คณะวิศวกรรมศาสตร์'
  ],
  HUMANITIES_SOCIAL: [
    'คณะครุศาสตร์', 
    'คณะมนุษยศาสตร์ฯ', 
    'คณะวิทยาการจัดการ',
    'คณะนิติศาสตร์',
    'คณะรัฐศาสตร์ฯ'
  ]
}

// ฟังก์ชันหากลุ่มของ department
export const getDepartmentGroup = (department) => {
  for (const [groupName, departments] of Object.entries(DEPARTMENT_GROUPS)) {
    if (departments.includes(department)) {
      return groupName
    }
  }
  return null
}
