import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPlaceholder } from './pages/DashboardPlaceholder'
import { UploadPage } from './pages/UploadPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />

        {/* Route names follow issue #30 so the tabs can attach to them later. */}
        <Route path="/dashboard/:interviewId" element={<Navigate to="overview" replace />} />
        <Route path="/dashboard/:interviewId/overview" element={<DashboardPlaceholder />} />

        {/* Unknown or malformed URLs always fall back to the upload page. */}
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
