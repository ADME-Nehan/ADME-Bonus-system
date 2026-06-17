import { TrendingUp } from 'lucide-react';
import { formatLKR } from '@/lib/money';

export function MoneyCard({
  title,
  amount,
  className = '',
}: {
  title: string;
  amount: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}
    >
      <div className="absolute right-[-40px] top-[-40px] h-28 w-28 rounded-full bg-blue-500/20 blur-2xl" />
      <div className="absolute bottom-[-50px] left-[-40px] h-28 w-28 rounded-full bg-purple-500/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-50">
            LKR {formatLKR(amount)}
          </h2>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}