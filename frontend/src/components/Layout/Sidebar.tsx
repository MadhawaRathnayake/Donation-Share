import { NavLink } from 'react-router-dom';
import { CircleUserRound, HandHeart, Home, Shield, Truck, Users, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { classNames } from '../../lib/format';
import { IconButton } from '../ui';

const navClass = ({ isActive }: { isActive: boolean }) => classNames(
  'flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-semibold transition',
  isActive ? 'border-brand bg-brand text-white shadow-sm' : 'border-transparent text-stone-300 hover:border-stone-600 hover:bg-stone-800 hover:text-white',
);

const Sidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { roles, isAuthenticated } = useAuth();
  return (
    <>
      {open && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" aria-label="Close navigation" onClick={onClose} />}
      <aside className={classNames('fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-700 bg-ink text-white transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')} aria-label="Primary navigation">
        <div className="flex min-h-28 items-start justify-between border-b border-stone-800 px-5 pb-5 pt-6">
          <NavLink to="/" onClick={onClose} className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-lg font-black text-white shadow-sm">F</span>
            <span className="min-w-0 pt-0.5">
              <strong className="block text-lg leading-none tracking-tight">FoodShare</strong>
              <small className="mt-2 block max-w-36 text-[10px] uppercase leading-5 tracking-[0.14em] text-stone-400">Waste less. Share more.</small>
            </span>
          </NavLink>
          <IconButton label="Close navigation" variant="ghost" className="text-white hover:bg-stone-800 lg:hidden" onClick={onClose}><X size={19} /></IconButton>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <NavLink end to="/" onClick={onClose} className={navClass}><Home size={19} /> Home</NavLink>
          {isAuthenticated && roles.includes('Donor') && <NavLink to="/donor" onClick={onClose} className={navClass}><HandHeart size={19} /> Donor workspace</NavLink>}
          {isAuthenticated && roles.includes('Recipient') && <NavLink to="/recipient" onClick={onClose} className={navClass}><Users size={19} /> Find food</NavLink>}
          {isAuthenticated && roles.includes('Volunteer') && <NavLink to="/volunteer" onClick={onClose} className={navClass}><Truck size={19} /> Deliveries</NavLink>}
          {isAuthenticated && roles.includes('Admin') && <NavLink to="/admin" onClick={onClose} className={navClass}><Shield size={19} /> Administration</NavLink>}
          {isAuthenticated && !roles.includes('Admin') && <NavLink to="/profile" onClick={onClose} className={navClass}><CircleUserRound size={19} /> Profile</NavLink>}
        </nav>
        <div className="border-t border-stone-800 p-5 text-xs leading-relaxed text-stone-500">Food rescue coordination.<br />Built for accountable delivery.</div>
      </aside>
    </>
  );
};

export default Sidebar;
