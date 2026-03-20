import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppShell from "./pages/AppShell";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ServicesLanding from "./pages/ServicesLanding";
import AnonService from "./pages/AnonService";
import PolicyForm from "./pages/PolicyForm";
import WorkloadForm from "./pages/WorkloadForm";
import WorkloadResult from "./pages/WorkloadResult";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <div /> },
      { path: "services", element: <ServicesLanding /> },
      { path: "services/anon", element: <AnonService /> },
      { path: "services/fl", element: <UserDashboard /> },
      { path: "services/smpc", element: <UserDashboard /> },
      { path: "services/dp", element: <UserDashboard /> },
      { path: "services/policies", element: <PolicyForm /> },
      { path: "services/run", element: <WorkloadForm /> },
      { path: "services/run/:contractId", element: <WorkloadResult /> },
      { path: "admin", element: <AdminDashboard /> },
    ],
  },
]);
