import React from 'react'
import MeetingroomCard from './meetingroom-card'

const MeetingroomGrid = ({ meetingrooms }) => {
  if (!meetingrooms || meetingrooms.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg text-muted-foreground">ไม่พบห้องประชุมที่ตรงกับเงื่อนไขของคุณ</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {meetingrooms.map((room) => (
        <MeetingroomCard meetingroom={room} key={room.id} />
      ))}
    </div>
  )
}

export default MeetingroomGrid