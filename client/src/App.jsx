import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
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

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="universities" element={<UniversitiesPage />} />
        <Route path="universities/:universityIdentifier" element={<UniversityDetailPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="programs/:programId" element={<ProgramDetailPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
