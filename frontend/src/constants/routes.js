import { GraduationCap, IdCard, Shield } from 'lucide-react'

export const paths = { login: '/login', register: '/register' }

export const roles = {
  student: { label: 'Student', path: '/dashboard/student', icon: GraduationCap },
  personnel: { label: 'Personnel', path: '/dashboard/personnel', icon: IdCard },
  admin: { label: 'Admin', path: '/dashboard/admin', icon: Shield },
}
