import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppShell from "./pages/AppShell";
import UserDashboard from "./pages/UserDashboard";
import FederatedLearningDashboard from "./pages/FederatedLearningDashboard";
import RoleRequest from "./pages/RoleRequest";
import FederatedLearning from "./pages/FederatedLearning";
import AdminDashboard from "./pages/AdminDashboard";
import ServicesLanding from "./pages/ServicesLanding";
import PolicyForm from "./pages/PolicyForm";
import InfraPolicyForm from "./pages/InfraPolicyForm";
import MyInfraDashboard from "./pages/MyInfraDashboard";
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
      { path: "role-request", element: <RoleRequest /> },
      { path: "services", element: <ServicesLanding /> },
      { path: "services/anon", element: <UserDashboard /> },
      { path: "services/fl", element: <FederatedLearningDashboard /> },
      { path: "services/fl/federated-learning", element: <FederatedLearning /> },
      { path: "services/smpc", element: <UserDashboard /> },
      { path: "services/dp", element: <UserDashboard /> },
      { path: "services/policies", element: <PolicyForm /> },
      { path: "services/infra-policy", element: <InfraPolicyForm /> },
      { path: "services/infra-policy/my", element: <MyInfraDashboard /> },
      { path: "services/infra-policy/edit/:itemId", element: <InfraPolicyForm /> },
      { path: "services/run", element: <WorkloadForm /> },
      { path: "services/run/:contractId", element: <WorkloadResult /> },
      { path: "admin", element: <AdminDashboard /> },
    ],
  },
]);
