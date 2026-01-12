'use client'

import React from 'react'

export default function StatusBadge({ status }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          text: 'รออนุมัติ',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: '⏳'
        }
      case 'approved':
        return {
          text: 'อนุมัติแล้ว',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: '✅'
        }
      case 'rejected':
        return {
          text: 'ปฏิเสธ',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: '❌'
        }
      default:
        return {
          text: 'ไม่ระบุ',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: '❓'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      <span>{config.icon}</span>
      {config.text}
    </span>
  )
}