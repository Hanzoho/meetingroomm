'use client'

import React, { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

const ManageBookingsPage = () => {
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  // Mock data removed - use API instead
  const allBookings = []
  const meetingrooms = []
  const roomMap = useMemo(() => {
    if (!meetingrooms || !Array.isArray(meetingrooms)) return new Map()
    return new Map(meetingrooms.map((room) => [room.id, room.name]))
  }, [meetingrooms])

  const bookingsWithRoomNames = useMemo(() => {
    const processedBookings = allBookings
      .map((booking) => ({
        ...booking,
        roomName: roomMap.get(booking.meetingroomId) || 'ไม่พบชื่อห้อง',
      }))
      .filter(
        (booking) => statusFilter === 'All' || booking.status === statusFilter,
      )
      .filter((booking) => {
        if (!searchTerm) return true
        const lowercasedTerm = searchTerm.toLowerCase()
        return (
          booking.roomName.toLowerCase().includes(lowercasedTerm) ||
          (booking.userName &&
            booking.userName.toLowerCase().includes(lowercasedTerm))
        )
      })

    // 4. Sort the final result
    return processedBookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
  }, [roomMap, statusFilter, searchTerm, allBookings])

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'default'
      case 'Pending':
        return 'secondary'
      case 'Cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const translateStatus = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'ยืนยันแล้ว'
      case 'Pending':
        return 'รออนุมัติ'
      case 'Cancelled':
        return 'ยกเลิกแล้ว'
      default:
        return status
    }
  }

  const handleCancelBooking = (bookingId) => {
    // ในแอปพลิเคชันจริง ส่วนนี้จะส่ง request ไปยัง API เพื่อยกเลิก
    console.log(`Cancelling booking ${bookingId}`)
    toast.success('ยกเลิกการจองสำเร็จ', {
      description: `การจอง ID: ${bookingId} ถูกยกเลิกแล้ว`,
    })
    // ในแอปพลิเคชันจริง ควรมีการอัปเดต state หรือ refetch ข้อมูลที่นี่
  }

  const filterButtons = [
    { label: 'ทั้งหมด', value: 'All' },
    { label: 'ยืนยันแล้ว', value: 'Confirmed' },
    { label: 'รออนุมัติ', value: 'Pending' },
    { label: 'ยกเลิกแล้ว', value: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการการจอง</h1>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ค้นหาด้วยชื่อห้องหรือผู้จอง..."
            className="w-full rounded-lg bg-background pl-8 md:w-[250px] lg:w-[320px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={statusFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการจอง</CardTitle>
          <CardDescription>
            แสดงรายการจองห้องประชุมทั้งหมดในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้องประชุม</TableHead>
                <TableHead>ผู้จอง</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>เวลา</TableHead>
                <TableHead className="text-center">สถานะ</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsWithRoomNames.length > 0 ? (
                bookingsWithRoomNames.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.roomName}
                    </TableCell>
                    <TableCell>{booking.userName || 'N/A'}</TableCell>
                    <TableCell>
                      {format(new Date(booking.bookingDate), 'd MMM yyyy', {
                        locale: th,
                      })}
                    </TableCell>
                    <TableCell>{booking.startTime}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusVariant(booking.status)}>
                        {translateStatus(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">เปิดเมนู</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              toast.info(`ดูรายละเอียดการจอง ID: ${booking.id}`)
                            }
                          >
                            ดูรายละเอียด
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-600"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={booking.status === 'Cancelled'}
                          >
                            ยกเลิกการจอง
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    ไม่พบรายการจองที่ตรงกับเงื่อนไข
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManageBookingsPage
