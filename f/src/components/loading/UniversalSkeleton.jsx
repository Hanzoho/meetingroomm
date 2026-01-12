import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Universal Skeleton Loading Component สำหรับทุกหน้าใน Navbar
export default function UniversalSkeleton({ type = 'content' }) {
  if (type === 'table') {
    return (
      <>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 py-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-28 ml-auto" />
          </div>
        ))}
      </>
    )
  }

  // Default content skeleton
  return (
    <div className="space-y-6 p-4">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>

      {/* Additional content skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
