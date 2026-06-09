import { Routes, Route, Navigate } from 'react-router-dom';
import RouteTracker from './components/RouteTracker';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Feed from './pages/Feed';
import ReportItem from './pages/ReportItem';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300">
        <RouteTracker />
        <Navbar />
        <main className="relative z-10 flex-1">
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/report" 
              element={
                <ProtectedRoute>
                  <ReportItem />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
