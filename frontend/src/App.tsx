import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './services/auth';
import { ToastProvider } from './contexts/ToastContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import EditTransaction from './pages/EditTransaction';
import Analysis from './pages/Analysis';
import Admin from './pages/Admin';
import Performance from './pages/Performance';
import About from './pages/About';
import Share from './pages/Share';
import BillingCycles from './pages/BillingCycles';
import Settings from './pages/Settings';
import NetworkBanner from './components/NetworkBanner';
import ApiErrorBanner from './components/ApiErrorBanner';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  // 检查是否已认证
  const authenticated = isAuthenticated();
  
  // 如果未认证，重定向到登录页
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // 如果已认证，渲染子组件
  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <NetworkBanner />
        <ApiErrorBanner />
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <PrivateRoute>
              <Transactions />
            </PrivateRoute>
          }
        />
        <Route
          path="/add"
          element={
            <PrivateRoute>
              <AddTransaction />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <PrivateRoute>
              <EditTransaction />
            </PrivateRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <PrivateRoute>
              <Analysis />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/performance"
          element={
            <PrivateRoute>
              <Performance />
            </PrivateRoute>
          }
        />
        <Route
          path="/about"
          element={
            <PrivateRoute>
              <About />
            </PrivateRoute>
          }
        />
        <Route
          path="/share"
          element={
            <PrivateRoute>
              <Share />
            </PrivateRoute>
          }
        />
        <Route
          path="/billing-cycles"
          element={
            <PrivateRoute>
              <BillingCycles />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
