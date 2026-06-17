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