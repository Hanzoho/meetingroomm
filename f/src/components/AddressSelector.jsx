// ===================================================================
// Address Selection Components - Reusable Dropdowns สำหรับที่อยู่ไทย
// ===================================================================
// Components: ProvinceSelect, DistrictSelect, SubdistrictSelect
// Features: Cascading dropdowns, Auto-loading, Error handling, Performance Optimized, Search functionality
// ===================================================================

'use client'

import React, { useState, useEffect, memo, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, MapPin, Search } from 'lucide-react'

// API Base URL
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api`

// ===================================================================
// Address API Hooks
// ===================================================================

// Custom hook สำหรับดึงจังหวัด
export const useProvinces = () => {
  const [provinces, setProvinces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${API_BASE}/address/provinces`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        if (result.success) {
          setProvinces(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch provinces')
        }
      } catch (err) {
        setError(err.message)
        console.error('Error fetching provinces:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProvinces()
  }, [])

  return { provinces, loading, error }
}

// Custom hook สำหรับดึงอำเภอ
export const useDistricts = (provinceId) => {
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!provinceId) {
      setDistricts([])
      return
    }

    const fetchDistricts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${API_BASE}/address/districts/${provinceId}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        if (result.success) {
          setDistricts(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch districts')
        }
      } catch (err) {
        setError(err.message)
        console.error('Error fetching districts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDistricts()
  }, [provinceId])

  return { districts, loading, error }
}

// Custom hook สำหรับดึงตำบล
export const useSubdistricts = (districtId) => {
  const [subdistricts, setSubdistricts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!districtId) {
      setSubdistricts([])
      return
    }

    const fetchSubdistricts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${API_BASE}/address/subdistricts/${districtId}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        if (result.success) {
          setSubdistricts(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch subdistricts')
        }
      } catch (err) {
        setError(err.message)
        console.error('Error fetching subdistricts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubdistricts()
  }, [districtId])

  return { subdistricts, loading, error }
}

// ===================================================================
// Searchable Select Component
// ===================================================================
const SearchableSelect = memo(({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "เลือก...", 
  searchPlaceholder = "ค้นหา...",
  disabled = false,
  loading = false,
  error = null,
  label,
  icon: Icon = null,
  getOptionLabel = (option) => option.name,
  getOptionValue = (option) => option.id
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = React.useRef(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options
    return options.filter(option => 
      getOptionLabel(option).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery, getOptionLabel])

  // Find selected option
  const selectedOption = options.find(option => 
    value && getOptionValue(option).toString() === value.toString()
  )

  const handleSelect = (option) => {
    onChange(option)
    setIsOpen(false)
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className={`flex items-center gap-2 font-medium ${
          disabled ? 'text-gray-400' : 'text-gray-900'
        }`}>
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </Label>
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">กำลังโหลด...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className={`flex items-center gap-2 font-medium ${
        disabled ? 'text-gray-400' : 'text-gray-900'
      }`}>
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </Label>
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 text-left border rounded-lg bg-white transition-all duration-200 flex items-center justify-between text-base
            ${disabled 
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
              : 'border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:shadow-sm'
            }
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}
            ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
          `}
        >
          <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
          </span>
          <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden address-selector-dropdown">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-base text-gray-900 placeholder-gray-500 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white rounded-md"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={getOptionValue(option)}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-4 py-3 text-left text-sm transition-all duration-150
                      border-b border-gray-100 last:border-b-0
                      ${getOptionValue(option).toString() === value?.toString() 
                        ? 'bg-blue-50 text-blue-900 font-medium border-l-4 border-l-blue-500' 
                        : 'text-gray-900 hover:bg-blue-50 hover:text-blue-900'
                      }
                      ${index === 0 ? 'hover:bg-blue-50' : ''}
                    `}
                  >
                    {getOptionLabel(option)}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-gray-500 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>ไม่พบข้อมูลที่ค้นหา</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
})

SearchableSelect.displayName = 'SearchableSelect'

// ===================================================================
// Province Select Component (Memoized for Performance)
// ===================================================================
const ProvinceSelect = memo(({ value, onChange, error, disabled = false }) => {
  const { provinces, loading, error: fetchError } = useProvinces()

  return (
    <SearchableSelect
      options={provinces}
      value={value?.province_id || ''}
      onChange={(province) => onChange({ 
        province_id: province.province_id, 
        province_name: province.province_name 
      })}
      placeholder="เลือกจังหวัด"
      searchPlaceholder="ค้นหาจังหวัด..."
      disabled={disabled}
      loading={loading}
      error={error || fetchError}
      label="จังหวัด"
      icon={MapPin}
      getOptionLabel={(option) => option.province_name}
      getOptionValue={(option) => option.province_id}
    />
  )
})

ProvinceSelect.displayName = 'ProvinceSelect'

// ===================================================================
// District Select Component (Memoized for Performance)
// ===================================================================
const DistrictSelect = memo(({ provinceId, value, onChange, error, disabled = false }) => {
  const { districts, loading, error: fetchError } = useDistricts(provinceId)

  return (
    <SearchableSelect
      options={provinceId ? districts : []}
      value={value?.district_id || ''}
      onChange={(district) => onChange({ 
        district_id: district.district_id, 
        district_name: district.district_name 
      })}
      placeholder={!provinceId ? "เลือกจังหวัดก่อน" : "เลือกอำเภอ/เขต"}
      searchPlaceholder="ค้นหาอำเภอ/เขต..."
      disabled={disabled || !provinceId}
      loading={loading}
      error={error || fetchError}
      label="อำเภอ/เขต"
      icon={MapPin}
      getOptionLabel={(option) => option.district_name}
      getOptionValue={(option) => option.district_id}
    />
  )
})

DistrictSelect.displayName = 'DistrictSelect'

// ===================================================================
// Subdistrict Select Component (Memoized for Performance)
// ===================================================================
const SubdistrictSelect = memo(({ districtId, value, onChange, onZipCodeChange, error, disabled = false }) => {
  const { subdistricts, loading, error: fetchError } = useSubdistricts(districtId)

  return (
    <SearchableSelect
      options={districtId ? subdistricts : []}
      value={value?.subdistrict_id || ''}
      onChange={(subdistrict) => {
        onChange({ 
          subdistrict_id: subdistrict.subdistrict_id, 
          subdistrict_name: subdistrict.subdistrict_name,
          zip_code: subdistrict.zip_code
        })
        // Auto-fill zip code
        if (subdistrict && onZipCodeChange) {
          onZipCodeChange(subdistrict.zip_code?.toString() || '')
        }
      }}
      placeholder={!districtId ? "เลือกอำเภอก่อน" : "เลือกตำบล/แขวง"}
      searchPlaceholder="ค้นหาตำบล/แขวง..."
      disabled={disabled || !districtId}
      loading={loading}
      error={error || fetchError}
      label="ตำบล/แขวง"
      icon={MapPin}
      getOptionLabel={(option) => option.subdistrict_name}
      getOptionValue={(option) => option.subdistrict_id}
    />
  )
})

SubdistrictSelect.displayName = 'SubdistrictSelect'

// ===================================================================
// Main AddressSelector Component (Memoized for Performance)
// ===================================================================
export const AddressSelector = memo(({ 
  value = { province: null, district: null, subdistrict: null }, 
  onChange, 
  onZipCodeChange, 
  errors = {}, 
  disabled = false 
}) => {
  const handleProvinceChange = (province) => {
    onChange({
      province,
      district: null,
      subdistrict: null
    })
    // Clear zip code when province changes
    if (onZipCodeChange) {
      onZipCodeChange('')
    }
  }

  const handleDistrictChange = (district) => {
    onChange({
      ...value,
      district,
      subdistrict: null
    })
    // Clear zip code when district changes
    if (onZipCodeChange) {
      onZipCodeChange('')
    }
  }

  const handleSubdistrictChange = (subdistrict) => {
    onChange({
      ...value,
      subdistrict
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ProvinceSelect
        value={value?.province}
        onChange={handleProvinceChange}
        error={errors?.province}
        disabled={disabled}
      />
      
      <DistrictSelect
        provinceId={value?.province?.province_id}
        value={value?.district}
        onChange={handleDistrictChange}
        error={errors?.district}
        disabled={disabled}
      />
      
      <SubdistrictSelect
        districtId={value?.district?.district_id}
        value={value?.subdistrict}
        onChange={handleSubdistrictChange}
        onZipCodeChange={onZipCodeChange}
        error={errors?.subdistrict}
        disabled={disabled}
      />
    </div>
  )
})

AddressSelector.displayName = 'AddressSelector'

// Export components
export { ProvinceSelect, DistrictSelect, SubdistrictSelect }
export default AddressSelector
