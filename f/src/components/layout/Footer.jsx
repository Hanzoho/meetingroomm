'use client'

import React from 'react'

export default function Footer({ className = "" }) {
  return (
    <footer className={`bg-white backdrop-blur-sm border-t border-gray-200/30 py-6 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-gray-600 text-sm font-medium">
          © 2025 มหาวิทยาลัยราชภัฏมหาสารคาม | พัฒนาโดย นายสิรวิชญ์ เจนวิริยะกุล และ นายบุริศร์ อนุสุเรนทร์
        </p>
      </div>
    </footer>
  )
}