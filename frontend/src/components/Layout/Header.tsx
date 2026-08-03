import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronDown, LogIn, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { formatDateTime } from '../../lib/format';
import { Button, IconButton } from '../ui';

const labels: Record<string, string> = { donor: 'Donor workspace', recipient: 'Available food', volunteer: 'Delivery workspace', admin: 'Administration', profile: 'Your profile', onboarding: 'Complete profile' };

function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: services.notifications.list, refetchInterval: 30_000 });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: services.notifications.markRead, onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: services.notifications.markAllRead, onSuccess: invalidate });
  const unread = query.data?.filter((item) => !item.readStatus).length || 0;

  return (
    <div className="relative">
      <IconButton label={`Notifications${unread ? `, ${unread} unread` : ''}`} variant="ghost" onClick={() => setOpen((value) => !value)}><Bell size={20} />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full border border-white bg-brand px-1 text-[10px] font-bold text-white">{unread}</span>}</IconButton>
      {open && <div className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3"><p className="font-bold">Notifications</p><button className="text-xs font-semibold underline underline-offset-4 disabled:text-stone-400" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</button></div>
        <div className="max-h-96 overflow-y-auto">{query.isPending ? <p className="p-5 text-sm text-stone-500">Loading notifications…</p> : query.data?.length ? query.data.map((item) => <button key={item.id} className={`block w-full border-b border-stone-100 px-4 py-3 text-left hover:bg-brand-soft/50 ${item.readStatus ? '' : 'border-l-4 border-l-brand bg-brand-soft/30'}`} onClick={() => !item.readStatus && markRead.mutate(item.id)}><span className="block text-sm font-semibold">{item.message}</span><span className="mt-1 block text-xs text-stone-500">{formatDateTime(item.sentAt)}</span></button>) : <p className="p-5 text-sm text-stone-500">You are all caught up.</p>}</div>
      </div>}
    </div>
  );
}

const Header = ({ onMenu }: { onMenu: () => void }) => {
  const { isAuthenticated, login, logout, username, roles, accountManagement } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const section = labels[location.pathname.split('/')[1]] || 'Food rescue network';

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-stone-300 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3"><IconButton label="Open navigation" variant="ghost" className="lg:hidden" onClick={onMenu}><Menu size={21} /></IconButton><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">FoodShare</p><h1 className="font-bold leading-tight">{section}</h1></div></div>
      {isAuthenticated ? <div className="flex items-center gap-1 sm:gap-3"><NotificationMenu /><div className="relative"><Button variant="ghost" onClick={() => setAccountOpen((value) => !value)}><UserRound size={18} /><span className="hidden sm:inline">{username || 'Account'}</span><ChevronDown size={15} /></Button>{accountOpen && <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-stone-300 bg-white p-2 shadow-2xl"><p className="border-b border-stone-200 px-3 py-2 text-xs text-stone-500">{roles.join(', ') || 'Profile incomplete'}</p>{!roles.includes('Admin') && <Link to="/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-stone-100"><UserRound size={17} />View profile</Link>}<button onClick={() => accountManagement()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-stone-100"><Settings size={17} />Password & security</button><button onClick={() => logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-stone-100"><LogOut size={17} />Sign out</button></div>}</div></div> : <Button onClick={() => login()}><LogIn size={18} />Sign in</Button>}
    </header>
  );
};

export default Header;
