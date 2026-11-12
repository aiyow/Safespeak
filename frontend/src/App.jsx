import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccountGate } from './app/AccountGate.jsx'
import { paths, roles } from './constants/routes.js'
import { AuthProvider } from './context/AuthProvider.jsx'
import { NotificationProvider } from './context/NotificationProvider.jsx'
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx'
import { LoginPage, RegisterPage } from './pages/shared/AuthPages.jsx'
import { PersonnelDashboard } from './pages/personnel/PersonnelDashboard.jsx'
import { StudentDashboard } from './pages/student/StudentDashboard.jsx'
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <Routes>
          <Route element={<AccountGate />}>
            <Route path={paths.login} element={<LoginPage />} />
            <Route path={paths.register} element={<RegisterPage />} />
          </Route>
          <Route element={<AccountGate requiredRole="student" />}>
            <Route path={roles.student.path} element={<StudentDashboard />} />
          </Route>
          <Route element={<AccountGate requiredRole="personnel" />}>
            <Route path={roles.personnel.path} element={<PersonnelDashboard />} />
          </Route>
          <Route element={<AccountGate requiredRole="admin" />}>
            <Route path={roles.admin.path} element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to={paths.login} replace />} />
        </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
