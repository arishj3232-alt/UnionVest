import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import PageTransition from "@/components/PageTransition";
import { AdminShortcut } from "@/components/admin/AdminShortcut";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Recharge from "./pages/Recharge";
import Withdraw from "./pages/Withdraw";
import Orders from "./pages/Orders";
import Team from "./pages/Team";
import PaymentMethods from "./pages/PaymentMethods";
import Security from "./pages/Security";
import HelpSupport from "./pages/HelpSupport";
import WalletHistory from "./pages/WalletHistory";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/admin/AdminPanel";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AdminShortcut />
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/recharge" element={<Recharge />} />
                <Route path="/withdraw" element={<Withdraw />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/team" element={<Team />} />
                <Route path="/payments" element={<PaymentMethods />} />
                <Route path="/security" element={<Security />} />
                <Route path="/help" element={<HelpSupport />} />
                <Route path="/wallet-history" element={<WalletHistory />} />
                <Route path="/admin" element={<AdminPanel />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
