'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertCircle,
  BellRing,
  Building2,
  CheckCircle2,
  Crown,
  Folder,
  LayoutDashboard,
  Plus,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react';

import { RoleBadge, SectionTitle } from '@/components/AppShell';
import { BonusFlowPanel } from '@/components/BonusFlowPanel';
import { MoneyCard } from '@/components/MoneyCard';

import {
  PAYMENT_INSTALLMENT_COUNT,
  calculateTaskBonus,
  getBonusPools,
  getInstallmentDueDate,
  getMonthKey,
  makePaymentId,
  splitAmountIntoInstallments,
} from '@/lib/bonus';

import { db } from '@/lib/firebase';
import { formatLKR } from '@/lib/money';

import {
  Category,
  Milestone,
  PaymentRecord,
  PaymentStatus,
  Project,
  Task,
  UserProfile,
} from '../../lib/type';

type AdminTab = 'projects' | 'dashboard' | 'users' | 'payments';
type DashboardMode = 'breakdown' | 'disbursement';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('breakdown');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [projectName, setProjectName] = useState('');
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneRevenue, setMilestoneRevenue] = useState(0);

  const [categoryName, setCategoryName] = useState('');
  const [categoryPoints, setCategoryPoints] = useState(1);

  const [taskName, setTaskName] = useState('');
  const [taskPoints, setTaskPoints] = useState(1);
  const [assignedUserId, setAssignedUserId] = useState('');

  const [monthlySpendBudget, setMonthlySpendBudget] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;

    const savedBudget = localStorage.getItem('adme-monthly-spend-budget');
    return savedBudget ? Number(savedBudget) : 0;
  });

  useEffect(() => {
    localStorage.setItem(
      'adme-monthly-spend-budget',
      String(monthlySpendBudget || 0)
    );
  }, [monthlySpendBudget]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as UserProfile
        )
      );
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as Project
        )
      );
    });

    const unsubMilestones = onSnapshot(
      collection(db, 'milestones'),
      (snapshot) => {
        setMilestones(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as Milestone
          )
        );
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setCategories(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as Category
          )
        );
      }
    );

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as Task
        )
      );
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const rows = snapshot.docs.map(
        (item) => ({ id: item.id, ...item.data() }) as PaymentRecord
      );

      rows.sort((a, b) => {
        const aTime = a.dueDate?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.dueDate?.toMillis?.() || b.createdAt?.toMillis?.() || 0;

        return aTime - bTime;
      });

      setPayments(rows);
    });

    return () => {
      unsubUsers();
      unsubProjects();
      unsubMilestones();
      unsubCategories();
      unsubTasks();
      unsubPayments();
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find((item) => item.id === selectedProjectId);

  const projectMilestones = useMemo(() => {
    return milestones.filter((item) => item.projectId === selectedProjectId);
  }, [milestones, selectedProjectId]);

  useEffect(() => {
    if (projectMilestones.length === 0) {
      setSelectedMilestoneId('');
      return;
    }

    if (!selectedMilestoneId) {
      setSelectedMilestoneId(projectMilestones[0].id);
      return;
    }

    const exists = projectMilestones.some(
      (item) => item.id === selectedMilestoneId
    );

    if (!exists) {
      setSelectedMilestoneId(projectMilestones[0].id);
    }
  }, [projectMilestones, selectedMilestoneId]);

  const selectedMilestone = milestones.find(
    (item) => item.id === selectedMilestoneId
  );

  const selectedMilestoneIsCompleted =
    selectedMilestone?.status === 'completed';

  const milestoneCategories = useMemo(() => {
    return categories.filter((item) => item.milestoneId === selectedMilestoneId);
  }, [categories, selectedMilestoneId]);

  const milestoneTasks = useMemo(() => {
    return tasks.filter((item) => item.milestoneId === selectedMilestoneId);
  }, [tasks, selectedMilestoneId]);

  const milestonePayments = useMemo(() => {
    return payments.filter((item) => item.milestoneId === selectedMilestoneId);
  }, [payments, selectedMilestoneId]);

  const normalUsers = useMemo(() => {
    return users.filter((item) => item.role === 'user');
  }, [users]);

  const managerUsers = useMemo(() => {
    return users.filter((item) => item.isManager || item.role === 'admin');
  }, [users]);

  const milestoneTaskProgress = useMemo(() => {
    const totalTasks = milestoneTasks.length;

    const completedTasks = milestoneTasks.filter(
      (item) => item.status === 'completed'
    ).length;

    const activeTasks = milestoneTasks.filter(
      (item) => item.status !== 'completed'
    ).length;

    const invalidTasks = milestoneTasks.filter(
      (item) => !item.assignedUserId || Number(item.pts || 0) <= 0
    ).length;

    const allTasksDone =
      totalTasks > 0 && completedTasks === totalTasks && invalidTasks === 0;

    const someTasksDone =
      totalTasks > 0 && completedTasks > 0 && completedTasks < totalTasks;

    return {
      totalTasks,
      completedTasks,
      activeTasks,
      invalidTasks,
      allTasksDone,
      someTasksDone,
      canComplete:
        !!selectedMilestone &&
        !selectedMilestoneIsCompleted &&
        totalTasks > 0 &&
        allTasksDone,
    };
  }, [milestoneTasks, selectedMilestone, selectedMilestoneIsCompleted]);

  useEffect(() => {
    if (milestoneCategories.length === 0) {
      setSelectedCategoryId('');
      return;
    }

    if (!selectedCategoryId) {
      setSelectedCategoryId(milestoneCategories[0].id);
      return;
    }

    const exists = milestoneCategories.some(
      (item) => item.id === selectedCategoryId
    );

    if (!exists) {
      setSelectedCategoryId(milestoneCategories[0].id);
    }
  }, [milestoneCategories, selectedCategoryId]);

  useEffect(() => {
    if (!assignedUserId && normalUsers.length > 0) {
      setAssignedUserId(normalUsers[0].id);
    }
  }, [assignedUserId, normalUsers]);

  const selectedPools = getBonusPools(selectedMilestone?.revenue || 0);

  async function addProject(event: React.FormEvent) {
    event.preventDefault();

    const cleanName = projectName.trim();

    if (!cleanName) return;

    await addDoc(collection(db, 'projects'), {
      name: cleanName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setProjectName('');
  }

  async function addMilestone(event: React.FormEvent) {
    event.preventDefault();

    const cleanName = milestoneName.trim();

    if (!selectedProject || !cleanName) return;

    await addDoc(collection(db, 'milestones'), {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      name: cleanName,
      revenue: Number(milestoneRevenue || 0),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setMilestoneName('');
    setMilestoneRevenue(0);
  }

  async function addCategory(event?: React.FormEvent) {
    event?.preventDefault();

    const cleanName = categoryName.trim() || 'New Category';

    if (!selectedProject || !selectedMilestone) return;
    if (selectedMilestoneIsCompleted) return;

    await addDoc(collection(db, 'categories'), {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      milestoneId: selectedMilestone.id,
      milestoneName: selectedMilestone.name,
      name: cleanName,
      pts: Number(categoryPoints || 1),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setCategoryName('');
    setCategoryPoints(1);
  }

  async function addTask(categoryId?: string) {
    if (!selectedProject || !selectedMilestone) return;
    if (selectedMilestoneIsCompleted) return;

    const finalCategoryId = categoryId || selectedCategoryId;

    const category = categories.find((item) => item.id === finalCategoryId);
    const assignedUser = users.find((item) => item.id === assignedUserId);

    if (!category || !assignedUser) {
      alert('Please select category and assigned user.');
      return;
    }

    await addDoc(collection(db, 'tasks'), {
      projectId: selectedProject.id,
      projectName: selectedProject.name,

      milestoneId: selectedMilestone.id,
      milestoneName: selectedMilestone.name,

      categoryId: category.id,
      categoryName: category.name,

      name: taskName.trim() || 'New Task',
      pts: Number(taskPoints || 1),

      assignedUserId: assignedUser.id,
      assignedUserName: assignedUser.name || assignedUser.email,

      status: 'active',
      locked: false,

      estimatedBonusAmount: 0,
      bonusAmount: 0,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setTaskName('');
    setTaskPoints(1);
  }

  async function updateMilestoneRevenue(value: number) {
    if (!selectedMilestone || selectedMilestoneIsCompleted) return;

    await updateDoc(doc(db, 'milestones', selectedMilestone.id), {
      revenue: Number(value || 0),
      updatedAt: serverTimestamp(),
    });
  }

  async function removeProject(project: Project) {
    const confirmed = window.confirm(
      `Delete project "${project.name}"? Delete milestones/categories/tasks first if needed.`
    );

    if (!confirmed) return;

    await deleteDoc(doc(db, 'projects', project.id));
  }

  async function removeMilestone(milestone: Milestone) {
    if (milestone.status === 'completed') {
      alert('Completed milestone cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(`Delete milestone "${milestone.name}"?`);

    if (!confirmed) return;

    await deleteDoc(doc(db, 'milestones', milestone.id));
  }

  async function removeCategory(category: Category) {
    if (!selectedMilestone || selectedMilestoneIsCompleted) return;

    const confirmed = window.confirm('Delete this category and its tasks?');

    if (!confirmed) return;

    const batch = writeBatch(db);
    const categoryTasks = tasks.filter((item) => item.categoryId === category.id);

    categoryTasks.forEach((task) => {
      if (!task.locked) {
        batch.delete(doc(db, 'tasks', task.id));
      }
    });

    batch.delete(doc(db, 'categories', category.id));

    await batch.commit();
  }

  async function removeTask(task: Task) {
    if (!selectedMilestone || selectedMilestoneIsCompleted || task.locked) return;

    const confirmed = window.confirm('Delete this task?');

    if (!confirmed) return;

    await deleteDoc(doc(db, 'tasks', task.id));
  }

  async function updatePaymentStatus(
    payment: PaymentRecord,
    status: PaymentStatus
  ) {
    await updateDoc(doc(db, 'payments', payment.id), {
      status,
      paidAt: status === 'paid' ? serverTimestamp() : payment.paidAt || null,
      updatedAt: serverTimestamp(),
    });
  }

  async function completeMilestone() {
    if (!selectedMilestone) return;

    if (selectedMilestone.status === 'completed') {
      alert('This milestone is already completed.');
      return;
    }

    if (milestoneTasks.length === 0) {
      alert('Add tasks first before completing this milestone.');
      return;
    }

    if (milestoneTaskProgress.invalidTasks > 0) {
      alert(
        'Some tasks have no assigned user or no points. Please fix them before completing the milestone.'
      );
      return;
    }

    if (!milestoneTaskProgress.allTasksDone) {
      alert(
        `Cannot complete milestone yet. ${milestoneTaskProgress.completedTasks}/${milestoneTaskProgress.totalTasks} tasks are done. All users must click Done first.`
      );
      return;
    }

    const confirmed = window.confirm(
      `All ${milestoneTaskProgress.totalTasks} tasks are done. Complete milestone and create 3-month payments?`
    );

    if (!confirmed) return;

    const batch = writeBatch(db);

    batch.update(doc(db, 'milestones', selectedMilestone.id), {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    milestoneTasks.forEach((task) => {
      const category = categories.find((item) => item.id === task.categoryId);

      if (!category) return;

      const taskTotalAmount = calculateTaskBonus({
        milestone: selectedMilestone,
        category,
        task,
        categories,
        tasks,
      });

      batch.update(doc(db, 'tasks', task.id), {
        status: 'completed',
        locked: true,
        bonusAmount: taskTotalAmount,
        estimatedBonusAmount: taskTotalAmount,
        completedAt: task.completedAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const installmentAmounts = splitAmountIntoInstallments(
        taskTotalAmount,
        PAYMENT_INSTALLMENT_COUNT
      );

      installmentAmounts.forEach((installmentAmount, index) => {
        const installmentNo = index + 1;
        const dueDate = getInstallmentDueDate(index);

        const paymentId = makePaymentId(
          selectedMilestone.id,
          task.categoryId,
          task.id,
          installmentNo
        );

        batch.set(doc(db, 'payments', paymentId), {
          projectId: task.projectId,
          projectName: task.projectName,

          milestoneId: task.milestoneId,
          milestoneName: task.milestoneName,

          categoryId: task.categoryId,
          categoryName: task.categoryName,

          taskId: task.id,
          taskName: task.name,

          userId: task.assignedUserId,
          userName: task.assignedUserName,

          amount: installmentAmount,
          taskTotalAmount,

          paymentPlan: 'three_months',
          installmentNo,
          totalInstallments: PAYMENT_INSTALLMENT_COUNT,
          dueDate,
          dueMonth: getMonthKey(dueDate),

          status: 'pending',

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          paidAt: null,
        });
      });
    });

    await batch.commit();
    setActiveTab('payments');
  }

  function getPaymentTime(payment: PaymentRecord) {
    return (
      payment.dueDate?.toMillis?.() ||
      payment.updatedAt?.toMillis?.() ||
      payment.createdAt?.toMillis?.() ||
      0
    );
  }

  function isCurrentMonth(payment: PaymentRecord) {
    const paymentTime = getPaymentTime(payment);

    if (!paymentTime) return false;

    const paymentDate = new Date(paymentTime);
    const today = new Date();

    return (
      paymentDate.getFullYear() === today.getFullYear() &&
      paymentDate.getMonth() === today.getMonth()
    );
  }

  const paymentStats = (() => {
    const pending = payments
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const approved = payments
      .filter((item) => item.status === 'approved')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const paid = payments
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const thisMonth = payments.filter(isCurrentMonth);

    const thisMonthPending = thisMonth
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const thisMonthApproved = thisMonth
      .filter((item) => item.status === 'approved')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const thisMonthPaid = thisMonth
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      pending,
      approved,
      paid,
      thisMonthPending,
      thisMonthApproved,
      thisMonthPaid,
      thisMonthNeedToSpend: thisMonthPending + thisMonthApproved,
    };
  })();

  const monthlyRemaining =
    Number(monthlySpendBudget || 0) - paymentStats.thisMonthNeedToSpend;

  const userEarnings = normalUsers
    .map((appUser) => {
      const userPayments = payments.filter((item) => item.userId === appUser.id);

      const pending = userPayments
        .filter((item) => item.status === 'pending')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const approved = userPayments
        .filter((item) => item.status === 'approved')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const paid = userPayments
        .filter((item) => item.status === 'paid')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const thisMonthToSpend = userPayments
        .filter(isCurrentMonth)
        .filter(
          (item) => item.status === 'pending' || item.status === 'approved'
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        userId: appUser.id,
        name: appUser.name,
        email: appUser.email,
        pending,
        approved,
        paid,
        total: pending + approved + paid,
        thisMonthToSpend,
      };
    })
    .filter((item) => item.total > 0 || item.thisMonthToSpend > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-700/40 bg-slate-900/50 p-2 backdrop-blur-xl">
        {[
          ['projects', 'Projects'],
          ['dashboard', 'Dashboard'],
          ['users', 'Users'],
          ['payments', 'Payments'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as AdminTab)}
            className={`rounded-2xl px-5 py-2 text-sm font-black ${
              activeTab === key
                ? 'bg-blue-500/20 text-blue-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <ProjectsPanel
          projects={projects}
          projectMilestones={projectMilestones}
          selectedProjectId={selectedProjectId}
          selectedMilestoneId={selectedMilestoneId}
          projectName={projectName}
          milestoneName={milestoneName}
          milestoneRevenue={milestoneRevenue}
          onProjectNameChange={setProjectName}
          onMilestoneNameChange={setMilestoneName}
          onMilestoneRevenueChange={setMilestoneRevenue}
          onAddProject={addProject}
          onAddMilestone={addMilestone}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setSelectedMilestoneId('');
            setSelectedCategoryId('');
          }}
          onSelectMilestone={(id) => {
            setSelectedMilestoneId(id);
            setSelectedCategoryId('');
            setActiveTab('dashboard');
          }}
          onDeleteProject={removeProject}
          onDeleteMilestone={removeMilestone}
        />
      )}

      {activeTab === 'dashboard' && (
        <DashboardPanel
          selectedMilestone={selectedMilestone}
          selectedMilestoneIsCompleted={selectedMilestoneIsCompleted}
          dashboardMode={dashboardMode}
          setDashboardMode={setDashboardMode}
          selectedPools={selectedPools}
          managerUsers={managerUsers}
          milestoneCategories={milestoneCategories}
          milestoneTasks={milestoneTasks}
          milestonePayments={milestonePayments}
          categories={categories}
          tasks={tasks}
          normalUsers={normalUsers}
          categoryName={categoryName}
          categoryPoints={categoryPoints}
          taskName={taskName}
          taskPoints={taskPoints}
          assignedUserId={assignedUserId}
          selectedCategoryId={selectedCategoryId}
          milestoneTaskProgress={milestoneTaskProgress}
          onCategoryNameChange={setCategoryName}
          onCategoryPointsChange={setCategoryPoints}
          onTaskNameChange={setTaskName}
          onTaskPointsChange={setTaskPoints}
          onAssignedUserChange={setAssignedUserId}
          onSelectedCategoryChange={setSelectedCategoryId}
          onAddCategory={addCategory}
          onAddTask={addTask}
          onRemoveCategory={removeCategory}
          onRemoveTask={removeTask}
          onRevenueChange={updateMilestoneRevenue}
          onCompleteMilestone={completeMilestone}
          onUpdatePaymentStatus={updatePaymentStatus}
        />
      )}

      {activeTab === 'users' && <UsersPanel users={users} />}

      {activeTab === 'payments' && (
        <PaymentsPanel
          payments={payments}
          userEarnings={userEarnings}
          paymentStats={paymentStats}
          monthlySpendBudget={monthlySpendBudget}
          monthlyRemaining={monthlyRemaining}
          setMonthlySpendBudget={setMonthlySpendBudget}
          updatePaymentStatus={updatePaymentStatus}
        />
      )}
    </div>
  );
}

function ProjectsPanel({
  projects,
  projectMilestones,
  selectedProjectId,
  selectedMilestoneId,
  projectName,
  milestoneName,
  milestoneRevenue,
  onProjectNameChange,
  onMilestoneNameChange,
  onMilestoneRevenueChange,
  onAddProject,
  onAddMilestone,
  onSelectProject,
  onSelectMilestone,
  onDeleteProject,
  onDeleteMilestone,
}: {
  projects: Project[];
  projectMilestones: Milestone[];
  selectedProjectId: string;
  selectedMilestoneId: string;
  projectName: string;
  milestoneName: string;
  milestoneRevenue: number;
  onProjectNameChange: (value: string) => void;
  onMilestoneNameChange: (value: string) => void;
  onMilestoneRevenueChange: (value: number) => void;
  onAddProject: (event: React.FormEvent) => void;
  onAddMilestone: (event: React.FormEvent) => void;
  onSelectProject: (id: string) => void;
  onSelectMilestone: (id: string) => void;
  onDeleteProject: (project: Project) => void;
  onDeleteMilestone: (milestone: Milestone) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4 border-b border-slate-700/50 bg-slate-950/30 p-6 md:flex-row md:items-center md:justify-between">
        <SectionTitle
          icon={<Folder className="h-5 w-5" />}
          title="Projects and Milestones"
        />

        <form onSubmit={onAddProject} className="flex gap-2">
          <input
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="New Project Name"
            className="h-12 w-72 rounded-2xl border border-slate-700 px-4 text-sm outline-none"
          />

          <button className="flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </div>

      <div className="p-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`mb-5 overflow-hidden rounded-3xl border ${
              selectedProjectId === project.id
                ? 'border-blue-400/40 bg-blue-500/10'
                : 'border-slate-700/50 bg-slate-950/30'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/40 p-5">
              <button
                onClick={() => onSelectProject(project.id)}
                className="flex items-center gap-3 text-left text-lg font-black text-slate-50"
              >
                <span className="text-slate-400">⌄</span>
                {project.name}
              </button>

              <button
                onClick={() => onDeleteProject(project)}
                className="rounded-xl p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {selectedProjectId === project.id && (
              <div className="p-5">
                <form
                  onSubmit={onAddMilestone}
                  className="mb-6 grid gap-3 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4 lg:grid-cols-[1fr_180px_auto]"
                >
                  <input
                    value={milestoneName}
                    onChange={(event) =>
                      onMilestoneNameChange(event.target.value)
                    }
                    placeholder="Milestone Name"
                    className="h-12 rounded-2xl border border-slate-700 px-4 text-sm outline-none"
                  />

                  <input
                    type="number"
                    value={milestoneRevenue || ''}
                    onChange={(event) =>
                      onMilestoneRevenueChange(Number(event.target.value) || 0)
                    }
                    placeholder="Revenue"
                    className="h-12 rounded-2xl border border-slate-700 px-4 text-sm outline-none"
                  />

                  <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white">
                    <Plus className="h-4 w-4" />
                    Add Milestone
                  </button>
                </form>

                <div className="grid gap-4 lg:grid-cols-2">
                  {projectMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`rounded-2xl border p-5 shadow-xl shadow-black/10 ${
                        selectedMilestoneId === milestone.id
                          ? 'border-blue-400/40 bg-blue-500/10'
                          : 'border-slate-700/50 bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-blue-300" />
                            <h3 className="text-lg font-black text-slate-50">
                              {milestone.name}
                            </h3>

                            {milestone.status === 'completed' && (
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase text-emerald-200">
                                Completed
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-lg font-black text-blue-300">
                            LKR {formatLKR(milestone.revenue, 0)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectMilestone(milestone.id)}
                            className="rounded-xl bg-blue-500/15 px-4 py-2 text-xs font-black text-blue-200 hover:bg-blue-500/25"
                          >
                            Dashboard →
                          </button>

                          {milestone.status !== 'completed' && (
                            <button
                              onClick={() => onDeleteMilestone(milestone)}
                              className="rounded-xl p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {projectMilestones.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
                      No milestones yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {projects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
            No projects yet. Add your first project.
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardPanel({
  selectedMilestone,
  selectedMilestoneIsCompleted,
  dashboardMode,
  setDashboardMode,
  selectedPools,
  managerUsers,
  milestoneCategories,
  milestoneTasks,
  milestonePayments,
  categories,
  tasks,
  normalUsers,
  categoryName,
  categoryPoints,
  taskName,
  taskPoints,
  assignedUserId,
  selectedCategoryId,
  milestoneTaskProgress,
  onCategoryNameChange,
  onCategoryPointsChange,
  onTaskNameChange,
  onTaskPointsChange,
  onAssignedUserChange,
  onSelectedCategoryChange,
  onAddCategory,
  onAddTask,
  onRemoveCategory,
  onRemoveTask,
  onRevenueChange,
  onCompleteMilestone,
  onUpdatePaymentStatus,
}: {
  selectedMilestone?: Milestone;
  selectedMilestoneIsCompleted: boolean;
  dashboardMode: DashboardMode;
  setDashboardMode: (value: DashboardMode) => void;
  selectedPools: ReturnType<typeof getBonusPools>;
  managerUsers: UserProfile[];
  milestoneCategories: Category[];
  milestoneTasks: Task[];
  milestonePayments: PaymentRecord[];
  categories: Category[];
  tasks: Task[];
  normalUsers: UserProfile[];
  categoryName: string;
  categoryPoints: number;
  taskName: string;
  taskPoints: number;
  assignedUserId: string;
  selectedCategoryId: string;
  milestoneTaskProgress: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    invalidTasks: number;
    allTasksDone: boolean;
    someTasksDone: boolean;
    canComplete: boolean;
  };
  onCategoryNameChange: (value: string) => void;
  onCategoryPointsChange: (value: number) => void;
  onTaskNameChange: (value: string) => void;
  onTaskPointsChange: (value: number) => void;
  onAssignedUserChange: (value: string) => void;
  onSelectedCategoryChange: (value: string) => void;
  onAddCategory: (event?: React.FormEvent) => void;
  onAddTask: (categoryId?: string) => void;
  onRemoveCategory: (category: Category) => void;
  onRemoveTask: (task: Task) => void;
  onRevenueChange: (value: number) => void;
  onCompleteMilestone: () => void;
  onUpdatePaymentStatus: (payment: PaymentRecord, status: PaymentStatus) => void;
}) {
  if (!selectedMilestone) {
    return (
      <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-10 text-center">
        <LayoutDashboard className="mx-auto h-10 w-10 text-slate-500" />
        <h2 className="mt-4 text-xl font-black text-slate-100">
          Select a milestone
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Go to Projects and open a milestone dashboard.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-50">
            Dashboard: {selectedMilestone.name}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Flat 20% Management Split & Dynamic Team Pool
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Revenue LKR
          </label>
          <input
            type="number"
            disabled={selectedMilestoneIsCompleted}
            value={selectedMilestone.revenue || ''}
            onChange={(event) => onRevenueChange(Number(event.target.value) || 0)}
            className="mt-1 w-64 bg-transparent text-2xl font-black text-blue-300 outline-none disabled:text-slate-500"
          />
        </div>
      </div>

      <MilestoneTaskNotification
        selectedMilestoneIsCompleted={selectedMilestoneIsCompleted}
        progress={milestoneTaskProgress}
        onCompleteMilestone={onCompleteMilestone}
      />

      <div className="inline-flex rounded-2xl border border-slate-700/50 bg-slate-900/60 p-1">
        <button
          onClick={() => setDashboardMode('breakdown')}
          className={`rounded-xl px-6 py-2 text-xs font-black ${
            dashboardMode === 'breakdown'
              ? 'bg-blue-500/20 text-blue-200'
              : 'text-slate-400'
          }`}
        >
          Milestone Breakdown
        </button>

        <button
          onClick={() => setDashboardMode('disbursement')}
          className={`rounded-xl px-6 py-2 text-xs font-black ${
            dashboardMode === 'disbursement'
              ? 'bg-blue-500/20 text-blue-200'
              : 'text-slate-400'
          }`}
        >
          Disbursement
        </button>
      </div>

      {dashboardMode === 'breakdown' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-50">
              Financial Breakdown
            </h2>

            {selectedMilestone.status === 'completed' && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-black text-emerald-200">
                Completed
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-700/50 bg-slate-950 p-6 shadow-2xl shadow-black/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Total Bonus Pool (20%)
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-50">
                    LKR {formatLKR(selectedPools.bonusPool)}
                  </h2>
                </div>

                <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                  <WalletCards className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4 flex justify-between border-t border-slate-700 pt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>
                  Mgmt: LKR {formatLKR(selectedPools.managementPool, 0)}
                </span>
                <span>Team: LKR {formatLKR(selectedPools.teamPool, 0)}</span>
              </div>
            </div>

            <MoneyCard
              title="Annual Contributions"
              amount={selectedPools.annualContribution}
              className="border-amber-400/20 bg-amber-500/10"
            />

            <MoneyCard
              title="Unit Margin"
              amount={selectedPools.unitMargin}
              className="border-emerald-400/20 bg-emerald-500/10"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-700/50 p-6">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-50">
                  <Crown className="h-5 w-5 text-amber-300" />
                  Management Distribution
                </h3>

                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase text-amber-200">
                  Flat Split
                </span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="px-6 py-4">Stakeholder</th>
                    <th className="px-6 py-4 text-right">Amount (LKR)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {(managerUsers.length > 0
                    ? managerUsers
                    : [{ id: 'none', name: 'No Name', email: '-' } as UserProfile]
                  ).map((manager) => (
                    <tr key={manager.id}>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-100">
                          {manager.name || 'No Name'}
                        </div>
                        <div className="text-[10px] uppercase text-slate-500">
                          {manager.email}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right text-lg font-black text-slate-50">
                        {formatLKR(
                          managerUsers.length > 0
                            ? selectedPools.managementPool / managerUsers.length
                            : selectedPools.managementPool
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-50">
                  <Building2 className="h-5 w-5 text-blue-300" />
                  Corporate Allocation
                </h3>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-400">
                  80% of Revenue
                </span>
              </div>

              <div className="space-y-4">
                <AllocationRow
                  label="Project Expense (60%)"
                  amount={selectedPools.projectExpense}
                  color="bg-blue-400"
                />
                <AllocationRow
                  label="Company Dev (20%)"
                  amount={selectedPools.companyDev}
                  color="bg-emerald-400"
                />
                <AllocationRow
                  label="Capital Dev (10%)"
                  amount={selectedPools.capitalDev}
                  color="bg-indigo-400"
                />
              </div>
            </section>
          </div>

          <OperationalTeamPool
            selectedMilestone={selectedMilestone}
            selectedMilestoneIsCompleted={selectedMilestoneIsCompleted}
            milestoneCategories={milestoneCategories}
            milestoneTasks={milestoneTasks}
            categories={categories}
            tasks={tasks}
            normalUsers={normalUsers}
            categoryName={categoryName}
            categoryPoints={categoryPoints}
            taskName={taskName}
            taskPoints={taskPoints}
            assignedUserId={assignedUserId}
            selectedCategoryId={selectedCategoryId}
            onCategoryNameChange={onCategoryNameChange}
            onCategoryPointsChange={onCategoryPointsChange}
            onTaskNameChange={onTaskNameChange}
            onTaskPointsChange={onTaskPointsChange}
            onAssignedUserChange={onAssignedUserChange}
            onSelectedCategoryChange={onSelectedCategoryChange}
            onAddCategory={onAddCategory}
            onAddTask={onAddTask}
            onRemoveCategory={onRemoveCategory}
            onRemoveTask={onRemoveTask}
          />
        </div>
      )}

      {dashboardMode === 'disbursement' && (
        <div className="space-y-6">
          <BonusFlowPanel
            payments={milestonePayments}
            onUpdatePaymentStatus={onUpdatePaymentStatus}
            title="Global Disbursement Overview"
            subtitle="Month-wise payment timeline for this milestone."
          />
        </div>
      )}
    </div>
  );
}

function MilestoneTaskNotification({
  selectedMilestoneIsCompleted,
  progress,
  onCompleteMilestone,
}: {
  selectedMilestoneIsCompleted: boolean;
  progress: {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    invalidTasks: number;
    allTasksDone: boolean;
    someTasksDone: boolean;
    canComplete: boolean;
  };
  onCompleteMilestone: () => void;
}) {
  if (selectedMilestoneIsCompleted) {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6" />

          <div>
            <h3 className="font-black">Milestone completed</h3>
            <p className="mt-1 text-sm opacity-80">
              Payments were generated and the milestone is locked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cardClass = progress.allTasksDone
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    : progress.someTasksDone
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
      : 'border-blue-400/30 bg-blue-500/10 text-blue-200';

  return (
    <div className={`rounded-3xl border p-6 ${cardClass}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          {progress.allTasksDone ? (
            <CheckCircle2 className="mt-1 h-6 w-6" />
          ) : progress.someTasksDone ? (
            <BellRing className="mt-1 h-6 w-6" />
          ) : (
            <AlertCircle className="mt-1 h-6 w-6" />
          )}

          <div>
            <h3 className="font-black">
              {progress.totalTasks === 0 && 'No tasks added yet'}

              {progress.totalTasks > 0 &&
                progress.completedTasks === 0 &&
                'Waiting for users to complete tasks'}

              {progress.someTasksDone &&
                `${progress.completedTasks}/${progress.totalTasks} tasks completed`}

              {progress.allTasksDone &&
                `All ${progress.totalTasks} tasks are completed`}
            </h3>

            <p className="mt-1 text-sm opacity-80">
              {progress.totalTasks === 0 &&
                'Add tasks and assign users before completing the milestone.'}

              {progress.totalTasks > 0 &&
                !progress.allTasksDone &&
                'Admin can complete this milestone only after every assigned user clicks Done.'}

              {progress.allTasksDone &&
                'Milestone is ready. Click Complete Milestone to create 3 monthly payment installments.'}
            </p>

            {progress.invalidTasks > 0 && (
              <p className="mt-2 text-sm font-black text-red-200">
                {progress.invalidTasks} task(s) have missing user or invalid points.
              </p>
            )}
          </div>
        </div>

        <button
          disabled={!progress.canComplete}
          onClick={onCompleteMilestone}
          className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white disabled:bg-slate-700 disabled:text-slate-400"
        >
          Complete Milestone ({progress.completedTasks}/{progress.totalTasks})
        </button>
      </div>
    </div>
  );
}

function AllocationRow({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-950/50 p-5">
      <div className="flex items-center gap-4">
        <span className={`h-9 w-2 rounded-full ${color}`} />
        <span className="text-sm font-black uppercase text-slate-300">
          {label}
        </span>
      </div>

      <span className="text-lg font-black text-slate-50">
        {formatLKR(amount)}
      </span>
    </div>
  );
}

function OperationalTeamPool({
  selectedMilestone,
  selectedMilestoneIsCompleted,
  milestoneCategories,
  milestoneTasks,
  categories,
  tasks,
  normalUsers,
  categoryName,
  categoryPoints,
  taskName,
  taskPoints,
  assignedUserId,
  selectedCategoryId,
  onCategoryNameChange,
  onCategoryPointsChange,
  onTaskNameChange,
  onTaskPointsChange,
  onAssignedUserChange,
  onSelectedCategoryChange,
  onAddCategory,
  onAddTask,
  onRemoveCategory,
  onRemoveTask,
}: {
  selectedMilestone: Milestone;
  selectedMilestoneIsCompleted: boolean;
  milestoneCategories: Category[];
  milestoneTasks: Task[];
  categories: Category[];
  tasks: Task[];
  normalUsers: UserProfile[];
  categoryName: string;
  categoryPoints: number;
  taskName: string;
  taskPoints: number;
  assignedUserId: string;
  selectedCategoryId: string;
  onCategoryNameChange: (value: string) => void;
  onCategoryPointsChange: (value: number) => void;
  onTaskNameChange: (value: string) => void;
  onTaskPointsChange: (value: number) => void;
  onAssignedUserChange: (value: string) => void;
  onSelectedCategoryChange: (value: string) => void;
  onAddCategory: (event?: React.FormEvent) => void;
  onAddTask: (categoryId?: string) => void;
  onRemoveCategory: (category: Category) => void;
  onRemoveTask: (task: Task) => void;
}) {
  const totalCategoryPoints = milestoneCategories.reduce(
    (sum, item) => sum + Number(item.pts || 0),
    0
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80">
      <div className="flex flex-col gap-4 border-b border-slate-700/50 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-black text-slate-50">
            <Users className="h-5 w-5 text-blue-300" />
            Operational Team Pool
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Distributing 60% of Bonus Pool based on effort points
          </p>
        </div>

        {!selectedMilestoneIsCompleted && (
          <button
            onClick={() => onAddCategory()}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        )}
      </div>

      {!selectedMilestoneIsCompleted && (
        <div className="grid gap-3 border-b border-slate-700/50 bg-slate-950/30 p-5 md:grid-cols-[1fr_120px_1fr_120px_180px_auto]">
          <input
            value={categoryName}
            onChange={(event) => onCategoryNameChange(event.target.value)}
            placeholder="Category name"
            className="h-11 rounded-xl border border-slate-700 px-3 text-sm"
          />

          <input
            type="number"
            value={categoryPoints || ''}
            onChange={(event) =>
              onCategoryPointsChange(Number(event.target.value) || 0)
            }
            placeholder="Cat Pts"
            className="h-11 rounded-xl border border-slate-700 px-3 text-sm"
          />

          <input
            value={taskName}
            onChange={(event) => onTaskNameChange(event.target.value)}
            placeholder="Task name"
            className="h-11 rounded-xl border border-slate-700 px-3 text-sm"
          />

          <input
            type="number"
            value={taskPoints || ''}
            onChange={(event) =>
              onTaskPointsChange(Number(event.target.value) || 0)
            }
            placeholder="Task Pts"
            className="h-11 rounded-xl border border-slate-700 px-3 text-sm"
          />

          <select
            value={assignedUserId}
            onChange={(event) => onAssignedUserChange(event.target.value)}
            className="h-11 rounded-xl border border-slate-700 px-3 text-sm"
          >
            <option value="">Select user</option>
            {normalUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>

          <button
            onClick={() => onAddTask(selectedCategoryId)}
            className="rounded-xl bg-indigo-600 px-4 text-sm font-black text-white"
          >
            Add Task
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <th className="px-6 py-4">Category / Task</th>
              <th className="px-6 py-4">Effort Points</th>
              <th className="px-6 py-4">Share (%)</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Bonus (LKR)</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {milestoneCategories.map((category) => {
              const categoryTasks = milestoneTasks.filter(
                (task) => task.categoryId === category.id
              );

              const categoryShare =
                totalCategoryPoints > 0
                  ? (Number(category.pts || 0) / totalCategoryPoints) * 100
                  : 0;

              return (
                <React.Fragment key={category.id}>
                  <tr className="bg-slate-950/30">
                    <td className="px-6 py-5">
                      <button
                        onClick={() => onSelectedCategoryChange(category.id)}
                        className="mr-3 text-slate-500"
                      >
                        ›
                      </button>

                      <span className="font-black text-slate-50">
                        {category.name}
                      </span>
                    </td>

                    <td className="px-6 py-5 font-black text-slate-200">
                      {category.pts}
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-blue-200">
                        {categoryShare.toFixed(1)}%
                      </span>
                    </td>

                    <td className="px-6 py-5">-</td>
                    <td className="px-6 py-5">-</td>
                    <td className="px-6 py-5 text-right">-</td>

                    <td className="px-6 py-5 text-right">
                      {!selectedMilestoneIsCompleted && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onAddTask(category.id)}
                            className="rounded-xl p-2 text-blue-300 hover:bg-blue-500/10"
                          >
                            <Plus className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onRemoveCategory(category)}
                            className="rounded-xl p-2 text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {categoryTasks.map((task) => {
                    const taskBonus = calculateTaskBonus({
                      milestone: selectedMilestone,
                      category,
                      task,
                      categories,
                      tasks,
                    });

                    return (
                      <tr key={task.id}>
                        <td className="px-6 py-4 pl-16">
                          <div className="font-bold text-slate-100">
                            {task.name}
                          </div>

                          <div className="text-xs text-slate-500">
                            {category.name}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-black text-blue-300">
                          {task.pts}
                        </td>

                        <td className="px-6 py-4">-</td>

                        <td className="px-6 py-4 text-slate-300">
                          {task.assignedUserName}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                              task.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-200'
                                : 'bg-amber-500/15 text-amber-200'
                            }`}
                          >
                            {task.status === 'completed' ? 'Done' : 'Pending'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right font-black text-slate-50">
                          {formatLKR(taskBonus)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {!task.locked && !selectedMilestoneIsCompleted && (
                            <button
                              onClick={() => onRemoveTask(task)}
                              className="rounded-xl p-2 text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {milestoneCategories.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-500">
                  No categories/tasks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsersPanel({ users }: { users: UserProfile[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80">
      <div className="border-b border-slate-700/50 p-6">
        <SectionTitle
          icon={<Users className="h-5 w-5" />}
          title="Users"
          subtitle="View users and manage manager/stakeholder flag."
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
            <th className="px-6 py-4">User</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Manager</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4">
                <div className="font-bold text-slate-100">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </td>

              <td className="px-6 py-4">
                <RoleBadge role={user.role} />
              </td>

              <td className="px-6 py-4">
                <button
                  onClick={() =>
                    updateDoc(doc(db, 'users', user.id), {
                      isManager: !user.isManager,
                      updatedAt: serverTimestamp(),
                    })
                  }
                  className={`rounded-xl px-4 py-2 text-xs font-black ${
                    user.isManager
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {user.isManager ? 'Manager' : 'Normal User'}
                </button>
              </td>
            </tr>
          ))}

          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="p-10 text-center text-slate-500">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function PaymentsPanel({
  payments,
  userEarnings,
  paymentStats,
  monthlySpendBudget,
  monthlyRemaining,
  setMonthlySpendBudget,
  updatePaymentStatus,
}: {
  payments: PaymentRecord[];
  userEarnings: {
    userId: string;
    name: string;
    email: string;
    pending: number;
    approved: number;
    paid: number;
    total: number;
    thisMonthToSpend: number;
  }[];
  paymentStats: {
    pending: number;
    approved: number;
    paid: number;
    thisMonthPending: number;
    thisMonthApproved: number;
    thisMonthPaid: number;
    thisMonthNeedToSpend: number;
  };
  monthlySpendBudget: number;
  monthlyRemaining: number;
  setMonthlySpendBudget: (value: number) => void;
  updatePaymentStatus: (payment: PaymentRecord, status: PaymentStatus) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MoneyCard title="Pending" amount={paymentStats.pending} />
        <MoneyCard title="Approved" amount={paymentStats.approved} />
        <MoneyCard title="Paid" amount={paymentStats.paid} />
      </div>

      <section className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6">
        <SectionTitle
          title="Monthly Spend Plan"
          subtitle="Each task payment is split into 3 monthly installments."
        />

        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Monthly Budget LKR
          </label>

          <input
            type="number"
            value={monthlySpendBudget || ''}
            onChange={(event) =>
              setMonthlySpendBudget(Number(event.target.value) || 0)
            }
            className="mt-1 w-full bg-transparent text-2xl font-black text-blue-300 outline-none"
            placeholder="0"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <MoneyCard
            title="This Month Pending"
            amount={paymentStats.thisMonthPending}
          />

          <MoneyCard
            title="This Month Approved"
            amount={paymentStats.thisMonthApproved}
          />

          <MoneyCard title="This Month Paid" amount={paymentStats.thisMonthPaid} />

          <MoneyCard
            title="Need To Spend"
            amount={paymentStats.thisMonthNeedToSpend}
          />

          <MoneyCard
            title={monthlyRemaining < 0 ? 'Over Budget' : 'Remaining'}
            amount={Math.abs(monthlyRemaining)}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/80">
        <div className="border-b border-slate-700/50 p-6">
          <SectionTitle
            icon={<Users className="h-5 w-5" />}
            title="All Users Earnings"
            subtitle="Admin can see every user's earned amount and this month spend amount."
          />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4 text-right">Pending</th>
              <th className="px-6 py-4 text-right">Approved</th>
              <th className="px-6 py-4 text-right">Paid</th>
              <th className="px-6 py-4 text-right">Total Earned</th>
              <th className="px-6 py-4 text-right">This Month To Spend</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {userEarnings.map((item) => (
              <tr key={item.userId}>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-100">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.email}</div>
                </td>

                <td className="px-6 py-4 text-right font-black text-amber-200">
                  LKR {formatLKR(item.pending)}
                </td>

                <td className="px-6 py-4 text-right font-black text-blue-200">
                  LKR {formatLKR(item.approved)}
                </td>

                <td className="px-6 py-4 text-right font-black text-emerald-200">
                  LKR {formatLKR(item.paid)}
                </td>

                <td className="px-6 py-4 text-right font-black text-slate-50">
                  LKR {formatLKR(item.total)}
                </td>

                <td className="px-6 py-4 text-right font-black text-indigo-200">
                  LKR {formatLKR(item.thisMonthToSpend)}
                </td>
              </tr>
            ))}

            {userEarnings.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500">
                  No earnings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <BonusFlowPanel
        payments={payments}
        onUpdatePaymentStatus={updatePaymentStatus}
        title="Bonus Flow"
        subtitle="Aggregated month-wise installment view across all projects, milestones, tasks, and assignees."
      />
    </div>
  );
}