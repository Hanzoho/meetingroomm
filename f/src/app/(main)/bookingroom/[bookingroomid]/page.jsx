import React from 'react'
import { notFound } from 'next/navigation'
import MeetingroomDetail from '@/components/meetingroom-detail'

// ✅ generateStaticParams — ป้องกันล้มถ้า array undefined  
export async function generateStaticParams() {
  try {
    // ดึงข้อมูลห้องจริงจาก API (server-side ต้องใช้ absolute URL)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5580'
    const response = await fetch(`${baseUrl}/api/rooms`)
    const data = await response.json()
    
    if (!data.rooms || !Array.isArray(data.rooms)) {
      console.warn('⚠️ ไม่มีข้อมูล meetingroom สำหรับ generateStaticParams')
      return []
    }

    return data.rooms.map((room) => ({
      bookingroomid: room.room_id.toString(),
    }))
  } catch (error) {
    console.warn('⚠️ ไม่สามารถดึงข้อมูลห้องได้:', error)
    return []
  }
}

// ✅ generateMetadata — ใช้ props และเช็คข้อมูล
export async function generateMetadata(props) {
  const { bookingroomid } = props.params

  try {
    // ดึงข้อมูลห้องจริงจาก API (server-side ต้องใช้ absolute URL)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5580'
    const response = await fetch(`${baseUrl}/api/rooms/${bookingroomid}`)
    const data = await response.json()

    if (!response.ok || !data.room) {
      return {
        title: 'ไม่พบห้องประชุม',
      }
    }

    return {
      title: `${data.room.room_name} - จองห้องประชุมออนไลน์`,
      description: `ห้องประชุม ${data.room.room_name} ความจุ ${data.room.capacity} คน`,
    }
  } catch (error) {
    return {
      title: 'ไม่พบห้องประชุม',
    }
  }
}

// ✅ Main Page Component
const BookingDetailPage = async (props) => {
  const { bookingroomid } = props.params

  try {
    // ดึงข้อมูลห้องจริงจาก API
    const response = await fetch(`/api/rooms/${bookingroomid}`, {
      cache: 'no-store' // ไม่ cache เพื่อให้ได้ข้อมูลล่าสุด
    })
    const data = await response.json()

    if (!response.ok || !data.room) {
      notFound()
    }

    return <MeetingroomDetail meetingroom={data.room} />
  } catch (error) {
    console.error('Error fetching room data:', error)
    notFound()
  }
}

export default BookingDetailPage
