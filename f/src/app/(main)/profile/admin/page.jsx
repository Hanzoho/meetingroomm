'use client'

import ProfileForm from '@/components/profile/ProfileForm'

export default function AdminProfilePage() {
  return <ProfileForm userRole="admin" requiredRole="admin" />
}
