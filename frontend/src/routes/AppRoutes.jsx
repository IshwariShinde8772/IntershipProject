import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { AppShell } from "../components/layout/AppShell";
import { roles } from "../utils/constants";

const LoginPage = lazy(() =>
  import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage
  }))
);
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage
  }))
);
const DashboardPage = lazy(() =>
  import("../pages/dashboard/Dashboard").then((module) => ({ default: module.DashboardPage }))
);
const StudentsListPage = lazy(() =>
  import("../pages/students/StudentsListPage").then((module) => ({
    default: module.StudentsListPage
  }))
);
const StudentProfilePage = lazy(() =>
  import("../pages/students/StudentProfilePage").then((module) => ({
    default: module.StudentProfilePage
  }))
);
const StudentFormPage = lazy(() =>
  import("../pages/students/StudentFormPage").then((module) => ({
    default: module.StudentFormPage
  }))
);
const CompaniesPage = lazy(() =>
  import("../pages/companies/CompaniesPage").then((module) => ({ default: module.CompaniesPage }))
);
const DrivesListPage = lazy(() =>
  import("../pages/drives/DrivesListPage").then((module) => ({ default: module.DrivesListPage }))
);
const DriveDetailPage = lazy(() =>
  import("../pages/drives/DriveDetailEntryPage").then((module) => ({
    default: module.DriveDetailPage
  }))
);
const DriveFormPage = lazy(() =>
  import("../pages/drives/DriveFormPage").then((module) => ({ default: module.DriveFormPage }))
);
const ReportsPage = lazy(() =>
  import("../pages/reports/ReportsPage").then((module) => ({ default: module.ReportsPage }))
);
const MyProfilePage = lazy(() =>
  import("../pages/profile/MyProfilePage").then((module) => ({ default: module.MyProfilePage }))
);

function RouteLoader() {
  return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading page...</div>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/drives" element={<DrivesListPage />} />
            <Route path="/drives/:id" element={<DriveDetailPage />} />
            <Route path="/profile" element={<MyProfilePage />} />

            <Route element={<RoleRoute allowedRoles={[roles.STUDENT]} />}>
              <Route path="/profile/edit" element={<StudentFormPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[roles.SUPER_ADMIN, roles.COORDINATOR, roles.FACULTY]} />}>
              <Route path="/students" element={<StudentsListPage />} />
              <Route path="/students/:id" element={<StudentProfilePage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={[roles.SUPER_ADMIN, roles.COORDINATOR]} />}>
              <Route path="/students/new" element={<StudentFormPage />} />
              <Route path="/students/:id/edit" element={<StudentFormPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/drives/new" element={<DriveFormPage />} />
              <Route path="/drives/:id/edit" element={<DriveFormPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
