import { Route, Routes } from 'react-router-dom'
import { AdminRouteGuard, ProtectedRoute, PublicOnlyRoute, TeamRouteGuard } from './components/RouteGuards.jsx'
import AdminTeamPage from './pages/admin/AdminTeamPage.jsx'
import AdminImportPage from './pages/admin/AdminImportPage.jsx'
import AdminVerificationQueuePage from './pages/admin/AdminVerificationQueuePage.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdministratorSetupPage from './pages/AdministratorSetupPage.jsx'
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminUniversitiesPage from './pages/admin/AdminUniversitiesPage.jsx'
import AdminUniversityFormPage from './pages/admin/AdminUniversityFormPage.jsx'
import AdminProgramsPage from './pages/admin/AdminProgramsPage.jsx'
import AdminProgramFormPage from './pages/admin/AdminProgramFormPage.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EligibilityPage from './pages/EligibilityPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProgramDetailPage from './pages/ProgramDetailPage.jsx'
import ProgramsPage from './pages/ProgramsPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import StudentProfilePage from './pages/StudentProfilePage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import UniversityDetailPage from './pages/UniversityDetailPage.jsx'
import UniversitiesPage from './pages/UniversitiesPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import ResendVerificationPage from './pages/ResendVerificationPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import { AdminEntryTestsPage, AdminMeritFormulasPage } from './pages/admin/AdminMeritRecordsPage.jsx'
import AdminEntryTestFormPage from './pages/admin/AdminEntryTestFormPage.jsx'
import AdminMeritFormulaFormPage from './pages/admin/AdminMeritFormulaFormPage.jsx'
import MeritCalculatorPage from './pages/MeritCalculatorPage.jsx'
import AdminEligibilityResearchPage from './pages/admin/AdminEligibilityResearchPage.jsx'
import AdminEligibilityRulesPage from './pages/admin/AdminEligibilityRulesPage.jsx'
import AdminEligibilityRuleFormPage from './pages/admin/AdminEligibilityRuleFormPage.jsx'

function App() {
  return (
    <Routes>
      <Route element={<AdminRouteGuard />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="universities" element={<AdminUniversitiesPage />} />
          <Route path="universities/new" element={<AdminUniversityFormPage />} />
          <Route path="universities/:universityId/edit" element={<AdminUniversityFormPage />} />
          <Route path="programs" element={<AdminProgramsPage />} />
          <Route path="programs/new" element={<AdminProgramFormPage />} />
          <Route path="programs/:programId/edit" element={<AdminProgramFormPage />} />
          <Route path="import/*" element={<AdminImportPage />} />
          <Route path="verification-queue" element={<AdminVerificationQueuePage />} />
          <Route path="eligibility-research" element={<AdminEligibilityResearchPage />} />
          <Route path="eligibility-rules" element={<AdminEligibilityRulesPage />} />
          <Route path="eligibility-rules/new" element={<AdminEligibilityRuleFormPage />} />
          <Route path="eligibility-rules/:ruleId/edit" element={<AdminEligibilityRuleFormPage />} />
          <Route path="entry-tests" element={<AdminEntryTestsPage />} />
          <Route path="entry-tests/new" element={<AdminEntryTestFormPage />} />
          <Route path="entry-tests/:entryTestId/edit" element={<AdminEntryTestFormPage />} />
          <Route path="merit-formulas" element={<AdminMeritFormulasPage />} />
          <Route path="merit-formulas/new" element={<AdminMeritFormulaFormPage />} />
          <Route path="merit-formulas/:meritFormulaId/edit" element={<AdminMeritFormulaFormPage />} />
          <Route element={<TeamRouteGuard />}>
            <Route path="administrators" element={<AdminTeamPage />} />
          </Route>
        </Route>
      </Route>
      <Route element={<MainLayout />}>
        <Route path="setup/admin" element={<AdministratorSetupPage />} />
        <Route index element={<HomePage />} />
        <Route path="universities" element={<UniversitiesPage />} />
        <Route path="universities/:universityIdentifier" element={<UniversityDetailPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="programs/:programId" element={<ProgramDetailPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="resend-verification" element={<ResendVerificationPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="eligibility" element={<EligibilityPage />} />
          <Route path="merit-calculator" element={<MeritCalculatorPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
