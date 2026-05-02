import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Button({ className = '', variant = 'secondary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'bg-brand text-ink hover:bg-teal-300',
    secondary: 'border border-line bg-panel text-slate-100 hover:bg-slate-800',
    ghost: 'text-slate-300 hover:bg-panel',
    danger: 'border border-red-900/70 bg-red-950/40 text-red-200 hover:bg-red-950'
  };
  return <button className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props} />;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-10 rounded-md border border-line bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-10 rounded-md border border-line bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-brand ${className}`} {...props} />;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-panel ${className}`}>{children}</section>;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-xs font-medium uppercase text-slate-500">{children}</div>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-6 text-center">
      <div className="font-medium text-slate-200">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}
