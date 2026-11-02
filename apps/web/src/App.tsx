import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { UploadPage } from './pages/UploadPage'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { OverviewTab } from './pages/dashboard/OverviewTab'
import { ComingSoonTab } from './pages/dashboard/ComingSoonTab'
import { Toaster } from './components/ui'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard/:interviewId" element={<DashboardLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewTab />} />
          <Route path="evaluation" element={<ComingSoonTab title="Interview evaluation" description="Dimension cards with the score, the reason and the verbatim evidence behind it." issue={21} />} />
          <Route path="discrepancies" element={<ComingSoonTab title="Claim verification" description="Every claim that clashes with the resume, shown next to its evidence for a human decision." issue={28} />} />
          <Route path="roadmap" element={<ComingSoonTab title="Growth plan" description="Skill gaps turned into a three-week plan built from the interview itself." issue={38} />} />
        </Route>
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </BrowserRouter>
  )
}