import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
// Add page imports here
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Today from '@/pages/Today';
import Students from '@/pages/Students';
import StudentDetail from '@/pages/StudentDetail';
import IEPStudio from '@/pages/IEPStudio';
import IEPReview from '@/pages/IEPReview';
import Documents from '@/pages/Documents';
import DataCenter from '@/pages/DataCenter';
import Schedule from '@/pages/Schedule';
import LessonStudio from '@/pages/LessonStudio';
import SubPlans from '@/pages/SubPlans';
import Gradebook from '@/pages/Gradebook';
import MeetingCenter from '@/pages/MeetingCenter';
import GoalGroups from '@/pages/GoalGroups';
import Reports from '@/pages/Reports';
import ProgressReports from '@/pages/ProgressReports';
import Onboarding from '@/pages/Onboarding';
import PracticeLab from '@/pages/PracticeLab';
import AskCaseCue from '@/pages/AskCaseCue';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import ThankYou from '@/pages/ThankYou';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/ThankYou" element={<ThankYou />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<Layout />}>
                <Route path="/app" element={<Today />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/:id" element={<StudentDetail />} />
                <Route path="/iep-studio" element={<IEPStudio />} />
                <Route path="/iep-review" element={<IEPReview />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/data-center" element={<DataCenter />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/lesson-studio" element={<LessonStudio />} />
                <Route path="/sub-plans" element={<SubPlans />} />
                <Route path="/gradebook" element={<Gradebook />} />
                <Route path="/meetings" element={<MeetingCenter />} />
                <Route path="/goal-groups" element={<GoalGroups />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/progress-reports" element={<ProgressReports />} />
                <Route path="/practice-lab" element={<PracticeLab />} />
                <Route path="/ask-casecue" element={<AskCaseCue />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App