'use client'

import React from 'react'
import Link from 'next/link'

// Simple TopBar for landing page (guest users)
function GuestTopBar() {
  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img 
              src="/images/logo_rmu.png" 
              alt="RMU Logo" 
              className="w-10 h-10 object-contain mr-3"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <span className="text-white text-lg hidden">🏢</span>
            <span className="text-xl font-bold text-green-600">RMU</span> 
            <span className="ml-2 text-lg text-gray-800">ระบบจองห้องประชุม</span>
          </div>
          <div className="flex space-x-4">
            <Link 
              href="/login" 
              className="text-gray-800 hover:text-green-600 px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 hover:bg-green-50 border border-transparent hover:border-green-300"
            >
              เข้าสู่ระบบ
            </Link>
            <Link 
              href="/register" 
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/room5.jpg')`
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        {/* Green gradient overlay for theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 via-transparent to-emerald-900/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header */}
        <GuestTopBar />

        {/* Hero Section */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-8 animate-fade-in">
              <img 
                src="/images/logo_rmu.png" 
                alt="RMU Logo" 
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain mx-auto mb-6"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <span className="text-5xl hidden">🏢</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight animate-slide-up">
              ระบบจองห้องประชุมออนไลน์
            </h1>
            <h2 className="text-2xl lg:text-3xl font-semibold text-green-200 mb-8 animate-slide-up">
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </h2>
                 
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up-delay-2">
              <Link 
                href="/login" 
                className="group w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center justify-center space-x-2">              
                  <span>เข้าสู่ระบบ</span>
                </span>
              </Link>
              <Link 
                href="/register" 
                className="group w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center justify-center space-x-2">            
                  <span>สมัครสมาชิก</span>
                </span>
              </Link>
            </div>
          </div>      
        </main>

        {/* Footer */}
        <footer className="mt-auto bg-white backdrop-blur-sm border-t border-gray-200/30 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-600 text-sm font-medium">
              © 2025 มหาวิทยาลัยราชภัฏมหาสารคาม | พัฒนาโดย นายสิรวิชญ์ เจนวิริยะกุล และนาย บุริศร์ อนุสุเรนทร์
            </p>
          </div>
        </footer>
      </div>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        .animate-slide-up-delay {
          animation: slide-up 0.8s ease-out 0.2s both;
        }
        
        .animate-slide-up-delay-2 {
          animation: slide-up 0.8s ease-out 0.4s both;
        }
      `}</style>
    </div>
  )
}
