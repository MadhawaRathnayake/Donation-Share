import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';
import Layout from './components/Layout';
import { RequireAuth, RequireProfile, RequireRole } from './components/auth/RouteGuards';
import Home from './pages/Home';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import { LoadingSkeleton } from './components/ui';

const Onboarding = lazy(() => import('./pages/Onboarding'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DonorDashboard = lazy(() => import('./pages/DonorDashboard'));
const RecipientDashboard = lazy(() => import('./pages/RecipientDashboard'));
const VolunteerDashboard = lazy(() => import('./pages/VolunteerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="mx-auto max-w-4xl p-8"><LoadingSkeleton rows={4} /></div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="unauthorized" element={<Unauthorized />} />
              <Route element={<RequireAuth />}>
                <Route path="onboarding" element={<Onboarding />} />
                <Route element={<RequireProfile />}>
                  <Route path="profile" element={<ProfilePage />} />
                  <Route element={<RequireRole allowed={['Donor']} />}><Route path="donor" element={<DonorDashboard />} /></Route>
                  <Route element={<RequireRole allowed={['Recipient']} />}><Route path="recipient" element={<RecipientDashboard />} /></Route>
                  <Route element={<RequireRole allowed={['Volunteer']} />}><Route path="volunteer" element={<VolunteerDashboard />} /></Route>
                  <Route element={<RequireRole allowed={['Admin']} />}><Route path="admin" element={<AdminDashboard />} /></Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
