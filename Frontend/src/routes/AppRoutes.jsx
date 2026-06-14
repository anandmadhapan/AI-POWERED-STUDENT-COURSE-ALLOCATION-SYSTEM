import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import AppLayout from '../layouts/AppLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Students from '../pages/Students'
import Courses from '../pages/Courses'
import Allocation from '../pages/Allocation'
import AIAssistant from '../pages/AIAssistant'
import UserManagement from '../pages/UserManagement'
import StudentProfile from '../pages/StudentProfile'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppLayout>{children}</AppLayout>
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <AppLayout>{children}</AppLayout>
}

function StudentRoute({ children }) {
  const { isAuthenticated, isStudent } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isStudent) return <Navigate to="/" replace />
  return <AppLayout>{children}</AppLayout>
}

export default function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

      {/* Both roles */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/students"    element={<AdminRoute><Students /></AdminRoute>} />
      <Route path="/courses"     element={<AdminRoute><Courses /></AdminRoute>} />
      <Route path="/allocation"  element={<AdminRoute><Allocation /></AdminRoute>} />
      <Route path="/users"       element={<AdminRoute><UserManagement /></AdminRoute>} />

      {/* AI Assistant — both admin and student */}
      <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />

      {/* Student only */}
      <Route path="/my-profile"  element={<StudentRoute><StudentProfile /></StudentRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
