export type UserRole = 'student' | 'mentor' | 'admin'

export const PERMISSION_OPTIONS: { value: string; label: string }[] = [
  { value: 'manage_mentors', label: 'Manage mentors' },
  { value: 'manage_students', label: 'Manage students' },
  { value: 'manage_admins', label: 'Manage admins' },
]
