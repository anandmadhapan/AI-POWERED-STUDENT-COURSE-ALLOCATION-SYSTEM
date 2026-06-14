/**
 * Axios API Client
 * All requests proxied through Vite dev server → FastAPI on :8000
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 → redirect to login (but NOT on the login call itself)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginCall = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:               (data)    => api.post('/auth/login', data),
  me:                  ()        => api.get('/auth/me'),
  register:            (data)    => api.post('/auth/register', data),
  registerStudent:     (data)    => api.post('/auth/register-student', data),
  listUsers:           ()        => api.get('/auth/users'),
  updateUser:          (id, data)=> api.put(`/auth/users/${id}`, data),
  deleteUser:          (id)      => api.delete(`/auth/users/${id}`),
}

// ─── Students ────────────────────────────────────────────────────────────────
export const studentsAPI = {
  list:      (params)   => api.get('/students', { params }),
  get:       (id)       => api.get(`/students/${id}`),
  getByUid:  (uid)      => api.get(`/students/by-uid/${uid}`),
  me:        ()         => api.get('/students/me'),          // student role: own profile
  create:    (data)     => api.post('/students/register', data),
  update:    (id, data) => api.put(`/students/${id}`, data),
  delete:    (id)       => api.delete(`/students/${id}`),
}

// ─── Courses ─────────────────────────────────────────────────────────────────
export const coursesAPI = {
  list: (params) => api.get('/courses', { params }),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
}

// ─── Allocation ───────────────────────────────────────────────────────────────
export const allocationAPI = {
  run: () => api.post('/allocation/process'),
  list: (params) => api.get('/allocation', { params }),
  logs: (params) => api.get('/allocation/logs', { params }),
  reset: () => api.delete('/allocation/reset'),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
  courseStats: () => api.get('/dashboard/course-stats'),
  categoryWise: () => api.get('/dashboard/category-wise'),
  allocatedStudents: (courseId) =>
    api.get('/dashboard/allocated-students', courseId ? { params: { course_id: courseId } } : {}),
  availableSeats: () => api.get('/dashboard/available-seats'),
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiAPI = {
  status:       ()       => api.get('/ai/status'),
  chat:         (data)   => api.post('/ai/chat', data),
  history:      (params) => api.get('/ai/chat/history', { params }),
  clearHistory: (sessionId) =>
    api.delete('/ai/chat/history', sessionId ? { params: { session_id: sessionId } } : {}),
}
