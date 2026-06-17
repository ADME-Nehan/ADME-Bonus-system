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
      className={`relative min-h-[130px] overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5 lg:p-6 ${className}`}
    >
      <div className="absolute right-[-40px] top-[-40px] h-28 w-28 rounded-full bg-blue-500/20 blur-2xl" />
      <div className="absolute bottom-[-50px] left-[-40px] h-28 w-28 rounded-full bg-purple-500/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px]">
            {title}
          </p>

          <h2 className="mt-2 break-words text-xl font-black tracking-tight text-slate-50 sm:text-2xl">
            LKR {formatLKR(amount)}
          </h2>
        </div>

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300 sm:h-11 sm:w-11">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}