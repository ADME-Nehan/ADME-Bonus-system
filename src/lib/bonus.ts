import { Category, Milestone, Task } from '../lib/type';

export const PAYMENT_INSTALLMENT_COUNT = 3;

export function getBonusPools(revenue: number) {
  const safeRevenue = Number(revenue || 0);

  const bonusPool = safeRevenue * 0.2;
  const managementPool = bonusPool * 0.25;
  const teamPool = bonusPool * 0.6;
  const annualContribution = bonusPool * 0.075;
  const unitMargin = bonusPool * 0.1;
  const corporatePool = safeRevenue * 0.8;

  return {
    revenue: safeRevenue,
    bonusPool,
    managementPool,
    teamPool,
    annualContribution,
    unitMargin,
    corporatePool,
    projectExpense: corporatePool * 0.6,
    companyDev: corporatePool * 0.2,
    capitalDev: corporatePool * 0.1,
  };
}

export function calculateTaskBonus({
  milestone,
  category,
  task,
  categories,
  tasks,
}: {
  milestone: Milestone;
  category: Category;
  task: Task;
  categories: Category[];
  tasks: Task[];
}) {
  const { teamPool } = getBonusPools(milestone.revenue);

  const milestoneCategories = categories.filter(
    (item) => item.milestoneId === milestone.id
  );

  const totalCategoryPoints = milestoneCategories.reduce(
    (sum, item) => sum + Number(item.pts || 0),
    0
  );

  const categoryShare =
    totalCategoryPoints > 0
      ? Number(category.pts || 0) / totalCategoryPoints
      : 0;

  const categoryBonus = teamPool * categoryShare;

  const categoryTasks = tasks.filter(
    (item) =>
      item.categoryId === category.id &&
      item.milestoneId === milestone.id
  );

  const totalTaskPoints = categoryTasks.reduce(
    (sum, item) => sum + Number(item.pts || 0),
    0
  );

  const taskShare =
    totalTaskPoints > 0 ? Number(task.pts || 0) / totalTaskPoints : 0;

  return categoryBonus * taskShare;
}

export function makePaymentId(
  milestoneId: string,
  categoryId: string,
  taskId: string,
  installmentNo: number
) {
  return `${milestoneId}_${categoryId}_${taskId}_month_${installmentNo}`.replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );
}

export function getInstallmentDueDate(monthIndex: number) {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    today.getDate(),
    9,
    0,
    0
  );
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}`;
}

export function formatPaymentMonth(payment: {
  dueDate?: any;
  dueMonth?: string;
}) {
  const dateValue = payment.dueDate?.toMillis?.();

  if (!dateValue) {
    return payment.dueMonth || '-';
  }

  return new Date(dateValue).toLocaleDateString('en-LK', {
    month: 'short',
    year: 'numeric',
  });
}

export function splitAmountIntoInstallments(
  totalAmount: number,
  count: number
): number[] {
  const safeTotal = Number(totalAmount || 0);
  const safeCount = Number(count || 1);

  const baseAmount = Math.floor((safeTotal / safeCount) * 100) / 100;

  const installments: number[] = Array.from(
    { length: safeCount },
    () => baseAmount
  );

  const usedAmount = baseAmount * safeCount;
  const remainingAmount = Number((safeTotal - usedAmount).toFixed(2));

  installments[safeCount - 1] = Number(
    (installments[safeCount - 1] + remainingAmount).toFixed(2)
  );

  return installments;
}