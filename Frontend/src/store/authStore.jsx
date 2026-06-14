/**
 * Auth Store
 * Stores user (id, username, role, student_uid) + JWT token.
 * Exposes: user, isAuthenticated, isAdmin, isStudent, login, logout
 */
import { createContext, useContext, useState, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (username, password) => {
    const res = await authAPI.login({ username, password })
    localStorage.setItem('token', res.data.access_token)
    const meRes = await authAPI.me()
    localStorage.setItem('user', JSON.stringify(meRes.data))
    setUser(meRes.data)
    return meRes.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin:   user?.role === 'admin',
      isStudent: user?.role === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
