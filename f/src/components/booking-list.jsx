'use client'

import React, { useState } from 'react'
import BookingCard from './meetingroom-card.jsx' // ระบุ .jsx เพื่อให้แน่ใจว่า import ถูกต้อง
import { toast } from 'sonner'

const BookingList = ({ initialBookings }) => {
  const [bookings, setBookings] = useState(initialBookings)

  const handleCancelBooking = (bookingId) => {
    // ในแอปพลิเคชันจริง ส่วนนี้จะส่ง request ไปยัง API ของคุณ
    // สำหรับตัวอย่างนี้ เราจะอัปเดตแค่ state ในหน้าเว็บ
    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: 'Cancelled' }
          : booking
      )
    )
    toast.success('การจองถูกยกเลิกเรียบร้อยแล้ว')
  }

  if (bookings.length === 0) {
    return (
      <p className="text-center text-gray-500">คุณยังไม่มีรายการจอง</p>
    )
  }

  return (
    <div className="space-y-6">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={handleCancelBooking}
        />
      ))}
    </div>
  )
}

export default BookingList