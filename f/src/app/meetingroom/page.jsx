'use client'

import MeetingroomGrid from '@/components/meetingroom-grid'
import React, { useEffect, useState } from 'react'
import { calendarAPI } from '@/lib/fetchData'



const MeetingroomPage = ({ searchParams }) => {
  const [rooms, setRooms] = useState([])

  const [error, setError] = useState(null)
  
  const query = searchParams?.q || ''
  const size = searchParams?.size || ''

  // ดึงข้อมูลห้องจริงจาก backend
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const result = await calendarAPI.getAllRooms()
        
        setRooms(result.rooms || [])
      } catch (error) {
        console.error('ไม่สามารถดึงรายการห้องได้:', error)
        setError('ไม่สามารถดึงรายการห้องได้')
      }
    }

    fetchRooms()
  }, [])

  // Filter rooms based on search params
  let filteredRooms = rooms

  // Filter by search query
  if (query) {
    filteredRooms = filteredRooms.filter(
      (room) =>
        room.room_name?.toLowerCase().includes(query.toLowerCase()) ||
        room.department?.toLowerCase().includes(query.toLowerCase()) ||
        room.location_m?.toLowerCase().includes(query.toLowerCase())
    )
  }

  // Filter by size (capacity)
  if (size) {
    const sizeNumber = parseInt(size)
    if (!isNaN(sizeNumber)) {
      filteredRooms = filteredRooms.filter((room) => room.capacity >= sizeNumber)
    }
  }



  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20 text-red-600">
          <span className="text-xl mr-2">❌</span>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">
        {query ? `ผลการค้นหาสำหรับ: "${query}"` : 'ห้องประชุมทั้งหมด'}
      </h1>
      <MeetingroomGrid meetingrooms={filteredRooms} />
    </div>
  )
}

export default MeetingroomPage
