import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPlaceholder } from './pages/DashboardPlaceholder'
import { UploadPage } from './pages/UploadPage'
import { Toaster } from './components/ui'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard/:interviewId" element={<Navigate to="overview" replace />} />
        <Route path="/dashboard/:interviewId/overview" element={<DashboardPlaceholder />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </BrowserRouter>
  )
}