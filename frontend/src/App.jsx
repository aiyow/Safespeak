import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccountGate } from './app/AccountGate.jsx'
import { paths, roles } from './constants/routes.js'
import { AuthProvider } from './context/AuthProvider.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AccountGate />}>
            <Route path={paths.login} element={<LoginPage />} />
            <Route path={paths.register} element={<RegisterPage />} />
          </Route>
          {Object.entries(roles).map(([role, info]) => (
            <Route key={role} path={info.path} element={<AccountGate requiredRole={role} />}>
              <Route index element={<DashboardPage />} />
            </Route>
          ))}
          <Route path="*" element={<Navigate to={paths.login} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
