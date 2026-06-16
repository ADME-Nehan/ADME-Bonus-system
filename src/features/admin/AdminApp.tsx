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
import { BonusFlowPanel } from '@/components/BonusFlowPanel';
import {
  CheckCircle2,
  ClipboardList,
  Folder,
  Plus,
  ReceiptText,
  Trash2,
  Users,
} from 'lucide-react';

import {
  RoleBadge,
  SectionTitle,
} from '@/components/AppShell';
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

type AdminTab = 'projects' | 'tasks' | 'users' | 'payments';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');

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
          (item) =>
            ({
              id: item.id,
              ...item.data(),
            }) as UserProfile
        )
      );
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(
        snapshot.docs.map(
          (item) =>
            ({
              id: item.id,
              ...item.data(),
            }) as Project
        )
      );
    });

    const unsubMilestones = onSnapshot(
      collection(db, 'milestones'),
      (snapshot) => {
        setMilestones(
          snapshot.docs.map(
            (item) =>
              ({
                id: item.id,
                ...item.data(),
              }) as Milestone
          )
        );
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setCategories(
          snapshot.docs.map(
            (item) =>
              ({
                id: item.id,
                ...item.data(),
              }) as Category
          )
        );
      }
    );

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(
        snapshot.docs.map(
          (item) =>
            ({
              id: item.id,
              ...item.data(),
            }) as Task
        )
      );
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const paymentRows = snapshot.docs.map(
        (item) =>
          ({
            id: item.id,
            ...item.data(),
          }) as PaymentRecord
      );

      paymentRows.sort((a, b) => {
        const aTime = a.dueDate?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.dueDate?.toMillis?.() || b.createdAt?.toMillis?.() || 0;

        return aTime - bTime;
      });

      setPayments(paymentRows);
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

    const milestoneStillExists = projectMilestones.some(
      (item) => item.id === selectedMilestoneId
    );

    if (!milestoneStillExists) {
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

  const normalUsers = useMemo(() => {
    return users.filter((item) => item.role === 'user');
  }, [users]);

  useEffect(() => {
    if (milestoneCategories.length === 0) {
      setSelectedCategoryId('');
      return;
    }

    if (!selectedCategoryId) {
      setSelectedCategoryId(milestoneCategories[0].id);
      return;
    }

    const categoryStillExists = milestoneCategories.some(
      (item) => item.id === selectedCategoryId
    );

    if (!categoryStillExists) {
      setSelectedCategoryId(milestoneCategories[0].id);
    }
  }, [milestoneCategories, selectedCategoryId]);

  useEffect(() => {
    if (!assignedUserId && normalUsers.length > 0) {
      setAssignedUserId(normalUsers[0].id);
    }
  }, [assignedUserId, normalUsers]);

  async function addProject(event: React.FormEvent) {
    event.preventDefault();

    const cleanProjectName = projectName.trim();

    if (!cleanProjectName) return;

    await addDoc(collection(db, 'projects'), {
      name: cleanProjectName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setProjectName('');
  }

  async function addMilestone(event: React.FormEvent) {
    event.preventDefault();

    const cleanMilestoneName = milestoneName.trim();

    if (!selectedProject || !cleanMilestoneName) return;

    await addDoc(collection(db, 'milestones'), {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      name: cleanMilestoneName,
      revenue: Number(milestoneRevenue || 0),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setMilestoneName('');
    setMilestoneRevenue(0);
  }

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();

    const cleanCategoryName = categoryName.trim();

    if (!selectedProject || !selectedMilestone || !cleanCategoryName) return;
    if (selectedMilestoneIsCompleted) return;

    await addDoc(collection(db, 'categories'), {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      milestoneId: selectedMilestone.id,
      milestoneName: selectedMilestone.name,
      name: cleanCategoryName,
      pts: Number(categoryPoints || 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setCategoryName('');
    setCategoryPoints(1);
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();

    const cleanTaskName = taskName.trim();

    if (
      !selectedProject ||
      !selectedMilestone ||
      !selectedCategoryId ||
      !cleanTaskName
    ) {
      return;
    }

    if (selectedMilestoneIsCompleted) return;

    const category = categories.find((item) => item.id === selectedCategoryId);
    const assignedUser = users.find((item) => item.id === assignedUserId);

    if (!category || !assignedUser) return;

    await addDoc(collection(db, 'tasks'), {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      milestoneId: selectedMilestone.id,
      milestoneName: selectedMilestone.name,
      categoryId: category.id,
      categoryName: category.name,
      name: cleanTaskName,
      pts: Number(taskPoints || 0),
      assignedUserId: assignedUser.id,
      assignedUserName: assignedUser.name || assignedUser.email,
      status: 'active',
      locked: false,
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

  async function removeCategory(category: Category) {
    if (!selectedMilestone || selectedMilestoneIsCompleted) return;

    const confirmDelete = window.confirm(
      'Delete this category and its tasks?'
    );

    if (!confirmDelete) return;

    const categoryTasks = tasks.filter((item) => item.categoryId === category.id);
    const batch = writeBatch(db);

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

    const confirmDelete = window.confirm('Delete this task?');

    if (!confirmDelete) return;

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

    const payableTasks = milestoneTasks.filter(
      (item) =>
        item.status === 'completed' &&
        item.assignedUserId &&
        Number(item.pts || 0) > 0
    );

    if (payableTasks.length === 0) {
      alert('No completed tasks found. Users must click Done before admin completes the milestone.');
      return;
    }

    const confirmed = window.confirm(
      'Complete this milestone? Each task payment will be split into 3 monthly installments and all tasks will be locked.'
    );

    if (!confirmed) return;

    const batch = writeBatch(db);

    batch.update(doc(db, 'milestones', selectedMilestone.id), {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    payableTasks.forEach((task) => {
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
        completedAt: serverTimestamp(),
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

  const selectedPools = getBonusPools(selectedMilestone?.revenue || 0);

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
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-slate-200/50 p-2">
        {[
          ['projects', 'Projects'],
          ['tasks', 'Tasks'],
          ['users', 'Users'],
          ['payments', 'Payments'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as AdminTab)}
            className={`rounded-2xl px-5 py-2 text-sm font-black ${
              activeTab === key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              icon={<Folder className="h-6 w-6 text-blue-600" />}
              title="Projects & Milestones"
              subtitle="Create projects and set milestone revenue."
            />

            <form onSubmit={addProject} className="flex gap-3">
              <input
                className="h-12 flex-1 rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                placeholder="Project name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />

              <button className="rounded-2xl bg-blue-600 px-5 font-black text-white">
                Add
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSelectedMilestoneId('');
                    setSelectedCategoryId('');
                  }}
                  className={`block w-full rounded-2xl border p-4 text-left ${
                    selectedProjectId === project.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <strong>{project.name}</strong>
                </button>
              ))}

              {projects.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  No projects yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              icon={<ClipboardList className="h-6 w-6 text-indigo-600" />}
              title="Milestones"
              subtitle={selectedProject ? selectedProject.name : 'Select project first'}
            />

            <form
              onSubmit={addMilestone}
              className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
            >
              <input
                className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                placeholder="Milestone name"
                value={milestoneName}
                onChange={(event) => setMilestoneName(event.target.value)}
              />

              <input
                type="number"
                className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                placeholder="Revenue"
                value={milestoneRevenue || ''}
                onChange={(event) =>
                  setMilestoneRevenue(Number(event.target.value) || 0)
                }
              />

              <button className="rounded-2xl bg-indigo-600 px-5 font-black text-white">
                Add
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {projectMilestones.map((milestone) => (
                <button
                  key={milestone.id}
                  onClick={() => {
                    setSelectedMilestoneId(milestone.id);
                    setSelectedCategoryId('');
                  }}
                  className={`block w-full rounded-2xl border p-4 text-left ${
                    selectedMilestoneId === milestone.id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong>{milestone.name}</strong>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                        milestone.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {milestone.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Revenue: LKR {formatLKR(milestone.revenue)}
                  </p>
                </button>
              ))}

              {projectMilestones.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  No milestones for this project yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="Task Allocation"
              subtitle="Add categories, assign users, and complete milestone to create 3-month payments."
            />

            {!selectedMilestone ? (
              <p className="text-slate-500">
                Select a milestone from Projects tab.
              </p>
            ) : (
              <>
                {selectedMilestoneIsCompleted && (
                  <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
                    This milestone is completed and locked.
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-4">
                  <MoneyCard title="Bonus Pool" amount={selectedPools.bonusPool} />
                  <MoneyCard
                    title="Management Pool"
                    amount={selectedPools.managementPool}
                  />
                  <MoneyCard title="Team Pool" amount={selectedPools.teamPool} />
                  <MoneyCard
                    title="Corporate Pool"
                    amount={selectedPools.corporatePool}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Milestone Revenue LKR
                    </label>

                    <input
                      type="number"
                      disabled={selectedMilestoneIsCompleted}
                      value={selectedMilestone.revenue || ''}
                      onChange={(event) =>
                        updateMilestoneRevenue(Number(event.target.value) || 0)
                      }
                      className="mt-1 w-full bg-transparent text-2xl font-black text-blue-600 outline-none disabled:text-slate-400"
                    />
                  </div>

                  <button
                    disabled={selectedMilestoneIsCompleted}
                    onClick={completeMilestone}
                    className="rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white shadow-lg shadow-emerald-100 disabled:bg-slate-300"
                  >
                    <CheckCircle2 className="mr-2 inline h-5 w-5" />
                    Complete Milestone
                  </button>
                </div>
              </>
            )}
          </section>

          {selectedMilestone && !selectedMilestoneIsCompleted && (
            <section className="grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={addCategory}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-black text-slate-900">Add Category</h3>

                <input
                  className="mt-4 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                  placeholder="Category name"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />

                <input
                  type="number"
                  className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                  placeholder="Category points"
                  value={categoryPoints || ''}
                  onChange={(event) =>
                    setCategoryPoints(Number(event.target.value) || 0)
                  }
                />

                <button className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white">
                  <Plus className="mr-2 inline h-4 w-4" />
                  Add Category
                </button>
              </form>

              <form
                onSubmit={addTask}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-black text-slate-900">Add Task</h3>

                <select
                  className="mt-4 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                >
                  <option value="">Select category</option>

                  {milestoneCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                  value={assignedUserId}
                  onChange={(event) => setAssignedUserId(event.target.value)}
                >
                  <option value="">Select user</option>

                  {normalUsers.map((appUser) => (
                    <option key={appUser.id} value={appUser.id}>
                      {appUser.name || appUser.email}
                    </option>
                  ))}
                </select>

                <input
                  className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                  placeholder="Task name"
                  value={taskName}
                  onChange={(event) => setTaskName(event.target.value)}
                />

                <input
                  type="number"
                  className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
                  placeholder="Task points"
                  value={taskPoints || ''}
                  onChange={(event) =>
                    setTaskPoints(Number(event.target.value) || 0)
                  }
                />

                <button className="mt-4 rounded-2xl bg-indigo-600 px-5 py-3 font-black text-white">
                  <Plus className="mr-2 inline h-4 w-4" />
                  Add Task
                </button>
              </form>
            </section>
          )}

          {selectedMilestone && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <h3 className="font-black text-slate-900">Categories & Tasks</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Points</th>
                      <th className="px-6 py-4 text-right">
                        Payment Preview
                      </th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {milestoneCategories.map((category) => {
                      const categoryTasks = milestoneTasks.filter(
                        (task) => task.categoryId === category.id
                      );

                      return (
                        <React.Fragment key={category.id}>
                          <tr className="bg-slate-50/60">
                            <td className="px-6 py-4 font-black text-blue-600">
                              Category
                            </td>

                            <td className="px-6 py-4 font-black text-slate-800">
                              {category.name}
                            </td>

                            <td className="px-6 py-4">-</td>

                            <td className="px-6 py-4 font-black">
                              {category.pts}
                            </td>

                            <td className="px-6 py-4 text-right">-</td>

                            <td className="px-6 py-4 text-right">
                              {!selectedMilestoneIsCompleted && (
                                <button
                                  onClick={() => removeCategory(category)}
                                  className="rounded-xl bg-red-50 p-2 text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>

                          {categoryTasks.map((task) => {
                            const paymentPreview = calculateTaskBonus({
                              milestone: selectedMilestone,
                              category,
                              task,
                              categories,
                              tasks,
                            });

                            return (
                              <tr key={task.id}>
                                <td className="px-6 py-4 font-black text-indigo-600">
                                  Task
                                </td>

                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800">
                                    {task.name}
                                  </div>

                                  <div className="text-xs text-slate-400">
                                    {task.status}{' '}
                                    {task.locked ? '· locked' : ''}
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  {task.assignedUserName}
                                </td>

                                <td className="px-6 py-4 font-black text-blue-600">
                                  {task.pts}
                                </td>

                                <td className="px-6 py-4 text-right font-black text-slate-900">
                                  LKR {formatLKR(paymentPreview)}
                                </td>

                                <td className="px-6 py-4 text-right">
                                  {!task.locked &&
                                    !selectedMilestoneIsCompleted && (
                                      <button
                                        onClick={() => removeTask(task)}
                                        className="rounded-xl bg-red-50 p-2 text-red-500"
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
                        <td
                          colSpan={6}
                          className="p-10 text-center text-slate-400"
                        >
                          No categories/tasks yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <SectionTitle
              icon={<Users className="h-6 w-6 text-blue-600" />}
              title="Users"
              subtitle="View users and manage manager/stakeholder flag."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Manager</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((appUser) => (
                  <tr key={appUser.id}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">
                        {appUser.name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {appUser.email}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <RoleBadge role={appUser.role} />
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          updateDoc(doc(db, 'users', appUser.id), {
                            isManager: !appUser.isManager,
                            updatedAt: serverTimestamp(),
                          })
                        }
                        className={`rounded-xl px-4 py-2 text-xs font-black ${
                          appUser.isManager
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {appUser.isManager ? 'Manager' : 'Normal User'}
                      </button>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-10 text-center text-slate-400"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <MoneyCard
              title="Pending"
              amount={paymentStats.pending}
              className="bg-amber-50 text-amber-700 border-amber-200"
            />

            <MoneyCard
              title="Approved"
              amount={paymentStats.approved}
              className="bg-blue-50 text-blue-700 border-blue-200"
            />

            <MoneyCard
              title="Paid"
              amount={paymentStats.paid}
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            />
          </div>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <SectionTitle
                icon={<Users className="h-6 w-6 text-blue-600" />}
                title="All Users Earnings"
                subtitle="Admin can see every user's earned amount and this month spend amount."
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4 text-right">Pending</th>
                    <th className="px-6 py-4 text-right">Approved</th>
                    <th className="px-6 py-4 text-right">Paid</th>
                    <th className="px-6 py-4 text-right">Total Earned</th>
                    <th className="px-6 py-4 text-right">
                      This Month To Spend
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {userEarnings.map((item) => (
                    <tr key={item.userId}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">
                          {item.name}
                        </div>

                        <div className="text-xs text-slate-400">
                          {item.email}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right font-black text-amber-700">
                        LKR {formatLKR(item.pending)}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-blue-700">
                        LKR {formatLKR(item.approved)}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-emerald-700">
                        LKR {formatLKR(item.paid)}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        LKR {formatLKR(item.total)}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-indigo-700">
                        LKR {formatLKR(item.thisMonthToSpend)}
                      </td>
                    </tr>
                  ))}

                  {userEarnings.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-10 text-center text-slate-400"
                      >
                        No earnings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <BonusFlowPanel
            payments={payments}
            onUpdatePaymentStatus={updatePaymentStatus}
          />
        </div>
      )}
    </div>
  );
}
