'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils, reservationAPI } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ReservationDetailModal from '@/components/modals/ReservationDetailModal'

// Smart Custom Select Component
function SmartCustomSelect({ value, onChange, options, className, placeholder, required, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSelect = (selectedValue) => {
    onChange({ target: { value: selectedValue } })
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
    }
  }

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={handleToggle}
        className={className}
        required={required}
        style={{
          backgroundImage: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
      >
        <span className="block truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 ค้นหา..."
                className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-4 py-3 hover:bg-green-50 hover:text-green-800 transition-colors duration-150 ${
                    value === option.value
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm">
                ไม่พบข้อมูลที่ค้นหา
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Statistics Cards Component
function StatisticsCards({ stats }) {
  const cards = [
    {
      id: 'total',
      title: 'ประวัติทั้งหมด',
      value: stats.total || 0,
      icon: '📋',
      color: 'blue'
    },
    {
      id: 'pending',
      title: 'รออนุมัติ',
      value: stats.pending || 0,
      icon: '⏳',
      color: 'yellow'
    },
    {
      id: 'approved',
      title: 'อนุมัติแล้ว',
      value: stats.approved || 0,
      icon: '✅',
      color: 'green'
    },
    {
      id: 'rejected',
      title: 'ถูกปฏิเสธ',
      value: stats.rejected || 0,
      icon: '❌',
      color: 'red'
    },
    {
      id: 'cancelled',
      title: 'ยกเลิกแล้ว',
      value: stats.cancelled || 0,
      icon: '🚫',
      color: 'gray'
    }
  ]

  const getBorderColor = (color) => {
    const colors = {
      blue: 'border-blue-500',
      yellow: 'border-yellow-500',
      green: 'border-green-500',
      red: 'border-red-500',
      gray: 'border-gray-500'
    }
    return colors[color] || colors.blue
  }

  const getTextColor = (color) => {
    const colors = {
      blue: 'text-blue-600',
      yellow: 'text-yellow-600',
      green: 'text-green-600',
      red: 'text-red-600',
      gray: 'text-gray-600'
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={`${card.id}-${index}`}
          className={`bg-white rounded-xl p-4 shadow-lg border-l-4 ${getBorderColor(card.color)} transition-all duration-200 hover:shadow-md`}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">{card.icon}</div>
            <h3 className="text-xs font-semibold text-gray-700">{card.title}</h3>
            <p className={`text-xl font-bold ${getTextColor(card.color)}`}>
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Filter Tabs Component (แบบ my-reservations)
function FilterTabs({ stats, currentFilter, onFilterChange }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <span className="text-2xl mr-3">📋</span>
              ประวัติการจองของฉัน
            </h2>
            <div className="text-sm text-gray-600">
              ทั้งหมด {stats.total || 0} รายการ
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">กรองตามสถานะ</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onFilterChange('all')}
            className={`p-3 rounded-lg text-center transition-all duration-200 ${
              currentFilter === 'all'
                ? 'bg-blue-500 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
            }`}
          >
            <div className="text-lg mb-1">📊</div>
            <div className="text-xs font-medium">ทั้งหมด</div>
            <div className="text-sm font-bold">({stats.total || 0})</div>
          </button>

          <button
            onClick={() => onFilterChange('pending')}
            className={`p-3 rounded-lg text-center transition-all duration-200 ${
              currentFilter === 'pending'
                ? 'bg-yellow-500 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 border border-gray-200'
            }`}
          >
            <div className="text-lg mb-1">⏳</div>
            <div className="text-xs font-medium">รออนุมัติ</div>
            <div className="text-sm font-bold">({stats.pending || 0})</div>
          </button>

          <button
            onClick={() => onFilterChange('approved')}
            className={`p-3 rounded-lg text-center transition-all duration-200 ${
              currentFilter === 'approved'
                ? 'bg-green-500 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 border border-gray-200'
            }`}
          >
            <div className="text-lg mb-1">✅</div>
            <div className="text-xs font-medium">อนุมัติแล้ว</div>
            <div className="text-sm font-bold">({stats.approved || 0})</div>
          </button>

          <button
            onClick={() => onFilterChange('rejected')}
            className={`p-3 rounded-lg text-center transition-all duration-200 ${
              currentFilter === 'rejected'
                ? 'bg-red-500 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
            }`}
          >
            <div className="text-lg mb-1">❌</div>
            <div className="text-xs font-medium">ปฏิเสธ</div>
            <div className="text-sm font-bold">({stats.rejected || 0})</div>
          </button>

          <button
            onClick={() => onFilterChange('cancelled')}
            className={`p-3 rounded-lg text-center transition-all duration-200 ${
              currentFilter === 'cancelled'
                ? 'bg-gray-500 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-600 border border-gray-200'
            }`}
          >
            <div className="text-lg mb-1">🚫</div>
            <div className="text-xs font-medium">ยกเลิก</div>
            <div className="text-sm font-bold">({stats.cancelled || 0})</div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Search and Filter Component (แบบเดิม - ถ้าจำเป็น)
function SearchAndFilter({ filters, onFilterChange }) {
  const periodOptions = [
    { value: '', label: '-- ทุกช่วงเวลา --' },
    { value: 'today', label: '📅 วันนี้' },
    { value: 'week', label: '📆 สัปดาห์นี้' },
    { value: 'month', label: '📊 เดือนนี้' },
    { value: 'year', label: '📈 ปีนี้' }
  ]

  const statusOptions = [
    { value: '', label: '-- ทุกสถานะ --' },
    { value: 'pending', label: '⏳ รออนุมัติ' },
    { value: 'approved', label: '✅ อนุมัติแล้ว' },
    { value: 'rejected', label: '❌ ปฏิเสธ' },
    { value: 'cancelled', label: '🚫 ยกเลิกแล้ว' }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <span className="text-2xl lg:text-3xl mr-2 lg:mr-3">🔍</span>
          ค้นหาและกรองข้อมูล
        </h2>
        <p className="text-gray-600 text-sm lg:text-base">
          กรองประวัติการจองตามช่วงเวลาและสถานะที่ต้องการ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Search by keyword */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ค้นหาด้วยคำสำคัญ
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="ชื่อห้อง, รายละเอียด..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm lg:text-base transition-all duration-200"
          />
        </div>

        {/* Period filter */}
        <div>
          <SmartCustomSelect
            label="ช่วงเวลา"
            value={filters.period || ''}
            onChange={(e) => onFilterChange({ ...filters, period: e.target.value })}
            options={periodOptions}
            placeholder="-- เลือกช่วงเวลา --"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm lg:text-base transition-all duration-200 bg-white text-left"
          />
        </div>

        {/* Status filter */}
        <div>
          <SmartCustomSelect
            label="สถานะ"
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            options={statusOptions}
            placeholder="-- เลือกสถานะ --"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm lg:text-base transition-all duration-200 bg-white text-left"
          />
        </div>
      </div>

      {/* Clear filters button */}
      <div className="mt-4 lg:mt-6 flex justify-end">
        <Button
          onClick={() => onFilterChange({ search: '', period: '', status: '' })}
          variant="outline"
          className="text-sm lg:text-base"
        >
          🗑️ ล้างตัวกรอง
        </Button>
      </div>
    </div>
  )
}

// History Table Component
function HistoryTable({ reservations, onViewReservation }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Bangkok'
      }).format(date)
    } catch (error) {
      return 'วันที่ไม่ถูกต้อง'
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    try {
      // If it's a full datetime string, extract time
      if (timeString.includes('T')) {
        const time = new Date(timeString)
        return time.toLocaleTimeString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Bangkok'
        })
      }
      // If it's just time string (HH:MM)
      return timeString.slice(0, 5)
    } catch (error) {
      return timeString.slice(0, 5) || ''
    }
  }

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'ไม่ระบุ'
    try {
      const date = new Date(dateTimeString)
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok'
      }).format(date)
    } catch (error) {
      return 'วันที่ไม่ถูกต้อง'
    }
  }

  const getStatusBadge = (status) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'pending':
        case 'รออนุมัติ':
          return 'bg-yellow-100 text-yellow-800'
        case 'approved':
        case 'อนุมัติแล้ว':
          return 'bg-green-100 text-green-800'
        case 'rejected':
        case 'ปฏิเสธ':
          return 'bg-red-100 text-red-800'
        case 'cancelled':
        case 'ยกเลิก':
          return 'bg-gray-100 text-gray-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const getStatusText = (status) => {
      switch (status) {
        case 'pending':
          return 'รออนุมัติ'
        case 'approved':
          return 'อนุมัติแล้ว'
        case 'rejected':
          return 'ปฏิเสธ'
        case 'cancelled':
          return 'ยกเลิก'
        case 'รออนุมัติ':
        case 'อนุมัติแล้ว':
        case 'ปฏิเสธ':
        case 'ยกเลิก':
          return status // ถ้าเป็นภาษาไทยแล้วให้ใช้ตัวเดิม
        default:
          return status
      }
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(status)}`}>
        {getStatusText(status)}
      </span>
    )
  }

  if (reservations.length === 0) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <div className="text-6xl lg:text-8xl mb-4">📭</div>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">
          ไม่พบประวัติการจอง
        </h3>
        <p className="text-gray-600 text-sm lg:text-base mb-6">
          ยังไม่มีประวัติการจองห้องประชุมที่ตรงกับเงื่อนไขที่เลือก
        </p>
        <a 
          href="/reserve"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          จองห้องประชุม
        </a>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  ห้องประชุม
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  วันที่ทำการจอง
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  วันที่ใช้
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  วันที่สิ้นสุด
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  เวลาใช้
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  สถานะ
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  รายละเอียด
                </th>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.map((reservation, index) => (
                <tr key={`${reservation.booking_id}-${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-3 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-[150px] truncate" title={reservation.room_name}>
                      {reservation.room_name || 'ไม่ระบุ'}
                    </div>
                    {reservation.department && (
                      <div className="text-xs text-gray-600 mt-1 max-w-[150px] truncate" title={reservation.department}>
                        {reservation.department}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1 max-w-[150px] truncate" title={reservation.room_location}>
                      {reservation.room_location || ''}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(reservation.created_at)}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(reservation.start_date)}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(reservation.end_date || reservation.start_date)}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900 whitespace-nowrap">
                      {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {getStatusBadge(reservation.status)}
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900 max-w-[160px] truncate" title={reservation.details || reservation.purpose}>
                      {reservation.details || reservation.purpose || 'ไม่ระบุ'}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center justify-center space-x-3">
                      <button 
                        onClick={() => onViewReservation(reservation)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                        title="ดูรายละเอียด"
                      >
                        <span>📄</span>
                        <span>ดู</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden">
        {reservations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>ไม่มีข้อมูลการจองในหมวดหมู่นี้</p>
          </div>
        ) : (
          reservations.map((reservation, index) => (
            <div key={`${reservation.booking_id}-${index}`} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-3">
                  <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={reservation.room_name}>
                    {reservation.room_name}
                  </h3>
                  {reservation.department && (
                    <p className="text-sm text-gray-600 truncate mb-1" title={reservation.department}>
                      {reservation.department}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 truncate" title={reservation.room_location}>
                    {reservation.room_location}
                  </p>
                </div>
                {getStatusBadge(reservation.status)}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">📅 วันที่จอง:</span>
                  <span className="text-gray-900 text-xs">{formatDateTime(reservation.created_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">🗓️ วันที่ใช้:</span>
                  <span className="text-gray-900">{formatDate(reservation.start_date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">🏁 วันที่สิ้นสุด:</span>
                  <span className="text-gray-900">{formatDate(reservation.end_date || reservation.start_date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">⏰ เวลาใช้:</span>
                  <span className="text-gray-900">{formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 font-medium">📝 รายละเอียด:</span>
                  <span className="text-gray-900 text-right max-w-[160px] break-words">
                    {reservation.details || reservation.purpose || 'ไม่ระบุ'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => onViewReservation(reservation)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
                  title="ดูรายละเอียด"
                >
                  <span>📄</span>
                  <span>ดู</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

// Main Component
export default function HistoryPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [allReservations, setAllReservations] = useState([]) // ประวัติเฉพาะที่เกินวันแล้ว
  const [allBookingsData, setAllBookingsData] = useState([]) // ข้อมูลทั้งหมด สำหรับ stats
  const [filteredReservations, setFilteredReservations] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    period: '',
    status: ''
  })

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [isClosingModal, setIsClosingModal] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // โหลดข้อมูลประวัติการจอง
  const loadHistoryData = async () => {
    try {
      const response = await reservationAPI.getMyBookings()
      
      if (response && response.success) {
        const allBookings = response.data || []
        
        // 🔍 Debug: ตรวจสอบข้อมูล approved_by
        console.log('=== DEBUG RESERVATIONS DATA ===')
        allBookings.forEach((booking, index) => {
          if (index < 3) { // แสดงแค่ 3 รายการแรก
            console.log(`Booking ${index + 1}:`, {
              id: booking.reservation_id,
              status: booking.status,
              approved_by: booking.approved_by,
              rejected_reason: booking.rejected_reason,
              details: booking.details
            })
          }
        })
        console.log('================================')
        
        setAllBookingsData(allBookings) // เก็บข้อมูลทั้งหมดไว้สำหรับ stats
        
        // กรองเฉพาะประวัติ (เกินวันแล้ว + การจองที่ยกเลิกไม่ว่าจะวันไหน)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const historyReservations = allBookings.filter(booking => {
          const startDate = new Date(booking.start_date)
          startDate.setHours(0, 0, 0, 0)
          // แสดงประวัติที่เกินวันแล้ว หรือ ถูกยกเลิก/ปฏิเสธไม่ว่าจะวันไหน
          return startDate < today || booking.status === 'cancelled' || booking.status === 'rejected'
        })
        
        setAllReservations(historyReservations)
      } else {
        setAllReservations([])
        setAllBookingsData([])
      }
    } catch (error) {
      setAllReservations([])
      setAllBookingsData([])
    }
  }

  // Auth และโหลดข้อมูลเริ่มต้น
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeAuth = async () => {
      // เช็ค auth เหมือนหน้าอื่น ๆ
      const userData = authUtils.getUserWithRole()
      const token = authUtils.getToken()
      
      if (!token || !userData || !authUtils.isAuthenticated()) {
        router.push('/login')
        return
      }
      
      if (userData.role !== 'user') {
        router.push(`/dashboard/${userData.role}`)
        return
      }

      setUser(userData)
      await loadHistoryData()
    }

    initializeAuth()
  }, [router])

  // กรองข้อมูลตาม filters
  useEffect(() => {
    let filtered = [...allReservations]

    // กรองตามคำค้นหา
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(reservation =>
        (reservation.room_name || '').toLowerCase().includes(searchTerm) ||
        (reservation.purpose || '').toLowerCase().includes(searchTerm) ||
        (reservation.details || '').toLowerCase().includes(searchTerm)
      )
    }

    // กรองตามช่วงเวลา
    if (filters.period) {
      const now = new Date()
      let startDate = new Date()

      switch (filters.period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          startDate.setHours(0, 0, 0, 0)
          break
        default:
          startDate = null
      }

      if (startDate) {
        filtered = filtered.filter(reservation => {
          const reservationDate = new Date(reservation.start_date)
          return reservationDate >= startDate
        })
      }
    }

    // กรองตามสถานะ - รองรับทั้งภาษาอังกฤษและไทย
    if (filters.status) {
      filtered = filtered.filter(reservation => {
        const status = reservation.status
        if (filters.status === 'pending') {
          return status === 'pending' || status === 'รออนุมัติ'
        } else if (filters.status === 'approved') {
          return status === 'approved' || status === 'อนุมัติแล้ว'
        } else if (filters.status === 'rejected') {
          return status === 'rejected' || status === 'ปฏิเสธ'
        } else if (filters.status === 'cancelled') {
          return status === 'cancelled' || status === 'ยกเลิก'
        }
        return status === filters.status
      })
    }

    setFilteredReservations(filtered)
  }, [allReservations, filters])

  // Modal functions
  const handleViewReservation = async (reservation) => {
    try {
      // ดึงข้อมูลรายละเอียดจาก API
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/protected/reservations/${reservation.reservation_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // ใช้ข้อมูลจาก API ที่มีข้อมูลผู้อนุมัติ/ปฏิเสธและเหตุผล
        setSelectedReservation({
          ...reservation,
          approved_by: data.reservation.approval?.approved_by,
          rejected_reason: data.reservation.approval?.rejected_reason
        })
      } else {
        // ถ้าดึงข้อมูลไม่สำเร็จ ใช้ข้อมูลเดิม
        setSelectedReservation(reservation)
      }
      
      setIsClosingModal(false)
      setShowViewModal(true)
    } catch (error) {
      console.error('Error fetching reservation details:', error)
      // กรณี error ก็ใช้ข้อมูลเดิม
      setSelectedReservation(reservation)
      setIsClosingModal(false)
      setShowViewModal(true)
    }
  }

  const handleCloseModal = () => {
    setIsClosingModal(true)
    setTimeout(() => {
      setShowViewModal(false)
      setIsClosingModal(false)
      setSelectedReservation(null)
    }, 150)
  }

  // Helper functions สำหรับ Modal
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    const time = new Date(timeString)
    return time.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return ''
    const dateTime = new Date(dateTimeString)
    return dateTime.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'รออนุมัติ':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
      case 'อนุมัติแล้ว':
        return 'bg-green-100 text-green-800'
      case 'rejected':
      case 'ปฏิเสธ':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
      case 'ยกเลิก':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'รออนุมัติ'
      case 'approved':
        return 'อนุมัติแล้ว'
      case 'rejected':
        return 'ปฏิเสธ'
      case 'cancelled':
        return 'ยกเลิก'
      case 'รออนุมัติ':
      case 'อนุมัติแล้ว':
      case 'ปฏิเสธ':
      case 'ยกเลิก':
        return status // ถ้าเป็นภาษาไทยแล้วให้ใช้ตัวเดิม
      default:
        return status
    }
  }

  // คำนวณ dynamic stats จากข้อมูลทั้งหมด (รวม upcoming)
  const dynamicStats = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return {
      total: allReservations.length, // จำนวนประวัติทั้งหมด
      pending: allReservations.filter(r => r.status === 'pending' || r.status === 'รออนุมัติ').length,
      approved: allReservations.filter(r => r.status === 'approved' || r.status === 'อนุมัติแล้ว').length,
      rejected: allReservations.filter(r => r.status === 'rejected' || r.status === 'ปฏิเสธ').length,
      cancelled: allReservations.filter(r => r.status === 'cancelled' || r.status === 'ยกเลิก').length
    }
  }, [allReservations, allBookingsData])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / itemsPerPage)) // At least 1 page
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Pagination Component
  const Pagination = () => {
    // Always show pagination, even with only 1 page

    const getPageNumbers = () => {
      if (totalPages <= 1) return [1] // Show at least page 1
      
      const delta = 2
      const range = []
      const rangeWithDots = []

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i)
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...')
      } else {
        rangeWithDots.push(1)
      }

      rangeWithDots.push(...range)

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages)
      } else {
        rangeWithDots.push(totalPages)
      }

      return rangeWithDots
    }

    const pageNumbers = getPageNumbers()

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          ทั้งหมด {filteredReservations.length} รายการ
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            ← ก่อนหน้า
          </button>

          {pageNumbers.map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
              disabled={pageNum === '...'}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                pageNum === currentPage
                  ? 'bg-blue-500 text-white'
                  : pageNum === '...'
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            ถัดไป →
          </button>
        </div>
      </div>
    )
  }

  // ถ้ายังโหลด auth อยู่ ไม่แสดงอะไร

  return (
    <DashboardLayout user={user}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <span className="text-3xl lg:text-4xl mr-2 lg:mr-3">📋</span>
            ประวัติการจองของฉัน
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            ดูประวัติการจองห้องประชุมที่ผ่านมาทั้งหมด
          </p>
        </div>

        {/* Statistics Cards */}
        <StatisticsCards stats={dynamicStats} />

        {/* Combined Filter Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <span className="text-2xl mr-3">📋</span>
                  ประวัติการจองของฉัน
                </h2>
                <div className="text-sm text-gray-600">
                  ทั้งหมด {dynamicStats.total || 0} รายการ
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">กรองตามสถานะ</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => setFilters({...filters, status: ''})}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  !filters.status || filters.status === 'all'
                    ? 'bg-blue-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">📊</div>
                <div className="text-xs font-medium">ทั้งหมด</div>
                <div className="text-sm font-bold">({dynamicStats.total || 0})</div>
              </button>

              <button
                onClick={() => setFilters({...filters, status: 'pending'})}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  filters.status === 'pending'
                    ? 'bg-yellow-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">⏳</div>
                <div className="text-xs font-medium">รออนุมัติ</div>
                <div className="text-sm font-bold">({dynamicStats.pending || 0})</div>
              </button>

              <button
                onClick={() => setFilters({...filters, status: 'approved'})}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  filters.status === 'approved'
                    ? 'bg-green-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">✅</div>
                <div className="text-xs font-medium">อนุมัติแล้ว</div>
                <div className="text-sm font-bold">({dynamicStats.approved || 0})</div>
              </button>

              <button
                onClick={() => setFilters({...filters, status: 'rejected'})}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  filters.status === 'rejected'
                    ? 'bg-red-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">❌</div>
                <div className="text-xs font-medium">ปฏิเสธ</div>
                <div className="text-sm font-bold">({dynamicStats.rejected || 0})</div>
              </button>

              <button
                onClick={() => setFilters({...filters, status: 'cancelled'})}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  filters.status === 'cancelled'
                    ? 'bg-gray-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-600 border border-gray-200'
                }`}
              >
                <div className="text-lg mb-1">🚫</div>
                <div className="text-xs font-medium">ยกเลิก</div>
                <div className="text-sm font-bold">({dynamicStats.cancelled || 0})</div>
              </button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <HistoryTable reservations={paginatedReservations} onViewReservation={handleViewReservation} />
          
          {/* Pagination */}
          <Pagination />
        </div>
      </div>

      {/* View Modal - ใช้ ReservationDetailModal */}
      <ReservationDetailModal
        isOpen={showViewModal}
        onClose={handleCloseModal}
        reservation={selectedReservation}
      />
    </DashboardLayout>
  )
}
