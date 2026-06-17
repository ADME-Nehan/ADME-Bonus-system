'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  ReceiptText,
} from 'lucide-react';

import { PaymentStatusBadge, SectionTitle } from '@/components/AppShell';
import { formatPaymentMonth } from '@/lib/bonus';
import { formatLKR } from '@/lib/money';
import { PaymentRecord, PaymentStatus } from '../lib/type';

interface BonusFlowPanelProps {
  payments: PaymentRecord[];
  onUpdatePaymentStatus?: (
    payment: PaymentRecord,
    status: PaymentStatus
  ) => void;
  readonly?: boolean;
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  showExport?: boolean;
  emptyMessage?: string;
}

interface BonusFlowRow {
  key: string;
  projectId: string;
  projectName: string;
  milestoneId: string;
  milestoneName: string;
  taskId: string;
  taskName: string;
  userId: string;
  userName: string;
  categoryName: string;
  monthAmounts: Record<string, number>;
  rowTotal: number;
  payments: PaymentRecord[];
}

function getValidDateFromPayment(payment: PaymentRecord) {
  const timestamp = payment.dueDate?.toMillis?.();

  if (timestamp) {
    const date = new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  if (payment.dueMonth && /^\d{4}-\d{2}$/.test(payment.dueMonth)) {
    const [year, month] = payment.dueMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function getMonthKeyFromPayment(payment: PaymentRecord) {
  if (payment.dueMonth && /^\d{4}-\d{2}$/.test(payment.dueMonth)) {
    return payment.dueMonth;
  }

  const date = getValidDateFromPayment(payment);

  if (!date) {
    return 'old-payment';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
}

function formatMonthLabel(monthKey: string) {
  if (monthKey === 'old-payment') {
    return 'Old Payment';
  }

  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return 'Old Payment';
  }

  return date.toLocaleDateString('en-LK', {
    month: 'short',
    year: 'numeric',
  });
}

function createCsvValue(value: string | number) {
  const text = String(value ?? '');

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function BonusFlowPanel({
  payments,
  onUpdatePaymentStatus,
  readonly = false,
  title = 'Bonus Flow',
  subtitle = 'Aggregated month-wise installment view across all projects, milestones, tasks, and assignees.',
  showFilters = true,
  showExport = true,
  emptyMessage = 'No bonus flow data found.',
}: BonusFlowPanelProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [projectFilter, setProjectFilter] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filterOptions = useMemo(() => {
    const projects = Array.from(
      new Map(
        payments.map((payment) => [
          payment.projectId,
          {
            id: payment.projectId,
            name: payment.projectName,
          },
        ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const milestones = Array.from(
      new Map(
        payments
          .filter((payment) =>
            projectFilter ? payment.projectId === projectFilter : true
          )
          .map((payment) => [
            payment.milestoneId,
            {
              id: payment.milestoneId,
              name: payment.milestoneName,
            },
          ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const assignees = Array.from(
      new Map(
        payments.map((payment) => [
          payment.userId,
          {
            id: payment.userId,
            name: payment.userName,
          },
        ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return {
      projects,
      milestones,
      assignees,
    };
  }, [payments, projectFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (projectFilter && payment.projectId !== projectFilter) return false;
      if (milestoneFilter && payment.milestoneId !== milestoneFilter) {
        return false;
      }
      if (assigneeFilter && payment.userId !== assigneeFilter) return false;
      if (statusFilter && payment.status !== statusFilter) return false;

      return true;
    });
  }, [payments, projectFilter, milestoneFilter, assigneeFilter, statusFilter]);

  const monthColumns = useMemo(() => {
    return Array.from(
      new Set(filteredPayments.map((payment) => getMonthKeyFromPayment(payment)))
    ).sort((a, b) => {
      if (a === 'old-payment') return 1;
      if (b === 'old-payment') return -1;

      return a.localeCompare(b);
    });
  }, [filteredPayments]);

  const bonusRows = useMemo<BonusFlowRow[]>(() => {
    const rowMap = new Map<string, BonusFlowRow>();

    filteredPayments.forEach((payment) => {
      const key = `${payment.projectId}_${payment.milestoneId}_${payment.taskId}_${payment.userId}`;
      const monthKey = getMonthKeyFromPayment(payment);

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          projectId: payment.projectId,
          projectName: payment.projectName,
          milestoneId: payment.milestoneId,
          milestoneName: payment.milestoneName,
          taskId: payment.taskId,
          taskName: payment.taskName,
          userId: payment.userId,
          userName: payment.userName,
          categoryName: payment.categoryName,
          monthAmounts: {},
          rowTotal: 0,
          payments: [],
        });
      }

      const row = rowMap.get(key);

      if (!row) return;

      row.monthAmounts[monthKey] =
        Number(row.monthAmounts[monthKey] || 0) + Number(payment.amount || 0);

      row.rowTotal += Number(payment.amount || 0);
      row.payments.push(payment);
    });

    return Array.from(rowMap.values()).sort((a, b) => {
      return (
        a.projectName.localeCompare(b.projectName) ||
        a.milestoneName.localeCompare(b.milestoneName) ||
        a.taskName.localeCompare(b.taskName) ||
        a.userName.localeCompare(b.userName)
      );
    });
  }, [filteredPayments]);

  const monthTotals = useMemo(() => {
    return monthColumns.reduce<Record<string, number>>((map, monthKey) => {
      map[monthKey] = bonusRows.reduce(
        (sum, row) => sum + Number(row.monthAmounts[monthKey] || 0),
        0
      );

      return map;
    }, {});
  }, [bonusRows, monthColumns]);

  const overallTotal = bonusRows.reduce(
    (sum, row) => sum + Number(row.rowTotal || 0),
    0
  );

  function resetFilters() {
    setProjectFilter('');
    setMilestoneFilter('');
    setAssigneeFilter('');
    setStatusFilter('');
  }

  function exportCsv() {
    const headers = [
      'Project',
      'Milestone',
      'Task',
      'Category',
      'Assignee',
      ...monthColumns.map(formatMonthLabel),
      'Total',
    ];

    const bodyRows = bonusRows.map((row) => [
      row.projectName,
      row.milestoneName,
      row.taskName,
      row.categoryName,
      row.userName,
      ...monthColumns.map((monthKey) =>
        Number(row.monthAmounts[monthKey] || 0).toFixed(2)
      ),
      row.rowTotal.toFixed(2),
    ]);

    const footerRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      ...monthColumns.map((monthKey) =>
        Number(monthTotals[monthKey] || 0).toFixed(2)
      ),
      overallTotal.toFixed(2),
    ];

    const csv = [headers, ...bodyRows, footerRow]
      .map((row) => row.map(createCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `bonus-flow-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <SectionTitle
            icon={<ReceiptText className="h-6 w-6 text-indigo-600" />}
            title={title}
            subtitle={subtitle}
          />

          {(showFilters || showExport) && (
            <div className="flex flex-wrap gap-2">
              {showFilters && (
                <button
                  onClick={resetFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </button>
              )}

              {showExport && (
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              )}
            </div>
          )}
        </div>

        {showFilters && (
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Filter className="h-3 w-3" />
                Project
              </label>

              <select
                value={projectFilter}
                onChange={(event) => {
                  setProjectFilter(event.target.value);
                  setMilestoneFilter('');
                }}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Projects</option>

                {filterOptions.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Milestone
              </label>

              <select
                value={milestoneFilter}
                onChange={(event) => setMilestoneFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Milestones</option>

                {filterOptions.milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Assignee
              </label>

              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Assignees</option>

                {filterOptions.assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-left text-[10px] uppercase tracking-widest text-slate-400">
              <th className="sticky left-0 z-10 bg-white px-6 py-4">
                Details
              </th>

              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">Milestone</th>
              <th className="px-6 py-4">Task</th>
              <th className="px-6 py-4">Assignee</th>

              {monthColumns.map((monthKey) => (
                <th key={monthKey} className="px-6 py-4 text-right">
                  {formatMonthLabel(monthKey)}
                </th>
              ))}

              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {bonusRows.map((row) => {
              const isExpanded = expandedRows[row.key];

              return (
                <React.Fragment key={row.key}>
                  <tr className="hover:bg-slate-50/70">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4">
                      <button
                        onClick={() =>
                          setExpandedRows((previous) => ({
                            ...previous,
                            [row.key]: !previous[row.key],
                          }))
                        }
                        className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-800">
                      {row.projectName}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {row.milestoneName}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">
                        {row.taskName}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.categoryName}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {row.userName}
                    </td>

                    {monthColumns.map((monthKey) => {
                      const amount = row.monthAmounts[monthKey] || 0;

                      return (
                        <td
                          key={monthKey}
                          className="px-6 py-4 text-right font-black"
                        >
                          {amount > 0 ? (
                            <span className="text-slate-900">
                              {formatLKR(amount)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-6 py-4 text-right font-black text-indigo-700">
                      LKR {formatLKR(row.rowTotal)}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={monthColumns.length + 6} className="p-0">
                        <div className="px-8 py-5">
                          <h4 className="mb-3 text-sm font-black text-slate-700">
                            Payment Installments
                          </h4>

                          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400">
                                  <th className="px-5 py-3">Installment</th>
                                  <th className="px-5 py-3">Due Month</th>
                                  <th className="px-5 py-3 text-right">
                                    Amount
                                  </th>
                                  <th className="px-5 py-3">Status</th>
                                  {!readonly && (
                                    <th className="px-5 py-3 text-right">
                                      Action
                                    </th>
                                  )}
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {row.payments
                                  .slice()
                                  .sort(
                                    (
                                      firstPayment: PaymentRecord,
                                      secondPayment: PaymentRecord
                                    ) =>
                                      Number(firstPayment.installmentNo || 0) -
                                      Number(secondPayment.installmentNo || 0)
                                  )
                                  .map((payment: PaymentRecord) => (
                                    <tr key={payment.id}>
                                      <td className="px-5 py-3 font-bold text-slate-700">
                                        Month {payment.installmentNo || '-'}/
                                        {payment.totalInstallments || '-'}
                                      </td>

                                      <td className="px-5 py-3 text-slate-600">
                                        {formatPaymentMonth(payment)}
                                      </td>

                                      <td className="px-5 py-3 text-right font-black text-slate-900">
                                        LKR {formatLKR(payment.amount)}
                                      </td>

                                      <td className="px-5 py-3">
                                        <PaymentStatusBadge
                                          status={payment.status}
                                        />
                                      </td>

                                      {!readonly && (
                                        <td className="px-5 py-3 text-right">
                                          <div className="flex justify-end gap-2">
                                            <button
                                              disabled={
                                                payment.status !== 'pending'
                                              }
                                              onClick={() =>
                                                onUpdatePaymentStatus?.(
                                                  payment,
                                                  'approved'
                                                )
                                              }
                                              className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-40"
                                            >
                                              Approve
                                            </button>

                                            <button
                                              disabled={
                                                payment.status !== 'approved'
                                              }
                                              onClick={() =>
                                                onUpdatePaymentStatus?.(
                                                  payment,
                                                  'paid'
                                                )
                                              }
                                              className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-40"
                                            >
                                              Mark Paid
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {bonusRows.length === 0 && (
              <tr>
                <td
                  colSpan={monthColumns.length + 6}
                  className="p-10 text-center text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>

          {bonusRows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-100 text-sm">
                <td
                  colSpan={5}
                  className="sticky left-0 z-10 bg-slate-100 px-6 py-4 font-black text-slate-800"
                >
                  Total
                </td>

                {monthColumns.map((monthKey) => (
                  <td
                    key={monthKey}
                    className="px-6 py-4 text-right font-black text-slate-900"
                  >
                    LKR {formatLKR(monthTotals[monthKey] || 0)}
                  </td>
                ))}

                <td className="px-6 py-4 text-right font-black text-indigo-700">
                  LKR {formatLKR(overallTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}