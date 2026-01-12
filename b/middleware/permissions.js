// ===================================================================
// Department-based Access Control
// ===================================================================
// ฟังก์ชันสำหรับตรวจสอบสิทธิ์การเข้าถึงตาม Department
// ===================================================================

import { isSameDepartment as compareDepartments } from '../utils/departments.js'
import prisma from '../lib/prisma.js'

// Room Management Permissions - Department-based access control
export const canManageRoom = async (user, roomDepartment) => {
  // Admin ไม่สามารถจัดการห้องได้ (ตามกฎหมายที่อาจารย์กำหนด)
  if (user?.role === 'admin') return false
  
  // Officer สามารถจัดการได้เฉพาะห้องตาม department เท่านั้น
  if (user?.role === 'officer') {
    if (user.department) {
      const canManage = compareDepartments(user.department, roomDepartment)
      console.log('🔐 [SECURITY] canManageRoom check:', {
        officer_id: user.officer_id,
        officer_department: user.department,
        room_department: roomDepartment,
        can_manage: canManage
      })
      return canManage
    } else {
      console.log('⚠️ [WARNING] Officer without department:', user.email)
      return false
    }
  }
  
  return false
}

// Review Viewing Permissions
export const canViewRoomReviews = (user, roomDepartment) => {
  // Admin ดูรีวิวได้ทุกห้อง
  if (user?.role === 'admin') return true
  
  // Executive ดูรีวิวได้ทุกห้อง (ไม่แบ่ง University/Faculty แล้ว)
  if (user?.role === 'executive') {
    return true // ผู้บริหารทุกคนดูได้ทุกห้อง
  }
  
  // Officer ดูรีวิวได้เฉพาะห้องใน department ตัวเอง
  if (user?.role === 'officer') {
    return user?.department === roomDepartment
  }
  
  // User ดูรีวิวได้ทุกห้อง
  return true
}

// Reservation Management Permissions
export const canManageReservation = (user, reservation) => {
  // Admin สามารถดูสถิติได้ แต่ไม่จัดการจอง
  if (user?.role === 'admin') return false
  
  // Officer สามารถจัดการการจองในห้องของ department ตัวเอง
  if (user?.role === 'officer') {
    return user?.department === reservation.meeting_room?.department
  }
  
  // User สามารถจัดการการจองของตัวเองเท่านั้น
  if (user?.role === 'user') {
    return user?.user_id === reservation.user_id
  }
  
  return false
}

// Department Access Helpers
export const isSameDepartment = (user, targetDepartment) => {
  return user?.department === targetDepartment
}

export const canAccessDepartmentData = (user, targetDepartment) => {
  // Admin เข้าถึงข้อมูลทุก department ได้
  if (user?.role === 'admin') return true
  
  // Executive เข้าถึงข้อมูลได้ทุก department (ไม่แบ่ง University/Faculty แล้ว)
  if (user?.role === 'executive') {
    return true // ผู้บริหารทุกคนเข้าถึงได้ทุก department
  }
  
  // Officer เข้าถึงข้อมูลใน department ตัวเองได้
  if (user?.role === 'officer') {
    return user?.department === targetDepartment
  }
  
  // User เข้าถึงข้อมูลใน department ตัวเองได้
  return user?.department === targetDepartment
}
