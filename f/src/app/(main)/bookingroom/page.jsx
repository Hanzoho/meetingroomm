import { Suspense } from 'react'
import BookingRoomContent from './BookingRoomContent'

function BookingRoomSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">ห้องประชุมทั้งหมด</h1>
        <p className="text-muted-foreground">
          เลือกและจองห้องประชุมที่เหมาะกับความต้องการของคุณ
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className="h-48 w-full animate-pulse rounded-md bg-muted"></div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BookingRoomPage() {
  return (
    <Suspense fallback={<BookingRoomSkeleton />}>
      <BookingRoomContent />
    </Suspense>
  )
}