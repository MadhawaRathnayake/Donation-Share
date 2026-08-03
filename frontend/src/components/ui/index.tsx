import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Circle, Clock3, Image as ImageIcon, Inbox, Package, X } from 'lucide-react';
import { classNames } from '../../lib/format';
import type { Donation } from '../../types/domain';
import { formatDateTime } from '../../lib/format';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'info';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'border-brand bg-brand text-white shadow-sm hover:border-brand-dark hover:bg-brand-dark',
    secondary: 'border-stone-300 bg-white text-ink hover:border-brand hover:bg-brand-soft hover:text-brand-dark',
    ghost: 'border-transparent bg-transparent text-ink hover:bg-brand-soft hover:text-brand-dark',
    danger: 'border-danger bg-danger text-white hover:border-danger-dark hover:bg-danger-dark',
    info: 'border-info bg-info text-white shadow-sm hover:border-info-dark hover:bg-info-dark',
  };
  const sizes = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-11 px-4 text-sm', lg: 'min-h-12 px-5 text-base' };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(function IconButton(
  { label, className, children, ...props }, ref,
) {
  return <Button ref={ref} aria-label={label} title={label} className={classNames('size-11 p-0', className)} {...props}>{children}</Button>;
});

const fieldClass = 'min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink placeholder:text-stone-400 transition focus:border-brand focus:outline focus:outline-2 focus:outline-brand/25 disabled:bg-stone-100 disabled:text-stone-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={classNames(fieldClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={classNames(fieldClass, 'min-h-28 resize-y py-3', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={classNames(fieldClass, className)} {...props} />;
});

export function FormField({ label, htmlFor, hint, error, required, children }: { label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-stone-900">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error ? <p id={`${htmlFor}-error`} className="flex items-center gap-1 text-sm font-medium text-danger"><AlertCircle size={14} />{error}</p> : hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

const statusIcon = (status: string) => {
  if (['Approved', 'Delivered', 'Completed'].includes(status)) return <Check size={13} />;
  if (['Rejected', 'Cancelled', 'Expired'].includes(status)) return <X size={13} />;
  if (['Pending', 'Posted', 'Available'].includes(status)) return <Clock3 size={13} />;
  return <Circle size={11} fill="currentColor" />;
};

export function StatusBadge({ status }: { status: string }) {
  const tone = ['Delivered', 'Completed', 'Approved', 'Posted', 'Available'].includes(status)
    ? 'border-brand/30 bg-brand-soft text-brand-dark'
    : ['Pending', 'Claimed'].includes(status)
      ? 'border-accent/40 bg-accent-soft text-accent-dark'
      : ['Assigned', 'PickedUp', 'InTransit'].includes(status)
        ? 'border-info/30 bg-info-soft text-info-dark'
        : ['Rejected', 'Cancelled', 'Expired'].includes(status)
          ? 'border-danger/30 bg-danger-soft text-danger-dark'
          : 'border-stone-300 bg-stone-100 text-stone-700';
  return (
    <span className={classNames(
      'inline-flex max-w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
      tone,
    )}>
      {statusIcon(status)} {status.replace(/([a-z])([A-Z])/g, '$1 $2')}
    </span>
  );
}

export function Modal({ open, title, description, onClose, children, footer }: { open: boolean; title: string; description?: string; onClose: () => void; children?: ReactNode; footer?: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
          <div>
            <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
          </div>
          <IconButton ref={closeRef} label="Close dialog" variant="ghost" size="sm" onClick={onClose}><X size={19} /></IconButton>
        </div>
        {children && <div className="p-5">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 p-4">{footer}</div>}
      </section>
    </div>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', loading, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal open={open} title={title} description={description} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Go back</Button><Button loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-stone-400 bg-white px-6 py-10 text-center">
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-brand-soft text-brand"><Inbox size={21} /></span>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-stone-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div aria-label="Loading" role="status" className="space-y-3">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-brand/10 bg-brand-soft/60" />)}<span className="sr-only">Loading content</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-danger-dark">
      <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0" size={20} /><div><p className="font-bold">Unable to load this content</p><p className="mt-1 text-sm text-danger-dark/80">{message}</p>{retry && <Button className="mt-4" variant="danger" size="sm" onClick={retry}>Try again</Button>}</div></div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4">
      <p className="text-sm text-stone-600">Page {page} of {pages}</p>
      <div className="flex gap-2"><IconButton label="Previous page" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={17} /></IconButton><IconButton label="Next page" variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}><ChevronRight size={17} /></IconButton></div>
    </nav>
  );
}

export function DonationCard({ donation, action }: { donation: Donation; action?: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-panel transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
      <div className="relative aspect-[16/8] overflow-hidden border-b border-stone-200 bg-gradient-to-br from-brand-soft to-accent-soft">
        {donation.imageUrl ? <img src={donation.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-brand/60"><ImageIcon size={36} strokeWidth={1.4} /></div>}
        <div className="absolute right-3 top-3"><StatusBadge status={donation.status} /></div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{donation.donorName}</p><h3 className="mt-1 text-lg font-bold">{donation.foodType}</h3></div><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"><Package size={16} />{donation.quantity} portions</span></div>
        <dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-stone-500">Pickup</dt><dd className="text-right font-medium">{donation.pickupLocation}</dd></div><div className="flex justify-between gap-4"><dt className="text-stone-500">Available from</dt><dd className="text-right font-medium">{formatDateTime(donation.pickupWindowStart)}</dd></div><div className="flex justify-between gap-4"><dt className="text-stone-500">Use before</dt><dd className="text-right font-medium">{formatDateTime(donation.expiryTime)}</dd></div></dl>
        {donation.notes && <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-stone-600">{donation.notes}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </article>
  );
}

export function MetricCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div className="relative overflow-hidden rounded-xl border border-stone-300 bg-white p-5 shadow-panel"><span className="absolute inset-y-0 left-0 w-1 bg-brand" /><div className="flex items-center justify-between text-stone-500"><p className="text-sm font-semibold">{label}</p>{icon && <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">{icon}</span>}</div><p className="mt-3 text-3xl font-black tracking-tight text-ink">{value}</p></div>;
}

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

export function DataTable<T>({ columns, items, rowKey }: { columns: Column<T>[]; items: T[]; rowKey: (item: T) => string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-300 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="border-b border-brand/30 bg-brand-soft"><tr>{columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3 font-bold text-brand-dark">{column.header}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-200">{items.map((item) => <tr key={rowKey(item)} className="hover:bg-stone-50">{columns.map((column) => <td key={column.key} className="px-4 py-4 align-middle">{column.render(item)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
