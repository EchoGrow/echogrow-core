import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { UploadPage } from './pages/UploadPage'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { OverviewTab } from './pages/dashboard/OverviewTab'
import { EvaluationTab } from './pages/dashboard/EvaluationTab'
import { ClaimVerificationTab } from './pages/dashboard/ClaimVerificationTab'
import { GrowthPlanTab } from './pages/dashboard/GrowthPlanTab'
import { ReviewPage } from './pages/dashboard/ReviewPage'
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
          <Route path="evaluation" element={<EvaluationTab />} />
          <Route path="discrepancies" element={<ClaimVerificationTab />} />
          <Route path="roadmap" element={<GrowthPlanTab />} />
        </Route>
        <Route path="/dashboard/:interviewId/review" element={<ReviewPage />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </BrowserRouter>
  )
}