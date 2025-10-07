import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import LevelSelectionPage from "./pages/LevelSelectionPage";
import QuizPage from "./pages/QuizPage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import UsersPage from "./pages/admin/UsersPage";
import LevelsPage from "./pages/admin/LevelsPage";
import LevelEditPage from "./pages/admin/LevelEditPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/levels" element={<ProtectedRoute><LevelSelectionPage /></ProtectedRoute>} />
            <Route path="/quiz/:levelNumber" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:userId/edit" element={<div className="p-8">User Edit (Coming Soon)</div>} />
              <Route path="users/new" element={<div className="p-8">New User (Coming Soon)</div>} />
              <Route path="levels" element={<LevelsPage />} />
              <Route path="levels/:levelId/edit" element={<LevelEditPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
