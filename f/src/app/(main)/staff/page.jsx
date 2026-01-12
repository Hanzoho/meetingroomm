'use client';
import React from 'react'
import { redirect } from 'next/navigation'

const StaffPage = () => {
  redirect('/dashboard/officer')
  return null
}

export default StaffPage
