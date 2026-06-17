export type UserRole = 'admin' | 'user';

export type MilestoneStatus = 'active' | 'completed';

export type TaskStatus = 'active' | 'completed';

export type PaymentStatus = 'pending' | 'approved' | 'paid';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isManager?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Project {
  id: string;
  name: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Milestone {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  revenue: number;
  status: MilestoneStatus;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
}

export interface Category {
  id: string;
  projectId: string;
  projectName: string;
  milestoneId: string;
  milestoneName: string;
  name: string;
  pts: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Task {
  id: string;

  projectId: string;
  projectName: string;

  milestoneId: string;
  milestoneName: string;

  categoryId: string;
  categoryName: string;

  name: string;
  pts: number;

  assignedUserId: string;
  assignedUserName: string;

  status: TaskStatus;
  locked: boolean;

  estimatedBonusAmount?: number;
  bonusAmount?: number;

  createdAt?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
}

export interface PaymentRecord {
  id: string;

  projectId: string;
  projectName: string;

  milestoneId: string;
  milestoneName: string;

  categoryId: string;
  categoryName: string;

  taskId: string;
  taskName: string;

  userId: string;
  userName: string;

  amount: number;
  taskTotalAmount: number;

  paymentPlan: 'three_months';
  installmentNo: number;
  totalInstallments: number;

  dueDate?: any;
  dueMonth: string;

  status: PaymentStatus;

  createdAt?: any;
  updatedAt?: any;
  paidAt?: any;
}