'use client';

import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { SectionTitle } from '@/components/AppShell';
import { BonusFlowPanel } from '@/components/BonusFlowPanel';
import { MoneyCard } from '@/components/MoneyCard';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { formatLKR } from '@/lib/money';
import { PaymentRecord, Task } from '../../lib/type';

export function UserApp() {
  const { firebaseUser } = useAuth();

  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const myTaskQuery = query(
      collection(db, 'tasks'),
      where('assignedUserId', '==', firebaseUser.uid)
    );

    const paymentQuery = query(
      collection(db, 'payments'),
      where('userId', '==', firebaseUser.uid)
    );

    const unsubMyTasks = onSnapshot(myTaskQuery, (snapshot) => {
      const rows = snapshot.docs.map(
        (item) =>
          ({
            id: item.id,
            ...item.data(),
          }) as Task
      );

      rows.sort((a, b) => {
        return (
          a.projectName.localeCompare(b.projectName) ||
          a.milestoneName.localeCompare(b.milestoneName) ||
          a.categoryName.localeCompare(b.categoryName) ||
          a.name.localeCompare(b.name)
        );
      });

      setMyTasks(rows);
    });

    const unsubPayments = onSnapshot(paymentQuery, (snapshot) => {
      const rows = snapshot.docs.map(
        (item) =>
          ({
            id: item.id,
            ...item.data(),
          }) as PaymentRecord
      );

      rows.sort((a, b) => {
        const aTime = a.dueDate?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.dueDate?.toMillis?.() || b.createdAt?.toMillis?.() || 0;

        return aTime - bTime;
      });

      setPayments(rows);
    });

    return () => {
      unsubMyTasks();
      unsubPayments();
    };
  }, [firebaseUser?.uid]);

  function getTaskPayments(taskId: string) {
    return payments.filter((payment) => payment.taskId === taskId);
  }

  function getTaskPaymentTotal(taskId: string) {
    return getTaskPayments(taskId).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
  }

  function getTaskBonusAmount(task: Task) {
    const paymentTotal = getTaskPaymentTotal(task.id);

    if (paymentTotal > 0) {
      return paymentTotal;
    }

    if (Number(task.bonusAmount || 0) > 0) {
      return Number(task.bonusAmount || 0);
    }

    if (Number(task.estimatedBonusAmount || 0) > 0) {
      return Number(task.estimatedBonusAmount || 0);
    }

    return 0;
  }

  function getTaskPaymentStatus(task: Task) {
    const taskPayments = getTaskPayments(task.id);

    if (taskPayments.length === 0) {
      if (task.status === 'completed') {
        return 'Waiting admin payment';
      }

      return 'Active';
    }

    const paidCount = taskPayments.filter(
      (payment) => payment.status === 'paid'
    ).length;

    const approvedCount = taskPayments.filter(
      (payment) => payment.status === 'approved'
    ).length;

    const pendingCount = taskPayments.filter(
      (payment) => payment.status === 'pending'
    ).length;

    return `${pendingCount} pending · ${approvedCount} approved · ${paidCount} paid`;
  }

  async function markTaskDone(task: Task) {
    if (task.locked || task.status === 'completed') return;

    const confirmed = window.confirm(
      `Mark "${task.name}" as done? Admin can then include this task in bonus payment.`
    );

    if (!confirmed) return;

    await updateDoc(doc(db, 'tasks', task.id), {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const stats = useMemo(() => {
    const pending = payments
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const approved = payments
      .filter((item) => item.status === 'approved')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const paid = payments
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const activeTaskBonus = myTasks
      .filter((task) => task.status === 'active')
      .reduce((sum, task) => sum + getTaskBonusAmount(task), 0);

    const completedTaskBonus = myTasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + getTaskBonusAmount(task), 0);

    return {
      pending,
      approved,
      paid,
      activeTaskBonus,
      completedTaskBonus,
      total: pending + approved + paid,
    };
  }, [payments, myTasks]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-5">
        <MoneyCard
          title="Active Task Bonus"
          amount={stats.activeTaskBonus}
          className="bg-slate-50 text-slate-700 border-slate-200"
        />

        <MoneyCard
          title="Completed Task Bonus"
          amount={stats.completedTaskBonus}
          className="bg-indigo-50 text-indigo-700 border-indigo-200"
        />

        <MoneyCard
          title="Pending Payment"
          amount={stats.pending}
          className="bg-amber-50 text-amber-700 border-amber-200"
        />

        <MoneyCard
          title="Approved Payment"
          amount={stats.approved}
          className="bg-blue-50 text-blue-700 border-blue-200"
        />

        <MoneyCard
          title="Paid"
          amount={stats.paid}
          className="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <SectionTitle
            icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
            title="My Tasks"
            subtitle="You can only see your own assigned tasks."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Milestone</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">Points</th>
                <th className="px-6 py-4">Task Status</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4 text-right">Bonus</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {myTasks.map((task) => {
                const bonusAmount = getTaskBonusAmount(task);
                const taskPayments = getTaskPayments(task.id);
                const hasPayments = taskPayments.length > 0;
                const canMarkDone = task.status === 'active' && !task.locked;

                return (
                  <tr key={task.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {task.projectName}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {task.milestoneName}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {task.categoryName}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900">
                        {task.name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {task.locked
                          ? 'Locked by completed milestone'
                          : 'Editable until milestone completion'}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-black text-blue-600">
                      {task.pts}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          task.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          hasPayments
                            ? 'bg-amber-100 text-amber-700'
                            : task.status === 'completed'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {getTaskPaymentStatus(task)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-slate-900">
                        LKR {formatLKR(bonusAmount)}
                      </div>

                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        {hasPayments
                          ? 'Payment created'
                          : task.status === 'completed'
                            ? 'Ready for payment'
                            : Number(task.estimatedBonusAmount || 0) > 0
                              ? 'Expected bonus'
                              : 'Not calculated'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        disabled={!canMarkDone}
                        onClick={() => markTaskDone(task)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </button>
                    </td>
                  </tr>
                );
              })}

              {myTasks.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    No assigned tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <SectionTitle
            icon={<ClipboardList className="h-6 w-6 text-blue-600" />}
            title="My 3-Month Bonus Payments"
            subtitle="Month-wise view of your own bonus payments."
          />
        </div>

        <BonusFlowPanel
          payments={payments}
          readonly={true}
          title="My 3-Month Bonus Payments"
          subtitle="Month-wise view of your own bonus payments."
          showFilters={false}
          showExport={false}
          emptyMessage="No bonus payments yet. Mark tasks as done and wait for admin to complete the milestone."
        />
      </section>
    </div>
  );
}