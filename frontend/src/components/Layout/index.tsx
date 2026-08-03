import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [navigationOpen, setNavigationOpen] = useState(false);
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="fixed left-3 top-3 z-[80] -translate-y-20 rounded-lg bg-brand px-4 py-2 font-semibold text-white focus:translate-y-0">Skip to content</a>
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="min-h-screen lg:pl-64">
        <Header onMenu={() => setNavigationOpen(true)} />
        <main id="main-content" className="mx-auto max-w-[1500px] px-4 py-6 sm:px-page-x lg:px-page-x lg:py-page-y">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
