import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './store/authStore'
import { ToastProvider, useToast } from './store/toastStore'
import ToastContainer from './components/ui/ToastContainer'
import AppRoutes from './routes/AppRoutes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppInner() {
  const { toasts } = useToast()
  return (
    <>
      <AppRoutes />
      <ToastContainer toasts={toasts} />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppInner />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
