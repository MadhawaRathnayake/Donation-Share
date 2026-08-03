import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Route, ShieldCheck, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { roleHome } from '../lib/format';
import { Button } from '../components/ui';

const steps = [
  ['01', 'List surplus', 'Donors publish safe food with an exact quantity and collection window.'],
  ['02', 'Match quickly', 'Verified recipients secure food before its safe-use deadline.'],
  ['03', 'Deliver visibly', 'Volunteers track each handoff through to confirmed delivery.'],
];

const features = [
  [CheckCircle2, 'Verified participants', 'Safer exchanges'],
  [Clock3, 'Time-aware listings', 'Less food waste'],
  [Route, 'Trackable delivery', 'Clear accountability'],
  [ShieldCheck, 'Auditable decisions', 'Trusted network'],
];

const Home = () => {
  const { isAuthenticated, isInitialized, login, roles, authError, isMock } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && isAuthenticated) navigate(roleHome(roles), { replace: true });
  }, [isAuthenticated, isInitialized, navigate, roles]);

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8">
      <section className="relative overflow-hidden border-b border-brand/20 bg-gradient-to-br from-white via-white to-brand-soft px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
        <div aria-hidden="true" className="absolute -right-24 -top-32 size-[34rem] rounded-full bg-brand/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 right-1/4 size-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-brand-dark"><Sprout size={15} />Food rescue, coordinated</p>
          <h2 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.055em] text-ink sm:text-7xl">Good food should reach <span className="text-brand">people</span>, not landfills.</h2>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-stone-600">FoodShare connects verified donors, community organizations, and volunteers through one accountable pickup and delivery network.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3"><Button size="lg" onClick={() => login()} loading={!isInitialized}>Get started <ArrowRight size={19} /></Button><a href="#how-it-works" className="rounded-lg px-4 py-3 text-sm font-bold text-brand-dark underline decoration-brand/40 underline-offset-4 hover:decoration-brand">See how it works</a></div>
          {isMock && <p className="mt-5 max-w-fit rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-xs font-semibold text-info-dark">Development demo authentication is enabled.</p>}
          {authError && <p role="alert" className="mt-5 border-l-4 border-danger bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-dark">{authError}</p>}
        </div>
      </section>

      <section id="how-it-works" className="grid bg-ink text-white md:grid-cols-3">
        {steps.map(([number, title, body], index) => <article key={number} className="relative border-b border-stone-700 p-7 last:border-0 md:border-b-0 md:border-r md:last:border-r-0 lg:p-10"><span className={`text-xs font-black tracking-[0.2em] ${index === 1 ? 'text-accent' : 'text-brand-soft'}`}>{number}</span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-3 leading-relaxed text-stone-300">{body}</p><span className={`absolute inset-x-0 bottom-0 h-1 ${index === 1 ? 'bg-accent' : 'bg-brand'}`} /></article>)}
      </section>

      <section className="bg-canvas px-5 py-16 sm:px-10 lg:px-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{features.map(([Icon, label, detail]) => { const FeatureIcon = Icon as typeof CheckCircle2; return <div key={String(label)} className="rounded-xl border border-stone-200 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-brand"><span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand"><FeatureIcon size={21} /></span><p className="mt-4 font-bold">{String(label)}</p><p className="mt-1 text-sm text-stone-500">{String(detail)}</p></div>; })}</div>
      </section>
    </div>
  );
};

export default Home;
