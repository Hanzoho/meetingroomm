'use client'

import React from 'react'
import { ROLE_CONFIG } from '@/constants/userManagement'

export default function UserStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'ผู้ใช้ทั้งหมด',
      value: stats.totalUsers,
      icon: '👥',
      bgGradient: 'from-blue-500 to-cyan-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'ผู้ใช้ทั่วไป',
      value: stats.regularUsers,
      icon: '👤',
      bgGradient: 'from-green-500 to-emerald-500',
      textColor: 'text-green-600'
    },
    {
      title: 'เจ้าหน้าที่',
      value: stats.officers,
      icon: '👨‍💻',
      bgGradient: 'from-purple-500 to-pink-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'ผู้บริหาร',
      value: stats.executives,
      icon: '👨‍💼',
      bgGradient: 'from-orange-500 to-red-500',
      textColor: 'text-orange-600'
    },
    {
      title: 'ผู้ดูแลระบบ',
      value: stats.admins,
      icon: '⚙️',
      bgGradient: 'from-gray-500 to-slate-500',
      textColor: 'text-gray-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className={`text-3xl font-bold ${card.textColor}`}>
                {card.value?.toLocaleString() || 0}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${card.bgGradient} flex items-center justify-center text-white text-xl shadow-lg`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}