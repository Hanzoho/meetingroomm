// 🏢 Officer Rooms Management Page - หน้าจัดการห้องประชุมสำหรับ Officer
// ฟีเจอร์: เพิ่ม/แก้ไข/ลบ/ดูรายละเอียดห้องประชุม, จัดการอุปกรณ์, อัพโหลดรูปภาพ
// Role: เฉพาะ Officer เท่านั้น (user จะไปหน้า dashboard, admin จะไปหน้า admin)
// 
// 🎯 IMPORTANT: ห้องประชุมที่สร้างจะมี department ตาม DEPARTMENT ของผู้ใช้โดยตรง
//                อิงตาม user.department ที่เก็บไว้ในฐานข้อมูลเพื่อความปลอดภัยและความถูกต้อง
//                เช่น: เจ้าหน้าที่ใน department "คณะครุศาสตร์" → ห้องจะเป็นของคณะครุศาสตร์

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getThemeColors } from '@/utils/theme'
import RoomDetailModal from './RoomDetailModal'
import CustomAlert from '@/components/CustomAlert'

// 🔄 Content Loading Spinner - แบบโหลดเฉพาะเนื้อหา ไม่ใช่เต็มหน้าจอ
const ContentLoadingSpinner = ({ message = "กำลังโหลดข้อมูล..." }) => {
  return (
    <div className="flex items-center justify-center min-h-96 w-full">
      <div className="text-center">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
        </div>
        <div className="space-y-2">
          <p className="text-blue-700 text-lg font-medium">{message}</p>
          <p className="text-gray-500 text-sm">โปรดรอสักครู่</p>
        </div>
        <div className="flex justify-center space-x-2 mt-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

function OfficerRoomsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  const [fetchingRooms, setFetchingRooms] = useState(false) // 🚫 ป้องกันเรียก fetchRooms ซ้ำ
  const [rooms, setRooms] = useState([])
  const [filteredRooms, setFilteredRooms] = useState([]) // 🔍 ห้องที่ผ่านการกรอง
  const [searchQuery, setSearchQuery] = useState('') // 🔍 คำค้นหา

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6) // 6 cards per page (2 rows x 3 cols)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    room_name: '',
    capacity: '',
    location_m: '',
    department: '', // ล็อกตาม department ของผู้ใช้โดยตรง
    status_m: 'available',
    details_m: '',
    image: null
  })

  // Equipment management states
  const [equipmentList, setEquipmentList] = useState([])
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [equipmentModalOpening, setEquipmentModalOpening] = useState(false)
  const [equipmentForm, setEquipmentForm] = useState({ equipment_n: '', quantity: 1 })
  const [equipmentError, setEquipmentError] = useState('')

  // UI states
  const [modalClosing, setModalClosing] = useState(false)
  const [modalOpening, setModalOpening] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)

  // 🚨 Custom Alert States
  const [alert, setAlert] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    showCancel: false
  })

  // 🚨 Alert Helper Functions
  const showAlert = (type, title, message, onConfirm = null, showCancel = false) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      showCancel
    })
  }

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }))
  }

  // 🔄 Force re-render utility
  const [forceUpdateKey, setForceUpdateKey] = useState(0)
  const forceUpdate = () => setForceUpdateKey(prev => prev + 1)

  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [detailModalClosing, setDetailModalClosing] = useState(false)
  const [detailModalOpening, setDetailModalOpening] = useState(false)
  const [imageDeleted, setImageDeleted] = useState(false) // 🗑️ ติดตามการลบรูป

  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [successModalClosing, setSuccessModalClosing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeAuth = async () => {
      try {
        // ตรวจสอบ Token หมดอายุก่อน
        if (!authUtils.isAuthenticated()) {
          router.push('/login')
          return
        }

        const [userData, token] = await Promise.all([
          authUtils.getCurrentUser(),
          authUtils.getToken()
        ])

        if (!userData || !token) {
          router.push('/login')
          return
        }

        // ตรวจสอบ role - เฉพาะ officer เท่านั้น
        if (userData.role === 'user') {
          router.push('/dashboard')
          return
        } else if (userData.role === 'admin') {
          router.push('/dashboard/admin')
          return
        }

        setUser(userData)
        // ✅ ป้องกันเรียกซ้ำด้วย flag
        if (fetchingRooms) return // ถ้ากำลังโหลดห้องอยู่ ไม่ต้องเรียกซ้ำ
        await fetchRooms(userData)
      } catch (error) {
        router.push('/login')
      } finally {

      }
    }

    initializeAuth()
  }, []) // ✅ Empty dependency - เรียกครั้งเดียวตอน mount

  // 🔒 ล็อค body scroll เมื่อเปิด modal หลัก (เพิ่ม/แก้ไข)
  useEffect(() => {
    if (showAddModal) {
      // ล็อค scroll
      document.body.style.overflow = 'hidden'

      // cleanup function: ปลดล็อค scroll เมื่อปิด modal
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [showAddModal])

  // 🔍 ฟังก์ชันค้นหาห้องประชุม (Real-time search)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // ไม่มีคำค้นหา - แสดงทุกห้อง
      setFilteredRooms(rooms)
    } else {
      // มีคำค้นหา - กรองตามเงื่อนไข
      const query = searchQuery.toLowerCase().trim()
      const filtered = rooms.filter(room => {
        return (
          room.room_name?.toLowerCase().includes(query) ||          // ชื่อห้อง
          room.location_m?.toLowerCase().includes(query) ||         // สถานที่
          room.details_m?.toLowerCase().includes(query) ||          // รายละเอียด
          room.capacity?.toString().includes(query) ||              // ความจุ
          room.department?.toLowerCase().includes(query)            // แผนก
        )
      })
      setFilteredRooms(filtered)
    }
  }, [searchQuery, rooms])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // 🔄 Force component re-render when needed
  // (Removed unnecessary useEffect that was causing excessive re-renders)

  const fetchRooms = useCallback(async (userData) => {
    // ✅ ป้องกันเรียกซ้ำถ้ากำลังโหลดอยู่
    if (fetchingRooms) {
      return
    }

    setFetchingRooms(true) // 🔒 ล็อคไม่ให้เรียกซ้ำ

    try {
      // ✅ เพิ่ม timeout และ AbortController เพื่อป้องกัน hang
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 วินาที (เพิ่มจาก 15)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/rooms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()

        console.log('🏢 Officer Rooms Data:', data.rooms) // Debug เพื่อดูข้อมูล
        console.log('🏢 First Room Sample:', data.rooms?.[0]) // ดูห้องแรกเป็นตัวอย่าง
        console.log('👥 Current Users Check:', data.rooms?.map(room => ({
          room_id: room.room_id,
          room_name: room.room_name,
          current_users: room.current_users
        }))) // ตรวจสอบ current_users โดยเฉพาะ
        console.log('👥 Raw Current Users Values:', data.rooms?.map(room => room.current_users)) // ดูค่า current_users โดยตรง

        setRooms(data.rooms || [])
        setFilteredRooms(data.rooms || []) // 🔍 เริ่มต้นแสดงทุกห้อง
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request timeout - Server took too long to respond
      } else {
        // Error fetching rooms
      }
      setRooms([])
    } finally {
      setFetchingRooms(false) // 🔓 ปลดล็อคเมื่อเสร็จแล้ว
    }
  }, [fetchingRooms]) // ✅ dependency: fetchingRooms state

  const handleAddRoom = () => {
    // ล็อก department ของห้องประชุมตาม department ของผู้ใช้โดยตรง
    const responsibleDepartment = user?.department || 'ไม่ระบุ'

    setFormData({
      room_name: '',
      capacity: '',
      location_m: '',
      department: responsibleDepartment, // ล็อกตาม department ของผู้ใช้
      status_m: 'available',
      details_m: '',
      image: null
    })
    setImagePreview(null)
    setEquipmentList([])
    setSelectedRoom(null)
    setImageDeleted(false) // 🗑️ Reset image deletion flag when adding new room

    // 🎨 Opening Animation: เริ่มจาก scale-0 และค่อยๆ เด้งขึ้น
    setModalOpening(true)
    setShowAddModal(true)

    // หลังจาก mount แล้ว ค่อย animate เข้ามา (เร็วขึ้น!)
    setTimeout(() => {
      setModalOpening(false)
    }, 10) // เร็วมาก - เกือบทันที!
  }

  const handleAddEquipment = () => {
    setEquipmentForm({ equipment_n: '', quantity: 1 })
    setEquipmentError('') // clear error

    // 🎨 Opening Animation: เริ่มจาก scale-0 และค่อยๆ เด้งขึ้น
    setEquipmentModalOpening(true)
    setShowEquipmentModal(true)

    // หลังจาก mount แล้ว ค่อย animate เข้ามา (เร็วขึ้น!)
    setTimeout(() => {
      setEquipmentModalOpening(false)
    }, 10) // เร็วมาก - เกือบทันที!
  }

  const handleSaveEquipment = () => {
    if (!equipmentForm.equipment_n.trim()) {
      setEquipmentError('กรุณากรอกชื่ออุปกรณ์')
      return
    }

    setEquipmentError('') // clear error

    const newEquipment = {
      id: Date.now(), // Temporary ID for UI
      equipment_n: equipmentForm.equipment_n.trim(),
      quantity: parseInt(equipmentForm.quantity)
    }

    setEquipmentList([...equipmentList, newEquipment])
    setEquipmentForm({ equipment_n: '', quantity: 1 })
    setShowEquipmentModal(false)
    setEquipmentModalOpening(false) // Reset opening state
  }

  const handleRemoveEquipment = (id) => {
    setEquipmentList(equipmentList.filter(item => item.id !== id))
  }

  const handleEditRoom = (room) => {
    setFormData({
      room_name: room.room_name,
      capacity: room.capacity.toString(),
      location_m: room.location_m,
      department: user?.department || 'ไม่ระบุ', // ล็อกตาม department ของผู้ใช้
      status_m: room.status_m,
      details_m: room.details_m || '',
      image: null
    })

    // 🖼️ Set image preview - ตรวจสอบหลายๆ แบบ
    const roomHasImage = room.hasImage || room.has_image || (room.image_data && room.image_data.length > 0)

    if (roomHasImage) {
      // Room has image - set preview to API endpoint URL with cache busting
      const timestamp = room.imageTimestamp || (room.updated_at ? new Date(room.updated_at).getTime() : Date.now())
      const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/image/${room.room_id}?t=${timestamp}`
      setImagePreview(imageUrl)
    } else {
      // Room has no image - clear preview
      setImagePreview(null)
    }

    setSelectedRoom(room)
    setImageDeleted(false) // 🗑️ Reset image deletion flag when editing

    // Load existing equipment for this room
    if (room.equipment && room.equipment.length > 0) {
      setEquipmentList(room.equipment.map(eq => ({
        id: eq.equipment_id,
        equipment_n: eq.equipment_n,
        quantity: eq.quantity
      })))
    } else {
      setEquipmentList([])
    }

    // 🎨 Opening Animation: เริ่มจาก scale-0 และค่อยๆ เด้งขึ้น
    setModalOpening(true)
    setShowAddModal(true)

    // หลังจาก mount แล้ว ค่อย animate เข้ามา (เร็วขึ้น!)
    setTimeout(() => {
      setModalOpening(false)
    }, 10) // เร็วมาก - เกือบทันที!
  }

  const handleViewDetails = (room) => {
    setSelectedRoom(room)

    // 🎨 Opening Animation: เริ่มจาก scale-0 และค่อยๆ เด้งขึ้น (ช้าสำหรับเปิด)
    setDetailModalOpening(true)
    setShowDetailModal(true)

    // หลังจาก mount แล้ว ค่อย animate เข้ามา (ช้าสำหรับเปิด)
    setTimeout(() => {
      setDetailModalOpening(false)
    }, 50) // ช้าหน่อยสำหรับ animation การเปิด

    // หลังจาก mount แล้ว ค่อย animate เข้ามา (ช้าขึ้นสำหรับเปิด)
    setTimeout(() => {
      setDetailModalOpening(false)
    }, 50) // ช้าขึ้นเพื่อให้เห็น animation
  }

  const handleDeleteRoom = async (roomId) => {
    // 🚨 ขั้นตอนที่ 1: ยืนยันการลบ
    showAlert(
      'confirm',
      '⚠️ ยืนยันการลบห้องประชุม',
      'คุณแน่ใจหรือไม่ที่จะลบห้องประชุมนี้?',
      () => performDeleteRoom(roomId), // เรียกฟังก์ชันลบจริง
      true // แสดงปุ่มยกเลิก
    )
  }

  const performDeleteRoom = async (roomId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // ✅ ลบสำเร็จ
        showAlert(
          'success',
          'ลบห้องประชุมสำเร็จ!',
          'ห้องประชุมถูกลบออกจากระบบแล้ว'
        )
        await fetchRooms(user) // รีเฟรชรายการ
      } else {
        // ❌ ลบไม่สำเร็จ
        const errorData = await response.json().catch(() => ({}))

        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      // 🚨 แสดง Error Message ตามสาเหตุ
      let userMessage = error.message;

      if (error.message.includes('มีการจองอยู่')) {
        userMessage =
          '❌ ไม่สามารถลบห้องประชุมได้!\n\n' +
          '� สาเหตุ: ห้องนี้มีการจองอยู่\n\n' +
          '� วิธีแก้ไข:\n' +
          '🔹 ตรวจสอบปฏิทินการจอง\n' +
          '🔹 ยกเลิกการจองทั้งหมดก่อน\n' +
          '🔹 จากนั้นจึงลบห้องประชุม\n\n' +
          '📞 หากมีปัญหา ติดต่อผู้ดูแลระบบ';
      } else if (error.message.includes('สิทธิ์')) {
        userMessage =
          '❌ ไม่สามารถลบห้องประชุมได้!\n\n' +
          '🚫 สาเหตุ: คุณไม่มีสิทธิ์จัดการห้องนี้\n\n' +
          '💡 หมายเหตุ:\n' +
          '🔹 เจ้าหน้าที่จัดการได้เฉพาะห้องในหน่วยงานตัวเอง\n' +
          '🔹 ตรวจสอบว่าห้องนี้อยู่ในหน่วยงานของคุณหรือไม่\n\n' +
          '📞 หากมีปัญหา ติดต่อผู้ดูแลระบบ';
      } else if (error.message.includes('404') || error.message.includes('ไม่พบ')) {
        userMessage =
          '❌ ไม่สามารถลบห้องประชุมได้!\n\n' +
          '🔍 สาเหตุ: ไม่พบห้องประชุมที่ระบุ\n\n' +
          '💡 เหตุผลที่เป็นไปได้:\n' +
          '🔹 ห้องอาจถูกลบไปแล้ว\n' +
          '🔹 หมายเลขห้องไม่ถูกต้อง\n\n' +
          '🔄 กรุณารีเฟรชหน้าเพื่อดูข้อมูลล่าสุด';
      } else {
        userMessage =
          `${error.message}\n\n` +
          '🔹 หากปัญหายังคงอยู่ ติดต่อผู้ดูแลระบบ';
      }

      showAlert('error', 'ไม่สามารถลบห้องประชุมได้!', userMessage)
    }
  }

  const handleSaveRoom = async () => {
    try {
      setSubmitting(true)
      // Validate required fields
      if (!formData.room_name || !formData.capacity || !formData.location_m || !formData.department) {
        showAlert('error', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลให้ครบถ้วน')
        return
      }

      // หมายเหตุ: อุปกรณ์เป็น optional ไม่ต้องบังคับใส่

      // ⚡ แยก Form Data: ไม่ส่งรูปไปกับ Room Data (เพื่อความเร็ว)
      const form = new FormData()
      form.append('room_name', formData.room_name)
      form.append('capacity', formData.capacity)
      form.append('location_m', formData.location_m)
      form.append('department', formData.department)
      form.append('status_m', formData.status_m)
      form.append('details_m', formData.details_m)

      // เก็บรูปไว้อัพโหลดแยก
      const imageFile = formData.image

      // Add equipment data - แก้ไขให้ตรงกับ backend
      if (equipmentList.length > 0) {
        const equipmentData = equipmentList.map(item => ({
          equipment_n: item.equipment_n,
          quantity: parseInt(item.quantity) || 1
        }))
        form.append('equipment', JSON.stringify(equipmentData))
      }

      const url = selectedRoom
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/rooms/${selectedRoom.room_id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/rooms`

      const method = selectedRoom ? 'PUT' : 'POST'

      // 🚀 Step 1: Save Room Data (Fast - ไม่มีรูป)
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: form
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save room data')
      }

      const roomData = await response.json()
      let roomId = selectedRoom ? selectedRoom.room_id : roomData.room?.room_id

      // 🖼️ Step 2: Handle Image Changes (Upload new or Delete existing)
      if (roomId) {
        console.log('🔍 Image handling decision:', {
          hasImageFile: !!imageFile,
          imageDeleted: imageDeleted,
          isEditMode: !!selectedRoom
        })

        if (imageFile) {
          // 📷 Priority 1: User selected a new image - always upload it (overrides any deletion)
          console.log('📷 User selected new image - uploading (ignoring any deletion flag)...')

          // ✅ Double check file before upload
          if (!imageFile.type.startsWith('image/')) {
            console.error('❌ Invalid file type:', imageFile.type)
            showAlert('error', 'ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น')
            return
          }

          if (imageFile.size > 5 * 1024 * 1024) {
            console.error('❌ File too large:', imageFile.size)
            showAlert('error', 'ไฟล์ใหญ่เกินไป', 'ขนาดไฟล์ต้องไม่เกิน 5 MB')
            return
          }

          const imageForm = new FormData()
          imageForm.append('image', imageFile)

          try {
            const imageResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/rooms/${roomId}/image`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: imageForm
              }
            )

            if (imageResponse.ok) {
              const responseData = await imageResponse.json()
              console.log('✅ Image uploaded successfully:', responseData)

              // อัพเดท UI
              const timestamp = Date.now()
              setImagePreview(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/image/${roomId}?t=${timestamp}`)

              // รีเฟรช rooms list
              setTimeout(() => fetchRooms(user), 500)
            } else {
              const errorData = await imageResponse.json().catch(() => ({ message: 'Unknown error' }))
              console.error('❌ Image upload failed:', errorData)
              showAlert('error', 'อัพโหลดรูปไม่สำเร็จ', errorData.message || 'เกิดข้อผิดพลาด')
            }
          } catch (error) {
            console.error('❌ Network error:', error)
            showAlert('error', 'เกิดข้อผิดพลาดเครือข่าย', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
          }
        } else if (imageDeleted && selectedRoom) {
          // 🗑️ Priority 2: User wants to delete existing image (only if no new image selected)
          console.log('🗑️ User wants to delete existing image - no new image selected')

          try {
            const deleteResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/protected/officer/rooms/${roomId}/image`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            )

            if (deleteResponse.ok) {
              console.log('✅ Image deleted successfully')
              setImagePreview(null)

              // รีเฟรช rooms list
              setTimeout(() => fetchRooms(user), 500)
            } else {
              console.log('⚠️ Image deletion failed, but room data saved')
            }
          } catch (error) {
            console.error('❌ Error deleting image:', error)
          }
        }
      }

      // ✅ Success - Room data saved (with or without image)
      setModalClosing(true)
      setTimeout(() => {
        setShowAddModal(false)
        setModalClosing(false)

        // แสดง Success Modal ตรงกลางจอ
        const message = selectedRoom ? '✅ แก้ไขข้อมูลห้องประชุมสำเร็จ!' : '✅ เพิ่มห้องประชุมสำเร็จ!'
        setSuccessMessage(message)
        setShowSuccessModal(true)

        // Auto-hide success modal
        setTimeout(() => {
          setSuccessModalClosing(true)
          setTimeout(() => {
            setShowSuccessModal(false)
            setSuccessModalClosing(false)
          }, 300)
        }, 2000)

        // Reset form
        setFormData({
          room_name: '',
          capacity: '',
          location_m: '',
          department: user?.department || 'ไม่ระบุ', // ล็อกตาม department ของผู้ใช้
          status_m: 'available',
          details_m: '',
          image: null
        })
        setImagePreview(null)
        setEquipmentList([])
        setSelectedRoom(null)
        setImageDeleted(false) // 🗑️ Reset image deletion flag

        // Refresh rooms list
        fetchRooms(user)
      }, 400) // ลดเวลา modal animation ลง

    } catch (error) {
      console.error('Error saving room:', error)
      showAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await handleSaveRoom()
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    console.log('📷 File input changed:', file ? 'File selected' : 'No file')

    if (file) {
      console.log('📂 File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })

      // ✅ Check file type
      if (!file.type.startsWith('image/')) {
        showAlert('error', 'ไฟล์ไม่ถูกต้อง!', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpg, png, gif, etc.)')
        e.target.value = ''
        return
      }

      // ✅ Check file size (limit 5MB)
      if (file.size > 5 * 1024 * 1024) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
        showAlert('error', 'ไฟล์รูปใหญ่เกินไป!', `ไฟล์ปัจจุบัน: ${fileSizeMB} MB - ขนาดสูงสุด: 5 MB`)
        e.target.value = ''
        return
      }

      console.log(`✅ Image validation passed: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

      // 🔄 Reset imageDeleted flag เมื่อเลือกไฟล์ใหม่ (แก้ปัญหาที่กดลบแล้วเลือกใหม่)
      if (imageDeleted) {
        console.log('🔄 Resetting imageDeleted flag because user selected new image')
        setImageDeleted(false)
      }

      setFormData(prev => {
        console.log('🔄 Updating formData with new image')
        return { ...prev, image: file }
      })

      const reader = new FileReader()
      reader.onload = (e) => {
        console.log('📷 Image preview ready')
        setImagePreview(e.target.result)
      }
      reader.onerror = (e) => {
        console.error('❌ FileReader error:', e)
        showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์รูปภาพได้')
      }
      reader.readAsDataURL(file)
    } else {
      console.log('🚫 No file selected - clearing image data')
      setFormData(prev => ({ ...prev, image: null }))
      setImagePreview(null)
    }
  }

  // 🎨 Status Badge สำหรับ Room Card (ใช้แบบ inline เพื่อความเรียบง่าย)
  const getStatusBadge = (status) => {
    const statusConfig = {
      available: {
        text: '✅ พร้อมใช้งาน',
        class: 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 shadow-sm'
      },
      maintenance: {
        text: '⚠️ ไม่พร้อมใช้งาน',
        class: 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200 shadow-sm'
      }
    }

    const config = statusConfig[status] || statusConfig.available
    return (
      <Badge className={`${config.class} font-semibold border px-3 py-1 rounded-full text-xs`}>
        {config.text}
      </Badge>
    )
  }



  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex)

  return (
    <DashboardLayout user={user}>
      {/* 🎨 Beautiful Background with Gradient */}
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 -m-6 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🏢 จัดการห้องประชุม</h1>
                <p className="text-gray-600 mt-1">
                  {user?.department || 'ไม่ระบุ'} | ทั้งหมด: {rooms.length} ห้อง
                  {searchQuery && (
                    <span className="text-blue-600 font-medium">
                      {' '} | แสดง: {filteredRooms.length} ห้อง
                    </span>
                  )}
                  {totalPages > 1 && (
                    <span className="text-gray-500 font-medium">
                      {' '} | หน้า: {currentPage} / {totalPages}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* 🔍 Search Bar - ปรับขนาดให้เท่ากับปุ่มอื่น */}
                <div className="relative flex items-center">
                  {/* Search Icon - ขนาดพอดี */}
                  <div className="absolute left-3 z-10 pointer-events-none">
                    <span className="text-lg">🔍</span>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาห้องประชุม..."
                    className="w-72 pl-12 pr-10 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-white shadow-sm hover:shadow-md transition-all duration-300 font-medium placeholder-gray-500 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 text-gray-400 hover:text-red-500 transition-colors duration-200 p-0.5 rounded-full hover:bg-gray-100"
                      title="ล้างการค้นหา"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleAddRoom}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium"
                >
                  ➕ เพิ่มห้องประชุม
                </Button>
              </div>
            </div>
          </div>

          {/* 🏢 Rooms Grid with Beautiful Design */}
          <div key={`rooms-grid-${forceUpdateKey}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedRooms.map((room) => (
              <Card key={room.reactKey || room.room_id} className="group hover:shadow-lg transition-all duration-300 border border-gray-200/50 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 overflow-hidden rounded-3xl shadow-md flex flex-col h-[680px] p-0 gap-0">
                {/* 📷 Room Image - เต็มมุมบนสุดของ Card */}
                <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden flex-shrink-0 rounded-t-3xl">
                  {/* เช็คว่ามีรูปหรือไม่ก่อนจะโหลด - ใช้ has_image จาก Backend */}
                  {room.has_image === true && room.room_id ? (
                    <>
                      {/* 🖼️ Room Image - โหลดผ่าน API endpoint พร้อม cache busting เฉพาะกรณีที่จำเป็น */}
                      <img
                        key={`room-img-${room.room_id}`}
                        src={`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/image/${room.room_id}?t=${room.imageTimestamp ?? (room.updated_at ? new Date(room.updated_at).getTime() : Date.now())}`}
                        alt={room.room_name}
                        className="w-full h-full object-cover transition-transform duration-300 rounded-t-3xl"
                        onError={(e) => {
                          // เงียบๆ แสดง fallback ไม่ต้อง log (ปกติสำหรับห้องที่ไม่มีรูป)
                          e.target.style.display = 'none'
                          const fallback = e.target.parentElement.querySelector('.fallback-image')
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />

                      {/* Fallback สำหรับกรณีที่รูปโหลดไม่ได้หรือไม่มีรูป */}
                      <div className="fallback-image absolute inset-0 w-full h-full hidden items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-t-3xl">
                        <div className="text-center">
                          <div className="text-6xl mb-3 text-blue-400 drop-shadow-lg">🏢</div>
                          <p className="text-blue-600 font-semibold text-sm">ไม่มีรูปภาพ</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* แสดง fallback เลยสำหรับห้องที่รู้ว่าไม่มีรูป */
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-t-3xl">
                      <div className="text-center">
                        <div className="text-6xl mb-3 text-blue-400 drop-shadow-lg">🏢</div>
                        <p className="text-blue-600 font-semibold text-sm">ไม่มีรูปภาพ</p>
                      </div>
                    </div>
                  )}

                  {/* 🏷️ Status Badge Overlay */}
                  <div className="absolute top-3 right-3 z-10">
                    {getStatusBadge(room.status_m)}
                  </div>
                </div>

                <div className="relative flex-1 flex flex-col">
                  {/* 📝 Card Content - แบ่งเป็น 2 ส่วน: เนื้อหาและปุ่ม */}
                  <div className="p-5 flex-1 flex flex-col min-h-[360px]"> {/* เปลี่ยนกลับมาแบบเดิม */}

                    {/* ส่วนเนื้อหา - ความสูงคงที่ */}
                    <div className="flex-1 space-y-3 h-[300px] overflow-hidden"> {/* เพิ่มความสูงเพื่อรองรับข้อความที่ใหญ่ขึ้น */}

                      {/* 🏷️ Room Name - ความสูงคงที่ */}
                      <div className="pb-2 border-b border-gray-200/60 h-14 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-wide line-clamp-2 flex-1 pr-2">
                          {room.room_name}
                        </h3>

                        {/* 📅 กรอบแสดงจำนวนการจองที่ยังมีผล */}
                        {room.current_users !== undefined ? (
                          <div className={`flex-shrink-0 border rounded-md px-2 py-0.5 shadow-sm ${room.current_users > 0
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                              : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                            }`}>
                            <span className={`text-xs font-medium ${room.current_users > 0 ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                              {room.current_users > 0 ? `จอง ${room.current_users} รายการ` : 'ไม่มีการจอง'}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* 📊 Room Information - ความสูงคงที่สำหรับแต่ละส่วน */}
                      <div className="space-y-3">

                        {/* 🏢 คณะ/หน่วยงาน - ความสูงคงที่ */}
                        <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                          <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                            <span className="text-lg">🏢</span>
                            <span className="text-base">คณะ/หน่วยงาน</span>
                          </span>
                          <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden">
                            {room.department}
                          </span>
                        </div>

                        {/* 📍 สถานที่ - ความสูงคงที่ */}
                        <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                          <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                            <span className="text-lg">📍</span>
                            <span className="text-base">สถานที่</span>
                          </span>
                          <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden">
                            {room.location_m}
                          </span>
                        </div>

                        {/* 👥 ความจุ - ความสูงคงที่ */}
                        <div className="flex items-center py-1 border-b border-gray-200 h-[40px]">
                          <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                            <span className="text-lg">👥</span>
                            <span className="text-base">ความจุ</span>
                          </span>
                          <span className="text-gray-900 text-base leading-relaxed ml-3">
                            {room.capacity ? `${room.capacity} คน` : 'ไม่ระบุ'}
                          </span>
                        </div>

                        {/* � รายละเอียดเพิ่มเติม - ความสูงคงที่ */}
                        <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                          <span className="text-gray-600 flex items-start gap-3 font-medium min-w-[140px] flex-shrink-0 pt-1">
                            <span className="text-lg">📝</span>
                            <span className="text-base">รายละเอียด</span>
                          </span>
                          <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden pt-1">
                            {room.details_m ?
                              room.details_m :
                              <span className="text-gray-400 italic">ไม่ระบุ</span>
                            }
                          </span>
                        </div>

                        {/* 🛠️ อุปกรณ์ - ความสูงคงที่ */}
                        <div className="py-1 h-[65px] overflow-hidden">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg">🛠️</span>
                            <span className="text-gray-600 font-medium text-base">อุปกรณ์</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-9 h-[40px] items-start content-start overflow-hidden">
                            {room.equipment?.length > 0 ? (
                              <>
                                {room.equipment.slice(0, 3).map((eq) => (
                                  <Badge key={eq.equipment_id} className="bg-blue-50 text-blue-700 border-blue-200 text-sm hover:bg-blue-100 transition-colors">
                                    {eq.equipment_n} ({eq.quantity})
                                  </Badge>
                                ))}
                                {room.equipment.length > 3 && (
                                  <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-sm font-semibold">
                                    +{room.equipment.length - 3} อื่นๆ
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 italic text-base">ไม่มีอุปกรณ์</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ส่วนปุ่ม - ติดด้านล่างเสมอ */}
                    <div className="mt-auto pt-1 border-t border-gray-200 flex-shrink-0 h-[66px]">
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(room)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:border-blue-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-200/50"
                        >
                          📋 ดู
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoom(room)}
                          className="bg-gradient-to-r from-green-500 to-green-600 border-green-600 text-white hover:from-green-600 hover:to-green-700 hover:border-green-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-200/50"
                        >
                          ✏️ แก้ไข
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.room_id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 border-red-600 text-white hover:from-red-600 hover:to-red-700 hover:border-red-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-200/50"
                        >
                          🗑️ ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* แสดงข้อความเมื่อไม่มีห้อง */}
            {rooms.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">ยังไม่มีห้องประชุม</h3>
                <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มห้องประชุมแรกของคุณ</p>
                <Button
                  onClick={handleAddRoom}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  ➕ เพิ่มห้องใหม่
                </Button>
              </div>
            )}

            {/* แสดงข้อความเมื่อค้นหาไม่เจอ */}
            {rooms.length > 0 && filteredRooms.length === 0 && searchQuery && (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่พบห้องประชุมที่ตรงกับการค้นหา</h3>
                <p className="text-gray-600 mb-4">
                  ลองค้นหาด้วยคำที่แตกต่าง เช่น ชื่อห้อง, สถานที่, หรือความจุ
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <strong>คำที่ค้นหา:</strong> "{searchQuery}"
                  </div>
                  <Button
                    onClick={() => setSearchQuery('')}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    🔄 ล้างการค้นหา
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center mt-8 gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                  }`}
              >
                ก่อนหน้า
              </button>

              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                )
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                  }`}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Room Modal with Beautiful UI */}
        {showAddModal && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ease-out ${modalClosing ? 'opacity-0' : 'opacity-100'
            }`}>
            {/* Enhanced Background Blur Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 transition-all duration-500 ease-out ${modalClosing
                ? 'opacity-0 backdrop-blur-none'
                : modalOpening
                  ? 'opacity-0 backdrop-blur-none'
                  : 'opacity-100 backdrop-blur-lg backdrop-saturate-150'
                }`}
              onClick={() => {
                setModalClosing(true)
                setTimeout(() => {
                  setShowAddModal(false)
                  setModalClosing(false)
                  setModalOpening(false) // Reset opening state
                  setSelectedRoom(null)
                }, 500) // เร็วขึ้น!
              }}
            />

            {/* Enhanced Modal Content */}
            <div className={`relative bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] transform transition-all duration-500 ease-out ${modalClosing
              ? 'scale-75 opacity-0 translate-y-8 rotate-1'
              : modalOpening
                ? 'scale-50 opacity-0 translate-y-12 -rotate-2'
                : 'scale-100 opacity-100 translate-y-0 rotate-0'
              } border border-gray-200/50 backdrop-blur-sm`}>
              {/* Custom Scrollbar Container */}
              <div className="overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent'
                }}>
                <form onSubmit={handleSubmit} className="p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedRoom ? '✏️ แก้ไขห้องประชุม' : '➕ เพิ่มห้องประชุมใหม่'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setModalClosing(true)
                        setTimeout(() => {
                          setShowAddModal(false)
                          setModalClosing(false)
                          setModalOpening(false) // Reset opening state
                          setSelectedRoom(null)
                        }, 500) // เร็วขึ้น!
                      }}
                      className="text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-110"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-base font-bold text-gray-900 mb-3">
                          🏢 ชื่อห้องประชุม *
                        </label>
                        <input
                          type="text"
                          value={formData.room_name}
                          onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                          placeholder="เช่น ห้องประชุม IT"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-base font-bold text-gray-900 mb-3">
                            👥 ความจุ (คน) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                            placeholder="เช่น 20"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-base font-bold text-gray-900 mb-3">
                            📊 สถานะห้องประชุม
                          </label>
                          <div className="relative">
                            {/* Custom Dropdown Button */}
                            <button
                              type="button"
                              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                              className="w-full p-4 pr-12 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md font-medium text-left flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                {formData.status_m === 'available' ? (
                                  <>
                                    <span className="w-3 h-3 bg-green-400 rounded-full mr-3 shadow-sm"></span>
                                    ✅ พร้อมใช้งาน
                                  </>
                                ) : (
                                  <>
                                    <span className="w-3 h-3 bg-yellow-400 rounded-full mr-3 shadow-sm"></span>
                                    ⚠️ ไม่พร้อมใช้งาน
                                  </>
                                )}
                              </span>
                              <svg
                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Custom Dropdown Options */}
                            {showStatusDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, status_m: 'available' })
                                    setShowStatusDropdown(false)
                                  }}
                                  className="w-full p-4 text-left hover:bg-green-50 transition-colors duration-200 flex items-center border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="w-3 h-3 bg-green-400 rounded-full mr-3 shadow-sm"></span>
                                  <span className="text-green-700 font-medium">✅ พร้อมใช้งาน</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, status_m: 'maintenance' })
                                    setShowStatusDropdown(false)
                                  }}
                                  className="w-full p-4 text-left hover:bg-yellow-50 transition-colors duration-200 flex items-center border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="w-3 h-3 bg-yellow-400 rounded-full mr-3 shadow-sm"></span>
                                  <span className="text-yellow-700 font-medium">⚠️ ไม่พร้อมใช้งาน</span>
                                </button>
                              </div>
                            )}

                            {/* Hidden input for form submission */}
                            <input
                              type="hidden"
                              name="status_m"
                              value={formData.status_m}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2 flex items-center">
                            <span className="mr-1">💡</span>
                            ไม่พร้อมใช้งาน = กำลังปรับปรุง/ซ่อมบำรุง
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-base font-bold text-gray-900 mb-3">
                          📍 สถานที่ *
                        </label>
                        <input
                          type="text"
                          value={formData.location_m}
                          onChange={(e) => setFormData({ ...formData, location_m: e.target.value })}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                          placeholder="เช่น อาคาร IT ชั้น 3"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-base font-bold text-gray-900 mb-3">
                          🏢 คณะ/หน่วยงาน *
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          readOnly
                          disabled
                          className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 cursor-not-allowed font-medium shadow-sm"
                          placeholder="ระบบกำหนดตามคณะของคุณ"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-base font-bold text-gray-900">
                            📝 รายละเอียดเพิ่มเติม
                          </label>
                          <span className={`text-sm font-medium ${formData.details_m.length > 250
                            ? 'text-red-500'
                            : formData.details_m.length > 200
                              ? 'text-orange-500'
                              : 'text-gray-500'
                            }`}>
                            {formData.details_m.length}/250
                          </span>
                        </div>
                        <textarea
                          value={formData.details_m}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value.length <= 250) {
                              setFormData({ ...formData, details_m: value })
                            }
                          }}
                          maxLength={250}
                          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 shadow-sm hover:shadow-md font-medium resize-none"
                          rows="4"
                          placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับห้องประชุม... (สูงสุด 250 ตัวอักษร)"
                        />
                        {formData.details_m.length > 230 && (
                          <p className="text-xs text-orange-600 mt-1 flex items-center">
                            <span className="mr-1">⚠️</span>
                            เหลือตัวอักษรอีก {250 - formData.details_m.length} ตัว
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-base font-bold text-gray-900 mb-3">
                          📷 รูปภาพห้องประชุม
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-2 text-center h-64 flex flex-col justify-center relative hover:border-blue-400 transition-colors bg-gradient-to-br from-gray-50 to-white">
                          {imagePreview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full rounded-lg object-contain"
                              />

                              {/* ปุ่มลบรูป */}
                              <button
                                type="button"
                                onClick={() => {
                                  setImagePreview(null)
                                  setFormData({ ...formData, image: null })
                                  setImageDeleted(true) // 🗑️ บอกว่าผู้ใช้ต้องการลบรูป
                                  console.log('🗑️ User requested to delete image')
                                }}
                                className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 shadow-lg transition-all duration-200 hover:scale-110"
                                title="ลบรูป"
                              >
                                🗑️
                              </button>

                              {/* ปุ่มเปลี่ยนรูปใหม่ */}
                              <button
                                type="button"
                                onClick={() => document.getElementById('room-image-input').click()}
                                className="absolute top-3 left-3 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-blue-600 shadow-lg transition-all duration-200 hover:scale-110"
                                title="เปลี่ยนรูปใหม่"
                              >
                                🔄
                              </button>

                              {/* ป้ายบอกสถานะรูป */}
                              <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-lg">
                                {selectedRoom ? 'รูปปัจจุบัน' : 'รูปใหม่'}
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => document.getElementById('room-image-input').click()}
                              className="cursor-pointer w-full h-full flex flex-col justify-center items-center hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            >
                              <div className="text-gray-400 mb-3 text-5xl">📷</div>
                              <p className="text-base text-gray-600 mb-2 font-medium">คลิกเพื่อเลือกรูปภาพ</p>
                              <p className="text-sm text-gray-500">รองรับไฟล์ JPG, PNG</p>
                              <p className="text-xs text-orange-600 font-medium mt-1">📏 ขนาดไฟล์ไม่เกิน 5MB</p>
                            </div>
                          )}
                          <input
                            id="room-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>

                        {/* คำอธิบายการใช้งาน */}
                        {imagePreview && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <div className="flex items-start space-x-2">
                              <div className="text-blue-600 text-sm font-medium">💡 วิธีใช้:</div>
                              <div className="text-blue-700 text-xs space-y-1">
                                <div>🔄 <span className="font-medium">เปลี่ยนรูป:</span> คลิกปุ่มสีน้ำเงิน</div>
                                <div>🗑️ <span className="font-medium">ลบรูป:</span> คลิกปุ่มสีแดง</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Equipment Management Section */}
                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">🛠️ อุปกรณ์ในห้อง</h4>
                          <Button
                            type="button"
                            onClick={handleAddEquipment}
                            className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1"
                          >
                            ➕ เพิ่มอุปกรณ์
                          </Button>
                        </div>

                        {equipmentList.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {equipmentList.map((equipment) => (
                              <div
                                key={equipment.id}
                                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border"
                              >
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900">{equipment.equipment_n}</span>
                                  <span className="ml-3 text-sm text-gray-600">จำนวน: {equipment.quantity}</span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveEquipment(equipment.id)}
                                  variant="outline"
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 text-sm"
                                >
                                  🗑️ ลบ
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <div className="text-3xl mb-2">📦</div>
                            <p className="text-gray-600 text-sm">ยังไม่มีอุปกรณ์</p>
                            <p className="text-xs text-gray-500">คลิก "เพิ่มอุปกรณ์" เพื่อเริ่มต้น</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 mt-8 pt-6 border-t">
                    <Button
                      type="button"
                      onClick={() => {
                        setModalClosing(true)
                        setTimeout(() => {
                          setShowAddModal(false)
                          setModalClosing(false)
                          setSelectedRoom(null)
                        }, 700)
                      }}
                      className="flex-1 !text-white !bg-red-500 !border-red-500 hover:!bg-red-600 hover:!border-red-600 font-medium justify-center"
                      style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' }}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      {submitting
                        ? (selectedRoom ? '⏳ กำลังอัพเดทข้อมูล...' : '⏳ กำลังสร้างห้องใหม่...')
                        : (selectedRoom ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มห้องประชุม')
                      }
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Modal */}
        {showEquipmentModal && (
          <div
            className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-sm backdrop-saturate-150 flex items-center justify-center z-50 p-4 transition-all duration-500 ease-out"
            onClick={() => {
              setShowEquipmentModal(false)
              setEquipmentModalOpening(false)
              setEquipmentForm({ equipment_n: '', quantity: 1 })
              setEquipmentError('')
            }}
          >
            <div
              className={`bg-white rounded-2xl max-w-md w-full transform transition-all duration-500 ease-out shadow-2xl border border-gray-200/50 ${equipmentModalOpening
                ? 'scale-50 opacity-0 translate-y-12 -rotate-2'
                : 'scale-100 opacity-100 translate-y-0 rotate-0'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-6 text-green-800">
                  🛠️ เพิ่มอุปกรณ์ใหม่
                </h3>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      ชื่ออุปกรณ์ *
                    </label>
                    <input
                      type="text"
                      value={equipmentForm.equipment_n}
                      onChange={(e) => {
                        setEquipmentForm({ ...equipmentForm, equipment_n: e.target.value })
                        if (equipmentError) setEquipmentError('') // clear error when typing
                      }}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 shadow-sm hover:shadow-md font-medium placeholder-gray-500"
                      placeholder="เช่น โปรเจคเตอร์"
                      required
                    />
                    {equipmentError && (
                      <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                        <p className="text-red-700 text-sm font-medium flex items-center">
                          <span className="text-lg mr-2">⚠️</span>
                          {equipmentError}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      จำนวน *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={equipmentForm.quantity}
                      onChange={(e) => setEquipmentForm({ ...equipmentForm, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-3 focus:ring-blue-400/30 focus:border-blue-500 text-gray-900 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-white transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowEquipmentModal(false)
                      setEquipmentModalOpening(false)
                      setEquipmentForm({ equipment_n: '', quantity: 1 })
                      setEquipmentError('')
                    }}
                    className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveEquipment}
                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    ➕ เพิ่มอุปกรณ์
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📋 Room Detail Modal - แยกเป็น Component แล้ว */}
        <RoomDetailModal
          showModal={showDetailModal}
          selectedRoom={selectedRoom}
          isOpening={detailModalOpening}
          isClosing={detailModalClosing}
          onClose={() => {
            setDetailModalClosing(true)
            setTimeout(() => {
              setShowDetailModal(false)
              setDetailModalClosing(false)
              setDetailModalOpening(false)
              setSelectedRoom(null)
            }, 200) // เร็วสำหรับปิด!
          }}
          onEdit={(room) => {
            setShowDetailModal(false)
            handleEditRoom(room)
          }}
        />

        {/* 🎉 Success Modal - ตรงกลางจอ */}
        {showSuccessModal && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${successModalClosing ? 'opacity-0' : 'opacity-100'
            }`}>
            {/* Background Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

            {/* Success Modal */}
            <div className={`relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 ease-out ${successModalClosing ? 'scale-90 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'
              } border border-gray-200`}>

              {/* Success Icon */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">สำเร็จ!</h3>
                <p className="text-gray-600">{successMessage}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setSuccessModalClosing(true)
                  setTimeout(() => {
                    setShowSuccessModal(false)
                    setSuccessModalClosing(false)
                  }, 300)
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                ตกลง
              </button>
            </div>
          </div>
        )}

        {/* 🚨 Custom Alert Modal */}
        <CustomAlert
          isOpen={alert.isOpen}
          onClose={closeAlert}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onConfirm={alert.onConfirm}
          showCancel={alert.showCancel}
          confirmText={alert.type === 'confirm' ? 'ลบห้องประชุม' : 'ตกลง'}
          cancelText="ยกเลิก"
        />

      </div>
    </DashboardLayout>
  )
}

// ✅ Export with React.memo for performance optimization
export default React.memo(OfficerRoomsPage)
