import { formatLKR } from '@/lib/money';

export function MoneyCard({
  title,
  amount,
  className = 'bg-white text-slate-800 border-slate-200',
}: {
  title: string;
  amount: number;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl p-6 border shadow-sm ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
        {title}
      </p>
      <h2 className="text-2xl font-black mt-1">LKR {formatLKR(amount)}</h2>
    </div>
  );
}