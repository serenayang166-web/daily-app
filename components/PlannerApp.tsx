'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  Home, Calendar as CalIcon, Plus, User, Check, ChevronRight, ChevronLeft,
  Target, Sparkles, Flame, Clock, ArrowRight, Trophy, Repeat,
  Pencil, X, Loader2, RotateCw, MessageCircle, BookOpen, Dumbbell,
  TrendingUp, Bell, Settings, ArrowLeft, Smile, type LucideIcon
} from 'lucide-react';
import {
  loadDailyData,
  updateGoalTaskCompletion,
  updateHabitCheckinCompletion,
  updateHabitReminder,
} from '@/lib/daily-data';
import { signInWithPassword, signOut, signUpWithPassword } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// Mock data
// ═══════════════════════════════════════════════════════════════════
const today = new Date('2026-05-05');
const fmtDate = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
const fmtFull = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const initialGoals = [
  {
    id: 'g1',
    title: '完成论文初稿',
    icon: BookOpen,
    description: '8000 字研究生论文',
    startDate: addDays(today, -11),
    endDate: addDays(today, 18),
    totalDays: 30,
    currentDay: 12,
    dailyTime: 90,
    days: Array.from({ length: 30 }, (_, i) => ({
      day_number: i + 1,
      date: fmtFull(addDays(today, i - 11)),
      title: [
        '明确论文方向', '收集核心文献', '整理文献摘要', '撰写大纲', '完成引言初稿',
        '撰写文献综述上半', '撰写文献综述下半', '研究方法论框架', '数据收集计划', '研究方法详写',
        '案例分析准备', '案例一撰写', '案例二撰写', '案例对比分析', '中期复盘修改',
        '理论框架补充', '讨论部分上半', '讨论部分下半', '局限性讨论', '结论起草',
        '结论精修', '摘要撰写', '关键词整理', '参考文献规范化', '附录整理',
        '通读修订一', '通读修订二', '格式校对', '导师反馈预演', '终稿提交准备'
      ][i],
      tasks: i === 11 ? [
        '撰写案例一开篇 400 字',
        '整理案例核心数据 3 组',
        '画出案例分析框架图',
        '与导师确认下一步方向'
      ] : ['核心任务一', '核心任务二', '核心任务三'],
      estimated_time: 90,
      encouragement: i === 11 ? '今天把案例的骨架立起来，细节明天补。' : '稳扎稳打。',
      is_completed: i < 11,
      note: ''
    }))
  },
  {
    id: 'g2',
    title: '减重 5kg',
    icon: TrendingUp,
    description: '通过饮食 + 运动达成',
    startDate: addDays(today, -19),
    endDate: addDays(today, 40),
    totalDays: 60,
    currentDay: 20,
    dailyTime: 45,
    days: []
  }
];

const initialHabits = [
  {
    id: 'h1',
    title: '每天背 30 个单词',
    icon: BookOpen,
    startDate: addDays(today, -7),
    endDate: addDays(today, 13),
    currentDay: 8,
    streak: 6,
    reminderTime: '07:30',
    reminderEnabled: true,
    checkins: Array.from({ length: 21 }, (_, i) => ({
      day_number: i + 1,
      date: fmtFull(addDays(today, i - 7)),
      title: i < 7 ? `复习 + 学 30 词` : `学 30 个新词`,
      is_completed: i < 7 && i !== 1,
      note: ''
    }))
  },
  {
    id: 'h2',
    title: '每天跑步 3km',
    icon: Dumbbell,
    startDate: addDays(today, -2),
    endDate: addDays(today, 18),
    currentDay: 3,
    streak: 2,
    reminderTime: '18:00',
    reminderEnabled: true,
    checkins: Array.from({ length: 21 }, (_, i) => ({
      day_number: i + 1,
      date: fmtFull(addDays(today, i - 2)),
      title: '慢跑 3km，配速不限',
      is_completed: i < 2,
      note: ''
    }))
  }
];

// ═══════════════════════════════════════════════════════════════════
// Toast system
// ═══════════════════════════════════════════════════════════════════
type ToastKind = 'success' | 'danger' | 'info';
type ToastItem = { id: number; msg: string; kind: ToastKind };

const ToastCtx = createContext<{ push: (msg: string, kind?: ToastKind) => void }>({ push: () => {} });
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (msg: string, kind: ToastKind = 'success') => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2200);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-2xl text-[13px] font-medium shadow-lg flex items-center gap-2 animate-toast-in ${
              t.kind === 'success' ? 'kk-success text-white' :
              t.kind === 'danger' ? 'kk-danger text-white' :
              'kk-dark text-white'
            }`}
          >
            {t.kind === 'success' && <Check className="w-4 h-4" strokeWidth={3} />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Reusable
// ═══════════════════════════════════════════════════════════════════
function BigCheckbox({ checked, onChange, size = 28 }) {
  const [animating, setAnimating] = useState(false);
  const handle = () => {
    setAnimating(true);
    onChange(!checked);
    setTimeout(() => setAnimating(false), 400);
  };
  return (
    <button
      onClick={handle}
      className={`relative flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
        checked ? 'kk-brand kk-border-brand' : 'bg-white border-[#D1D5DB]'
      } ${animating ? 'animate-check-pop' : ''}`}
      style={{ width: size, height: size }}
    >
      {checked && (
        <Check
          className="text-white animate-check-draw"
          style={{ width: size * 0.55, height: size * 0.55 }}
          strokeWidth={3.5}
        />
      )}
    </button>
  );
}

function ProgressBar({ percent, height = 8, color = '#7B61FF' }) {
  return (
    <div className="w-full bg-[#F3F4F6] rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`bg-[#F3F4F6] rounded-xl animate-pulse-soft ${className}`} />;
}

function Card({
  children,
  className = '',
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_2px_8px_rgba(17,24,39,0.04)] ${onClick ? 'cursor-pointer active:scale-[0.99] transition' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function StepDots({ total, current }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 kk-brand' : i < current ? 'w-1.5 kk-brand/50' : 'w-1.5 bg-[#E5E7EB]'
          }`}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Login
// ═══════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState('serena@example.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const toast = useToast();

  const submit = async () => {
    setLoading(true);
    try {
      const result = mode === 'sign-in'
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
      if (result.status === 'unconfigured') {
        toast.push('Supabase 未配置，使用示例数据', 'info');
        onLogin();
        return;
      }
      if (result.status === 'confirmation-required') {
        toast.push('请先去邮箱确认账号', 'info');
        return;
      }
      if (mode === 'sign-up') {
        toast.push('账号已创建');
      }
      onLogin();
    } catch (err) {
      console.warn('Auth failed:', err);
      const message = err instanceof Error ? err.message : '请稍后再试';
      toast.push(message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-7 pt-20 pb-10 relative overflow-hidden">
      <div className="absolute -top-40 -right-20 w-80 h-80 rounded-full kk-brand opacity-[0.12] blur-3xl" style={{ backgroundColor: '#7B61FF' }} />
      <div className="absolute top-60 -left-32 w-72 h-72 rounded-full kk-brand opacity-[0.08] blur-3xl" style={{ backgroundColor: '#7B61FF' }} />

      <div className="relative">
        <div className="flex items-center gap-2.5 mb-20">
          <div className="w-10 h-10 rounded-2xl kk-brand flex items-center justify-center shadow-[0_8px_24px_rgba(123,97,255,0.3)]" style={{ backgroundColor: '#7B61FF' }}>
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2.4} />
          </div>
          <span className="text-[18px] font-semibold tracking-tight text-[#111827]">每日 Daily</span>
        </div>

        <h1 className="text-[36px] leading-[1.15] font-bold text-[#111827] tracking-tight mb-3">
          你的<span className="kk-text-brand"> AI 教练</span><br/>
          每天陪你前进一步
        </h1>
        <p className="text-[15px] text-[#6B7280] leading-relaxed mb-12 max-w-[300px]">
          把长远目标拆成今天能做的事。
        </p>

        <div className="space-y-3 mb-6">
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-5 py-4 text-[15px] focus:outline-none focus:kk-border-brand focus:ring-4 focus:ring-[#7B61FF]/10 transition"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-5 py-4 text-[15px] focus:outline-none focus:kk-border-brand focus:ring-4 focus:ring-[#7B61FF]/10 transition"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full kk-brand text-white rounded-2xl py-4 font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-[0_8px_24px_rgba(123,97,255,0.3)]" style={{ backgroundColor: '#7B61FF' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {mode === 'sign-in' ? '开始使用' : '注册账号'} <ArrowRight className="w-4 h-4" />
        </button>

        <div className="text-center mt-6 text-[13px] text-[#6B7280]">
          {mode === 'sign-in' ? '还没有账号？' : '已经有账号？'}
          <button
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="kk-text-brand font-semibold"
          >
            {mode === 'sign-in' ? '注册' : '登录'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ goals, habits, onOpenGoal, onOpenCheckin, onCreate, toggleGoalTask, toggleHabitCheckin }) {
  // Today's aggregated tasks
  const todayTasks = [];
  goals.forEach(g => {
    const d = g.days[g.currentDay - 1];
    if (d) todayTasks.push({
      kind: 'goal', goalId: g.id, dayIdx: g.currentDay - 1,
      title: d.title, sub: g.title, time: d.estimated_time,
      tasks: d.tasks, completed: d.is_completed
    });
  });
  habits.forEach(h => {
    const c = h.checkins[h.currentDay - 1];
    if (c) todayTasks.push({
      kind: 'habit', habitId: h.id, dayIdx: h.currentDay - 1,
      title: c.title, sub: h.title, completed: c.is_completed,
      streak: h.streak
    });
  });

  const totalToday = todayTasks.length;
  const doneToday = todayTasks.filter(t => t.completed).length;
  const todayPct = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;

  // Primary goal countdown
  const primaryGoal = goals.reduce((a, b) =>
    (b.totalDays - b.currentDay) < (a.totalDays - a.currentDay) ? b : a
  );
  const remainingDays = primaryGoal.totalDays - primaryGoal.currentDay + 1;
  const goalPct = Math.round((primaryGoal.currentDay / primaryGoal.totalDays) * 100);

  const totalStreak = Math.max(...habits.map(h => h.streak));

  return (
    <div className="px-5 pt-14 pb-32">
      {/* Greeting */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1">
          <div className="text-[24px] font-bold text-[#111827] tracking-tight">
            Good morning, Serena <span className="inline-block">🌤</span>
          </div>
          <div className="text-[14px] text-[#6B7280] mt-1">
            距离<span className="kk-text-brand font-semibold">「{primaryGoal.title}」</span>还剩 <span className="kk-text-brand font-semibold">{remainingDays}</span> 天
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-[#F3F4F6] flex items-center justify-center shadow-sm">
          <Bell className="w-4 h-4 text-[#6B7280]" />
        </button>
      </div>

      {/* Primary goal card */}
      <Card className="p-4 mt-5 mb-6" onClick={() => onOpenGoal(primaryGoal.id)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl kk-brand-soft flex items-center justify-center" style={{ backgroundColor: '#F3F0FF' }}>
            <primaryGoal.icon className="w-5 h-5 kk-text-brand" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] text-[#111827] truncate">{primaryGoal.title}</div>
            <div className="text-[12px] text-[#6B7280]">Day {primaryGoal.currentDay} / {primaryGoal.totalDays}</div>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-bold kk-text-brand leading-none tabular-nums">{remainingDays}</div>
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wider mt-0.5">天</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar percent={goalPct} />
          <div className="text-[12px] text-[#6B7280] font-medium tabular-nums">{goalPct}%</div>
        </div>
      </Card>

      {/* Today's tasks — VISUAL CENTER */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] kk-text-brand font-bold mb-0.5">Today Focus</div>
            <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">今天要做的事</h2>
          </div>
          <div className="text-[13px] text-[#6B7280]">
            <span className="kk-text-brand font-bold tabular-nums">{doneToday}</span>
            <span className="text-[#6B7280]"> / {totalToday}</span>
          </div>
        </div>

        <Card className="p-4 mb-3">
          <div className="space-y-3">
            {todayTasks.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-3 group"
              >
                <div className="pt-0.5">
                  <BigCheckbox
                    checked={t.completed}
                    onChange={() => t.kind === 'goal' ? toggleGoalTask(t.goalId, t.dayIdx) : toggleHabitCheckin(t.habitId, t.dayIdx)}
                  />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className={`font-semibold text-[14px] ${t.completed ? 'line-through text-[#6B7280]' : 'text-[#111827]'}`}>
                    {t.title}
                  </div>
                  <div className="text-[12px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                    {t.kind === 'goal' ? (
                      <><Target className="w-3 h-3" />{t.sub} · {t.time}min</>
                    ) : (
                      <><Repeat className="w-3 h-3" />{t.sub} · 🔥 {t.streak}天</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress within today */}
          <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <ProgressBar percent={todayPct} height={6} color="#22C55E" />
              <div className="text-[11px] text-[#6B7280] font-medium tabular-nums">{todayPct}%</div>
            </div>
          </div>
        </Card>

        <button
          onClick={onOpenCheckin}
          className="w-full kk-brand text-white rounded-2xl py-4 font-semibold text-[14px] active:scale-[0.99] transition shadow-[0_8px_20px_rgba(123,97,255,0.25)] flex items-center justify-center gap-2" style={{ backgroundColor: '#7B61FF' }}
        >
          {doneToday === totalToday ? '今日已完成 ✨' : `开始打卡 →`}
        </button>
      </div>

      {/* Habits */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-[#111827]">习惯</h2>
          <button onClick={onCreate} className="text-[12px] kk-text-brand font-semibold flex items-center gap-1">
            <Plus className="w-3 h-3" /> 新建
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {habits.map(h => {
            const Icon = h.icon;
            const done = h.checkins.filter(c => c.is_completed).length;
            return (
              <Card key={h.id} className="p-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg kk-brand-soft flex items-center justify-center" style={{ backgroundColor: '#F3F0FF' }}>
                    <Icon className="w-4 h-4 kk-text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-[#111827] truncate">{h.title}</div>
                    <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                      <Flame className="w-3 h-3 kk-text-danger" /> 连续 {h.streak} 天 · Day {h.currentDay}/21
                    </div>
                  </div>
                </div>
                <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(21, 1fr)' }}>
                  {h.checkins.map((ci, i) => (
                    <div key={i} className={`h-5 rounded-[3px] ${
                      ci.is_completed ? 'kk-success' :
                      i === h.currentDay - 1 ? 'kk-brand-soft border kk-border-brand' :
                      i < h.currentDay - 1 ? 'kk-danger-soft' : 'bg-[#F3F4F6]'
                    }`} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom stats */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={Trophy} label="今日完成" value={`${todayPct}%`} color="#7B61FF" />
          <Stat icon={Flame} label="连续打卡" value={`${totalStreak}天`} color="#EF4444" />
          <Stat icon={Target} label="进行中" value={`${goals.length + habits.length}`} color="#22C55E" />
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="text-center">
      <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-[16px] font-bold text-[#111827] tabular-nums">{value}</div>
      <div className="text-[11px] text-[#6B7280] mt-0.5">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Create Wizard — conversational flow
// ═══════════════════════════════════════════════════════════════════
function CreateWizard({ onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(null);
  const [data, setData] = useState({
    title: '', endDate: fmtFull(addDays(today, 90)),
    current: '', dailyTime: 60, description: ''
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const toast = useToast();

  const isGoal = kind === 'goal';
  const totalSteps = isGoal ? 5 : 4;

  const goNext = () => setStep(s => s + 1);
  const goBack = () => step === 0 ? onClose() : setStep(s => s - 1);

  const generate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'create',
          kind,
          title: data.title,
          description: data.description,
          current: data.current,
          endDate: isGoal ? data.endDate : fmtFull(addDays(today, 21)),
          dailyTime: data.dailyTime,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || '生成失败');
      setGenerated(payload.plan);
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败';
      toast.push(message, 'danger');
    } finally {
      setGenerating(false);
    }
  };

  // ──── Render
  return (
    <div className="min-h-screen flex flex-col px-5 pt-14 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={goBack} className="w-10 h-10 rounded-full bg-white border border-[#F3F4F6] flex items-center justify-center shadow-sm">
          {step === 0 ? <X className="w-4 h-4 text-[#6B7280]" /> : <ArrowLeft className="w-4 h-4 text-[#6B7280]" />}
        </button>
        {kind && !generated && !generating && <StepDots total={totalSteps} current={step} />}
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Step 0: pick kind */}
        {step === 0 && (
          <div className="animate-slide-up">
            <h1 className="text-[26px] font-bold text-[#111827] tracking-tight mb-2">想做什么？</h1>
            <p className="text-[14px] text-[#6B7280] mb-8">告诉我你的目标类型，AI 帮你拆成每一天。</p>

            <div className="space-y-3">
              <button
                onClick={() => { setKind('goal'); setStep(1); }}
                className="w-full kk-brand text-white rounded-2xl p-5 text-left active:scale-[0.99] transition shadow-[0_12px_32px_rgba(123,97,255,0.25)] relative overflow-hidden" style={{ backgroundColor: '#7B61FF' }}
              >
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white opacity-10" />
                <div className="text-[28px] mb-3">🎯</div>
                <div className="text-[18px] font-bold mb-1 relative">达成一个目标</div>
                <div className="text-[12px] text-white/80 relative">有截止日期 · 30 天完成论文 · 90 天考 PTE</div>
              </button>

              <button
                onClick={() => { setKind('habit'); setStep(1); }}
                className="w-full bg-white border border-[#F3F4F6] rounded-2xl p-5 text-left active:scale-[0.99] transition shadow-[0_2px_8px_rgba(17,24,39,0.04)]"
              >
                <div className="text-[28px] mb-3">🔥</div>
                <div className="text-[18px] font-bold text-[#111827] mb-1">养成一个习惯</div>
                <div className="text-[12px] text-[#6B7280]">21 天连续打卡 · 每天背单词 · 每天跑步</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: title */}
        {step === 1 && (
          <WizardStep
            key="step-1"
            label={isGoal ? '🎯 目标' : '🔥 习惯'}
            question={isGoal ? '你想达成什么？' : '想养成什么习惯？'}
            hint="一句话描述就好。"
            onContinue={goNext}
            disabled={!data.title.trim()}
          >
            <input
              autoFocus
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder={isGoal ? '例如：30 天完成论文初稿' : '例如：每天学 KQL 30 分钟'}
              className="w-full bg-white border-2 border-[#E5E7EB] rounded-2xl px-5 py-4 text-[16px] font-medium focus:outline-none focus:kk-border-brand transition"
            />
          </WizardStep>
        )}

        {/* Step 2 (goal only): deadline */}
        {step === 2 && isGoal && (
          <WizardStep
            key="step-2"
            label="🗓️ 截止"
            question="什么时候要完成？"
            hint="AI 会按剩余天数倒推每日计划。"
            onContinue={goNext}
          >
            <input
              type="date"
              value={data.endDate}
              onChange={(e) => setData({ ...data, endDate: e.target.value })}
              className="w-full bg-white border-2 border-[#E5E7EB] rounded-2xl px-5 py-4 text-[16px] font-medium focus:outline-none focus:kk-border-brand transition"
            />
            <div className="flex gap-2 mt-3">
              {[7, 21, 30, 60, 90].map(n => (
                <button
                  key={n}
                  onClick={() => setData({ ...data, endDate: fmtFull(addDays(today, n)) })}
                  className="flex-1 py-2.5 bg-white border border-[#F3F4F6] rounded-xl text-[12px] font-semibold text-[#6B7280] active:scale-95 transition"
                >
                  {n}天
                </button>
              ))}
            </div>
          </WizardStep>
        )}

        {/* Step 3 (goal) / 2 (habit): current situation */}
        {((isGoal && step === 3) || (!isGoal && step === 2)) && (
          <WizardStep
            key="step-cur"
            label="📍 起点"
            question="你现在的基础是？"
            hint="AI 会根据起点决定第一天的难度。"
            onContinue={goNext}
            disabled={!data.current.trim()}
          >
            <textarea
              autoFocus
              value={data.current}
              onChange={(e) => setData({ ...data, current: e.target.value })}
              placeholder={isGoal ? '例如：已收集 5 篇文献，但还没开始写' : '例如：完全零基础'}
              rows={4}
              className="w-full bg-white border-2 border-[#E5E7EB] rounded-2xl px-5 py-4 text-[15px] focus:outline-none focus:kk-border-brand transition resize-none"
            />
          </WizardStep>
        )}

        {/* Step 4 (goal) / 3 (habit): daily time */}
        {((isGoal && step === 4) || (!isGoal && step === 3)) && (
          <WizardStep
            key="step-time"
            label="⏱️ 时间"
            question="每天能投入多少时间？"
            hint="AI 拆任务时会以这个时间为上限。"
            onContinue={generated ? goNext : generate}
            continueLabel={<><Sparkles className="w-4 h-4" /> 生成 AI 计划</>}
          >
            <div className="grid grid-cols-2 gap-2.5">
              {[15, 30, 60, 90, 120, 180].map(t => (
                <button
                  key={t}
                  onClick={() => setData({ ...data, dailyTime: t })}
                  className={`py-4 rounded-2xl text-[15px] font-bold transition active:scale-95 border-2 ${
                    data.dailyTime === t
                      ? 'kk-brand text-white kk-border-brand shadow-[0_8px_20px_rgba(123,97,255,0.25)]'
                      : 'bg-white text-[#111827] border-[#E5E7EB]'
                  }`}
                >
                  {t} 分钟
                </button>
              ))}
            </div>
          </WizardStep>
        )}
      </div>

      {/* Generating screen */}
      {generating && (
        <div className="fixed inset-0 kk-page z-40 flex flex-col items-center justify-center px-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl kk-brand flex items-center justify-center mb-6 animate-pulse-soft shadow-[0_12px_32px_rgba(123,97,255,0.3)]" style={{ backgroundColor: '#7B61FF' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-[22px] font-bold text-[#111827] mb-2">AI 正在为你拆解…</h2>
          <p className="text-[14px] text-[#6B7280] mb-10 text-center">
            分析你的起点、剩余时间和每日节奏。
          </p>
          <div className="w-full max-w-[340px] space-y-2.5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </div>
      )}

      {/* Preview */}
      {generated && !generating && (
        <div className="absolute inset-0 kk-page z-30 px-5 pt-14 pb-32 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setGenerated(null)} className="w-10 h-10 rounded-full bg-white border border-[#F3F4F6] flex items-center justify-center shadow-sm">
              <ArrowLeft className="w-4 h-4 text-[#6B7280]" />
            </button>
            <div className="text-[12px] text-[#6B7280]">AI 生成结果</div>
            <div className="w-10" />
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 kk-brand-soft rounded-full text-[11px] font-bold kk-text-brand mb-3" style={{ backgroundColor: '#F3F0FF' }}>
              <Sparkles className="w-3 h-3" /> AI Generated
            </div>
            <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">{data.title}</h1>
            <p className="text-[13px] text-[#6B7280] mt-1">展示前 7 天 · 完整计划已生成</p>
          </div>

          <div className="space-y-2.5 mb-8">
            {generated.days.map((d, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full kk-brand text-white flex items-center justify-center font-bold text-[13px] flex-shrink-0" style={{ backgroundColor: '#7B61FF' }}>
                    {d.day_number}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[14px] text-[#111827] mb-1.5">{d.title}</div>
                    <ul className="space-y-1">
                      {d.tasks.map((t, j) => (
                        <li key={j} className="text-[12px] text-[#6B7280] flex gap-2">
                          <span className="kk-text-brand">·</span> {t}
                        </li>
                      ))}
                    </ul>
                    <div className="text-[11px] text-[#6B7280] mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {d.estimated_time} 分钟
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setGenerated(null); generate(); }}
              className="bg-white border border-[#E5E7EB] text-[#111827] rounded-2xl py-4 text-[14px] font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> 重新生成
            </button>
            <button
              onClick={() => onDone({ kind, ...data })}
              className="kk-brand text-white rounded-2xl py-4 text-[14px] font-semibold active:scale-[0.98] transition shadow-[0_8px_20px_rgba(123,97,255,0.25)]" style={{ backgroundColor: '#7B61FF' }}
            >
              确认创建 ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStep({
  label,
  question,
  hint,
  children,
  onContinue,
  disabled = false,
  continueLabel,
}: {
  label: React.ReactNode;
  question: React.ReactNode;
  hint: React.ReactNode;
  children: React.ReactNode;
  onContinue: () => void;
  disabled?: boolean;
  continueLabel?: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up flex flex-col h-full">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 kk-brand-soft rounded-full text-[11px] font-bold kk-text-brand mb-4 self-start" style={{ backgroundColor: '#F3F0FF' }}>
        {label}
      </div>
      <h1 className="text-[24px] font-bold text-[#111827] tracking-tight leading-tight mb-2">{question}</h1>
      <p className="text-[13px] text-[#6B7280] mb-8">{hint}</p>
      <div className="mb-8">{children}</div>
      <div className="mt-auto">
        <button
          onClick={onContinue}
          disabled={disabled}
          className="w-full kk-brand text-white rounded-2xl py-4 font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-[0_8px_20px_rgba(123,97,255,0.25)] disabled:opacity-40 disabled:shadow-none" style={{ backgroundColor: '#7B61FF' }}
        >
          {continueLabel || <>继续 <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Goal Detail
// ═══════════════════════════════════════════════════════════════════
function GoalDetail({ goal, onBack, onAdjust, toggleGoalTask }) {
  const [showFuture, setShowFuture] = useState(false);
  const remaining = goal.totalDays - goal.currentDay + 1;
  const completed = goal.days.filter(d => d.is_completed).length;
  const pct = Math.round((completed / goal.totalDays) * 100);
  const todayDay = goal.days[goal.currentDay - 1];
  const futureDays = goal.days.slice(goal.currentDay);
  const pastDays = goal.days.slice(0, goal.currentDay - 1);

  // Detect "behind" — placeholder logic
  const isBehind = pastDays.filter(d => !d.is_completed).length >= 2;

  return (
    <div className="pb-32">
      {/* Hero */}
      <div className="kk-brand-grad text-white px-5 pt-14 pb-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #9D85FF 100%)' }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl" />
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-7 relative text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/15 backdrop-blur rounded-full text-[11px] font-semibold mb-3">
            <Target className="w-3 h-3" /> 倒数日目标
          </div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight mb-5">{goal.title}</h1>

          <div className="flex items-end gap-6 mb-5">
            <div>
              <div className="text-[64px] font-bold leading-none tabular-nums">{remaining}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wider mt-1">天后截止</div>
            </div>
            <div className="flex-1 pb-2">
              <div className="text-[12px] text-white/80 mb-2">完成 {completed}/{goal.totalDays} 天 · {pct}%</div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="text-[12px] text-white/70">截止 {fmtDate(goal.endDate)}</div>
        </div>
      </div>

      {/* Behind warning */}
      {isBehind && (
        <div className="px-5 pt-5">
          <button
            onClick={onAdjust}
            className="w-full kk-warn-soft border border-[#FECACA] rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition" style={{ backgroundColor: '#FEF2F2' }}
          >
            <div className="w-10 h-10 rounded-xl kk-danger flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EF4444' }}>
              <RotateCw className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-[13px] kk-text-danger-dark">⚠️ 你落后了 {pastDays.filter(d => !d.is_completed).length} 天</div>
              <div className="text-[11px] kk-text-warn-dark mt-0.5">让 AI 根据剩余 {remaining} 天重新拆解？</div>
            </div>
            <ChevronRight className="w-4 h-4 kk-text-danger-dark" />
          </button>
        </div>
      )}

      {/* Today's task */}
      <div className="px-5 pt-5">
        <div className="text-[11px] uppercase tracking-[0.1em] kk-text-brand font-bold mb-2">Today · Day {goal.currentDay}</div>
        <Card className="p-5 border-2 kk-border-brand/20">
          <div className="font-bold text-[18px] text-[#111827] mb-3">{todayDay.title}</div>
          <div className="space-y-3 mb-4">
            {todayDay.tasks.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <BigCheckbox checked={todayDay.is_completed} onChange={() => toggleGoalTask(goal.id, goal.currentDay - 1)} size={22} />
                <div className={`text-[14px] flex-1 pt-0.5 ${todayDay.is_completed ? 'line-through text-[#6B7280]' : 'text-[#111827]'}`}>{t}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[12px] text-[#6B7280] pt-3 border-t border-[#F3F4F6]">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {todayDay.estimated_time} 分钟</span>
            <span className="italic">"{todayDay.encouragement}"</span>
          </div>
        </Card>
      </div>

      {/* Past completed (compact) */}
      {pastDays.length > 0 && (
        <div className="px-5 pt-7">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#6B7280] font-bold mb-3">已完成</div>
          <div className="grid grid-cols-7 gap-1.5">
            {pastDays.map((d, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-semibold ${
                  d.is_completed ? 'kk-success text-white' : 'kk-danger-soft kk-text-danger'
                }`}
                title={d.title}
              >
                {d.is_completed ? <Check className="w-4 h-4" strokeWidth={3} /> : d.day_number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Future plan (collapsible) */}
      <div className="px-5 pt-7">
        <button
          onClick={() => setShowFuture(!showFuture)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#6B7280] font-bold">未来 {futureDays.length} 天</div>
          <ChevronRight className={`w-4 h-4 text-[#6B7280] transition-transform ${showFuture ? 'rotate-90' : ''}`} />
        </button>

        {showFuture && (
          <div className="space-y-2 animate-fade-in">
            {futureDays.map((d, i) => (
              <Card key={i} className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                    {d.day_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-[#111827] truncate">{d.title}</div>
                    <div className="text-[11px] text-[#6B7280]">{d.estimated_time} 分钟</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Checkin — with celebration
// ═══════════════════════════════════════════════════════════════════
function Checkin({ goals, habits, onBack, toggleGoalTask, toggleHabitCheckin }) {
  const [note, setNote] = useState('');
  const [mood, setMood] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const prevAllDoneRef = useRef(false);
  const toast = useToast();

  const todayItems = [];
  goals.forEach(g => {
    const d = g.days[g.currentDay - 1];
    if (d) todayItems.push({ kind: 'goal', goalId: g.id, dayIdx: g.currentDay - 1, day: d, parentTitle: g.title });
  });
  habits.forEach(h => {
    const c = h.checkins[h.currentDay - 1];
    if (c) todayItems.push({ kind: 'habit', habitId: h.id, dayIdx: h.currentDay - 1, day: c, parentTitle: h.title, streak: h.streak });
  });

  const completedCount = todayItems.filter(i => i.day.is_completed).length;
  const allDone = completedCount === todayItems.length && todayItems.length > 0;
  const totalStreak = Math.max(...habits.map(h => h.streak), 0);

  // Detect transition into all-done
  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setCelebrate(true);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  const handleToggle = (item) => {
    if (item.kind === 'goal') toggleGoalTask(item.goalId, item.dayIdx);
    else toggleHabitCheckin(item.habitId, item.dayIdx);
    if (!item.day.is_completed) toast.push('+1 任务完成');
  };

  return (
    <div className="px-5 pt-14 pb-32 relative">
      <div className="flex items-center justify-between mb-7">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border border-[#F3F4F6] flex items-center justify-center shadow-sm">
          <X className="w-4 h-4 text-[#6B7280]" />
        </button>
        <div className="text-center">
          <div className="text-[11px] text-[#6B7280] uppercase tracking-wider">{fmtDate(today)}</div>
          <div className="text-[14px] font-bold text-[#111827]">今日打卡</div>
        </div>
        <div className="w-10" />
      </div>

      {/* Top progress hero */}
      <div className="mb-6">
        <div className="text-[12px] text-[#6B7280] mb-1">完成进度</div>
        <div className="flex items-end justify-between mb-2">
          <div className="text-[40px] font-bold text-[#111827] tabular-nums leading-none">
            {completedCount}<span className="text-[24px] text-[#6B7280]">/{todayItems.length}</span>
          </div>
          <div className="text-[13px] font-semibold kk-text-brand">
            {Math.round((completedCount/todayItems.length)*100)}%
          </div>
        </div>
        <ProgressBar percent={(completedCount/todayItems.length)*100} height={10} />
      </div>

      {/* Items */}
      <div className="space-y-2.5 mb-6">
        {todayItems.map((item, i) => (
          <Card key={i} className={`p-4 transition-all ${item.day.is_completed ? 'kk-page' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <BigCheckbox checked={item.day.is_completed} onChange={() => handleToggle(item)} size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    item.kind === 'goal' ? 'kk-brand-soft kk-text-brand' : 'kk-amber-soft kk-text-amber'
                  }`}>
                    {item.kind === 'goal' ? <Target className="w-2.5 h-2.5" /> : <Repeat className="w-2.5 h-2.5" />}
                    {item.parentTitle}
                  </span>
                  {item.kind === 'habit' && (
                    <span className="text-[11px] kk-text-danger font-semibold flex items-center gap-0.5">
                      <Flame className="w-3 h-3" /> {item.streak}
                    </span>
                  )}
                </div>
                <div className={`font-bold text-[15px] ${item.day.is_completed ? 'line-through text-[#6B7280]' : 'text-[#111827]'}`}>
                  {item.day.title}
                </div>
                {item.kind === 'goal' && item.day.tasks && (
                  <ul className="mt-2 space-y-1">
                    {item.day.tasks.map((t, j) => (
                      <li key={j} className="text-[12px] text-[#6B7280] flex gap-1.5">
                        <span className="kk-text-brand mt-0.5">·</span> {t}
                      </li>
                    ))}
                  </ul>
                )}
                {item.kind === 'goal' && (
                  <div className="text-[11px] text-[#6B7280] italic mt-2">"{item.day.encouragement}"</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Mood + Note */}
      <Card className="p-4 mb-4">
        <div className="text-[12px] font-semibold text-[#374151] mb-3 flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5" /> 今天感觉如何？
        </div>
        <div className="flex justify-between mb-5">
          {['😞','😐','🙂','😊','🤩'].map((emoji, i) => (
            <button
              key={i}
              onClick={() => setMood(i)}
              className={`text-[28px] w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                mood === i ? 'kk-brand-soft scale-110' : 'hover:kk-page'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="text-[12px] font-semibold text-[#374151] mb-2 flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> 备注
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今天卡在哪？有什么想记录的？"
          rows={3}
          className="w-full kk-page rounded-xl px-3.5 py-3 text-[13px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#7B61FF]/20 resize-none"
        />
      </Card>

      <button
        onClick={onBack}
        className="w-full kk-brand text-white rounded-2xl py-4 font-semibold text-[15px] active:scale-[0.99] transition shadow-[0_8px_20px_rgba(123,97,255,0.25)]" style={{ backgroundColor: '#7B61FF' }}
      >
        保存今日打卡
      </button>

      {/* Celebration overlay */}
      {celebrate && (
        <Celebration
          totalStreak={totalStreak}
          onClose={() => setCelebrate(false)}
        />
      )}
    </div>
  );
}

function Celebration({ totalStreak, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center px-6 animate-fade-in">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-[24px] animate-float-up"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-30px',
              animationDelay: `${Math.random() * 0.6}s`,
              animationDuration: `${1.6 + Math.random()}s`
            }}
          >
            {['🎉','✨','🌟','💜','⭐','🎊'][i % 6]}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-7 w-full max-w-[340px] text-center relative animate-pop-in shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-full kk-success flex items-center justify-center mb-5 shadow-[0_12px_32px_rgba(34,197,94,0.4)] animate-pop-in" style={{ backgroundColor: '#22C55E' }}>
          <Check className="w-10 h-10 text-white" strokeWidth={3.5} />
        </div>

        <h2 className="text-[28px] font-bold text-[#111827] tracking-tight mb-2">今日完成 🎉</h2>
        <p className="text-[14px] text-[#6B7280] mb-5">所有今天的任务都搞定了。</p>

        <div className="kk-brand-grad rounded-2xl p-4 mb-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #9D85FF 100%)' }}>
          <div className="absolute -right-4 -top-4 text-[80px] opacity-20">🔥</div>
          <div className="text-[12px] uppercase tracking-wider opacity-80 mb-1 relative">连续打卡</div>
          <div className="text-[44px] font-bold leading-none tabular-nums relative">{totalStreak + 1}<span className="text-[20px] ml-1">天</span></div>
        </div>

        <button
          onClick={onClose}
          className="w-full kk-dark text-white rounded-2xl py-3.5 font-semibold text-[14px] active:scale-[0.98] transition" style={{ backgroundColor: '#1F2937' }}
        >
          继续保持 ✨
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Calendar — GitHub heatmap style
// ═══════════════════════════════════════════════════════════════════
function CalendarPage({ goals, habits }) {
  // Build daily completion map across last 12 weeks
  const dayMap: Record<string, { total: number; done: number }> = {};
  goals.forEach(g => g.days.forEach(d => {
    if (!dayMap[d.date]) dayMap[d.date] = { total: 0, done: 0 };
    dayMap[d.date].total += 1;
    if (d.is_completed) dayMap[d.date].done += 1;
  }));
  habits.forEach(h => h.checkins.forEach(c => {
    if (!dayMap[c.date]) dayMap[c.date] = { total: 0, done: 0 };
    dayMap[c.date].total += 1;
    if (c.is_completed) dayMap[c.date].done += 1;
  }));

  // 12 weeks, 7 days = 84 cells
  const weeks = 12;
  const cells = [];
  // Start from Sunday of (today - weeks*7) to today
  const start = addDays(today, -(weeks * 7) + 1);
  // Adjust to Monday
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const key = fmtFull(d);
    const data = dayMap[key];
    let level = 0;
    if (data) {
      const ratio = data.done / data.total;
      if (ratio === 1) level = 4;
      else if (ratio >= 0.66) level = 3;
      else if (ratio >= 0.33) level = 2;
      else if (ratio > 0) level = 1;
    }
    const isFuture = d > today;
    const isToday = fmtFull(d) === fmtFull(today);
    cells.push({ date: d, level, isFuture, isToday, total: data?.total || 0, done: data?.done || 0 });
  }

  // Stats
  const totalDone = Object.values(dayMap).filter(v => v.total > 0 && v.done === v.total).length;
  const monthCells = cells.filter(c => !c.isFuture && c.date.getMonth() === today.getMonth());
  const monthDone = monthCells.filter(c => c.level === 4).length;
  const monthRate = Math.round((monthDone / Math.max(monthCells.length, 1)) * 100);
  const totalStreak = Math.max(...habits.map(h => h.streak), 0);

  const levelColors = ['kk-cell-empty', 'kk-green-1', 'kk-green-2', 'kk-success', 'kk-green-4'];

  return (
    <div className="px-5 pt-14 pb-32">
      <h1 className="text-[28px] font-bold text-[#111827] tracking-tight mb-1">日历</h1>
      <p className="text-[13px] text-[#6B7280] mb-6">看你这一路走过的轨迹。</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] font-semibold mb-1.5">
            <Flame className="w-3 h-3 kk-text-danger" /> 连续
          </div>
          <div className="text-[24px] font-bold text-[#111827] tabular-nums leading-none">{totalStreak}<span className="text-[12px] text-[#6B7280] ml-1 font-medium">天</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] font-semibold mb-1.5">
            <Check className="w-3 h-3 kk-text-success" /> 本月完成
          </div>
          <div className="text-[24px] font-bold text-[#111827] tabular-nums leading-none">{monthDone}<span className="text-[12px] text-[#6B7280] ml-1 font-medium">天</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] font-semibold mb-1.5">
            <Trophy className="w-3 h-3 kk-text-brand" /> 完成率
          </div>
          <div className="text-[24px] font-bold text-[#111827] tabular-nums leading-none">{monthRate}<span className="text-[12px] text-[#6B7280] ml-1 font-medium">%</span></div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-bold text-[#111827]">活跃热力图</div>
          <div className="text-[11px] text-[#6B7280]">最近 12 周</div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1 min-w-max">
            {Array.from({ length: weeks }).map((_, w) => (
              <div key={w} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, d) => {
                  const cell = cells[w * 7 + d];
                  return (
                    <div
                      key={d}
                      className={`w-5 h-5 rounded-[5px] ${cell.isFuture ? 'bg-[#FAFAFA] opacity-50' : levelColors[cell.level]} ${cell.isToday ? 'ring-2 ring-[#7B61FF] ring-offset-1' : ''}`}
                      title={`${fmtFull(cell.date)} · ${cell.done}/${cell.total}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-[11px] text-[#6B7280]">
          <span>少</span>
          <div className="flex gap-1">
            {levelColors.map((bg, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${bg}`} />
            ))}
          </div>
          <span>多</span>
        </div>
      </Card>

      {/* Recent activity */}
      <div className="text-[11px] uppercase tracking-[0.1em] text-[#6B7280] font-bold mb-3">最近 7 天</div>
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(today, i - 6);
            const key = fmtFull(d);
            const data = dayMap[key];
            const ratio = data ? data.done / data.total : 0;
            const isToday = fmtFull(d) === fmtFull(today);
            return (
              <div key={i} className="text-center">
                <div className="text-[11px] text-[#6B7280] mb-1">{['日','一','二','三','四','五','六'][d.getDay()]}</div>
                <div className={`aspect-square rounded-xl flex items-center justify-center text-[12px] font-bold ${
                  ratio === 1 ? 'kk-success text-white' :
                  ratio > 0 ? 'kk-green-1 kk-text-success-dark' :
                  data ? 'kk-danger-soft kk-text-danger' :
                  'bg-[#F3F4F6] text-[#6B7280]'
                } ${isToday ? 'ring-2 ring-[#7B61FF] ring-offset-1' : ''}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Profile + Reminders
// ═══════════════════════════════════════════════════════════════════
function Profile({ onLogout, goals, habits, onNavReminders }) {
  return (
    <div className="px-5 pt-14 pb-32">
      <h1 className="text-[28px] font-bold text-[#111827] tracking-tight mb-6">个人</h1>

      <div className="kk-brand-grad text-white rounded-3xl p-5 mb-5 relative overflow-hidden shadow-[0_12px_32px_rgba(123,97,255,0.25)]" style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #9D85FF 100%)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-[22px] font-bold">S</div>
          <div>
            <div className="text-[20px] font-bold">Serena</div>
            <div className="text-[12px] opacity-80">serena@example.com</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15 relative">
          <div>
            <div className="text-[22px] font-bold tabular-nums">{goals.length}</div>
            <div className="text-[11px] opacity-80">目标</div>
          </div>
          <div>
            <div className="text-[22px] font-bold tabular-nums">{habits.length}</div>
            <div className="text-[11px] opacity-80">习惯</div>
          </div>
          <div>
            <div className="text-[22px] font-bold tabular-nums">12</div>
            <div className="text-[11px] opacity-80">总打卡</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { icon: Bell, label: '提醒设置', sub: '每日 · 守护 · AI 落后预警', onClick: onNavReminders },
          { icon: Settings, label: '偏好设置', sub: '主题 · 语言 · 时区' },
          { icon: MessageCircle, label: '反馈与帮助' },
        ].map((item, i) => (
          <Card key={i} className="p-4" onClick={item.onClick}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl kk-brand-soft flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F0FF' }}>
                <item.icon className="w-4 h-4 kk-text-brand" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[14px] text-[#111827]">{item.label}</div>
                {item.sub && <div className="text-[11px] text-[#6B7280] mt-0.5">{item.sub}</div>}
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B7280]" />
            </div>
          </Card>
        ))}
        <button
          onClick={onLogout}
          className="w-full bg-white border border-[#F3F4F6] rounded-2xl p-4 text-[14px] font-semibold kk-text-danger mt-4 active:scale-[0.99] transition"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full p-0.5 transition flex-shrink-0 ${on ? 'kk-brand' : 'bg-[#D1D5DB]'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function ReminderRow({
  icon: Icon,
  title,
  desc,
  on,
  setOn,
  badge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  on: boolean;
  setOn: (value: boolean) => void;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl kk-brand-soft flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F0FF' }}>
          <Icon className="w-4 h-4 kk-text-brand" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="font-semibold text-[14px] text-[#111827]">{title}</div>
            {badge && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded kk-brand-soft kk-text-brand" style={{ backgroundColor: '#F3F0FF' }}>{badge}</span>}
          </div>
          <div className="text-[12px] text-[#6B7280] leading-relaxed">{desc}</div>
        </div>
        <Toggle on={on} onChange={setOn} />
      </div>
      {on && children && (
        <div className="border-t border-[#F3F4F6] p-4 bg-[#FAFAFB]">{children}</div>
      )}
    </Card>
  );
}

function ReminderSettings({ onBack, habits, updateHabit }) {
  const [dailyOn, setDailyOn] = useState(true);
  const [dailyTime, setDailyTime] = useState('20:00');
  const [streakOn, setStreakOn] = useState(true);
  const [streakCutoff, setStreakCutoff] = useState('22:00');
  const [behindOn, setBehindOn] = useState(true);
  const [behindThr, setBehindThr] = useState(2);
  const [encOn, setEncOn] = useState(true);
  const [encTime, setEncTime] = useState('09:00');
  const [weeklyOn, setWeeklyOn] = useState(false);

  const update = (id, patch) => updateHabit(id, patch);

  return (
    <div className="px-5 pt-14 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border border-[#F3F4F6] flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-4 h-4 text-[#6B7280]" />
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">提醒</h1>
          <p className="text-[12px] text-[#6B7280]">让 App 在合适的时间找你</p>
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-[0.1em] text-[#6B7280] font-bold mb-3">核心提醒</div>
      <div className="space-y-2.5 mb-6">
        <ReminderRow icon={Bell} title="每日打卡提醒" desc="到点提醒今天还有几件事没完成。" on={dailyOn} setOn={setDailyOn}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">提醒时间</span>
            <input type="time" value={dailyTime} onChange={(e) => setDailyTime(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[15px] font-semibold text-[#111827] focus:outline-none focus:kk-border-brand tabular-nums" />
          </div>
        </ReminderRow>

        <ReminderRow icon={Flame} title="连续打卡守护" desc="到点未打卡时推一条避免断 streak。" on={streakOn} setOn={setStreakOn} badge="推荐">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">兜底时间</span>
            <input type="time" value={streakCutoff} onChange={(e) => setStreakCutoff(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[15px] font-semibold text-[#111827] focus:outline-none focus:kk-border-brand tabular-nums" />
          </div>
        </ReminderRow>

        <ReminderRow icon={RotateCw} title="落后预警" desc="连续落后时 AI 主动建议重新调整计划。" on={behindOn} setOn={setBehindOn} badge="AI">
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 5].map(n => (
              <button key={n} onClick={() => setBehindThr(n)}
                className={`py-2.5 rounded-xl text-[13px] font-bold transition ${
                  behindThr === n ? 'kk-brand text-white' : 'bg-white border border-[#E5E7EB] text-[#6B7280]'
                }`}>{n} 天</button>
            ))}
          </div>
        </ReminderRow>
      </div>

      <div className="text-[11px] uppercase tracking-[0.1em] text-[#6B7280] font-bold mb-3">柔和提醒</div>
      <div className="space-y-2.5 mb-6">
        <ReminderRow icon={Sparkles} title="早晨鼓励语" desc="推送 AI 准备的鼓励语，作为开启的小仪式。" on={encOn} setOn={setEncOn}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">推送时间</span>
            <input type="time" value={encTime} onChange={(e) => setEncTime(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[15px] font-semibold text-[#111827] focus:outline-none focus:kk-border-brand tabular-nums" />
          </div>
        </ReminderRow>
        <ReminderRow icon={TrendingUp} title="每周复盘" desc="周末推一条本周完成情况和下周展望。" on={weeklyOn} setOn={setWeeklyOn} />
      </div>

      <div className="text-[11px] uppercase tracking-[0.1em] text-[#6B7280] font-bold mb-3">每个习惯</div>
      <div className="space-y-2 mb-6">
        {habits.map(h => {
          const Icon = h.icon;
          return (
            <Card key={h.id} className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg kk-brand-soft flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F3F0FF' }}>
                  <Icon className="w-4 h-4 kk-text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-[#111827] truncate">{h.title}</div>
                  <div className="text-[11px] text-[#6B7280]">Day {h.currentDay}/21</div>
                </div>
                {h.reminderEnabled && (
                  <input type="time" value={h.reminderTime} onChange={(e) => update(h.id, { reminderTime: e.target.value })}
                    className="kk-page rounded-lg px-2.5 py-1.5 text-[14px] font-semibold text-[#111827] focus:outline-none tabular-nums" />
                )}
                <Toggle on={h.reminderEnabled} onChange={(v) => update(h.id, { reminderEnabled: v })} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 kk-dark-grad border-0 text-white" style={{ background: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[13px] mb-1">在 iPhone 收到推送？</div>
            <div className="text-[11px] opacity-80 leading-relaxed">
              先把 App"添加到主屏幕"，再从主屏图标打开一次，才能授权推送。
              <span className="kk-text-soft-purple"> 需 iOS 16.4+。</span>
            </div>
            <button className="mt-2 text-[11px] kk-text-soft-purple font-semibold">查看添加教程 →</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Bottom Nav
// ═══════════════════════════════════════════════════════════════════
function BottomNav({ page, onNav }) {
  const items = [
    { id: 'dashboard', icon: Home, label: '今天' },
    { id: 'calendar', icon: CalIcon, label: '日历' },
    { id: 'create', icon: Plus, primary: true },
    { id: 'profile', icon: User, label: '我' },
  ];
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 pb-5 pt-2 z-50 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-xl border border-[#F3F4F6] rounded-full p-1.5 flex items-center justify-around shadow-[0_12px_40px_rgba(17,24,39,0.08)] pointer-events-auto">
        {items.map(item => {
          const Icon = item.icon;
          if (item.primary) {
            return (
              <button
                key={item.id}
                onClick={() => onNav('create')}
                className="w-12 h-12 rounded-full kk-brand text-white flex items-center justify-center active:scale-90 transition shadow-[0_8px_20px_rgba(123,97,255,0.4)]" style={{ backgroundColor: '#7B61FF' }}
              >
                <Icon className="w-5 h-5" strokeWidth={2.6} />
              </button>
            );
          }
          const active = page === item.id ||
            (item.id === 'dashboard' && page === 'checkin') ||
            (item.id === 'profile' && page === 'reminders');
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition ${active ? 'kk-text-brand' : 'text-[#6B7280]'}`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-[11px] mt-0.5 font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// iOS Install Banner — shown only when in Safari (not standalone)
// ═══════════════════════════════════════════════════════════════════
function IOSInstallBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 pb-5 pt-2 z-[80]">
      <div
        className="kk-card rounded-3xl p-4 shadow-[0_20px_60px_rgba(17,24,39,0.15)] border border-[#E5E7EB]"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#7B61FF' }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] text-[#111827]">添加到主屏幕</div>
            <div className="text-[12px] text-[#6B7280] leading-relaxed mt-0.5">
              像 App 一样使用，还能收到推送提醒。
            </div>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] p-1 -m-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[12px] text-[#374151] space-y-1.5 pl-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F3F0FF] text-[#7B61FF] text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</span>
            <span>点底部 <span className="font-semibold">分享</span> 按钮 (□↑)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F3F0FF] text-[#7B61FF] text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</span>
            <span>选 <span className="font-semibold">添加到主屏幕</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F3F0FF] text-[#7B61FF] text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
            <span>从主屏图标打开</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// App Root
// ═══════════════════════════════════════════════════════════════════
function AppInner() {
  const [page, setPage] = useState('login');
  const [goals, setGoals] = useState(initialGoals);
  const [habits, setHabits] = useState(initialHabits);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [dataSource, setDataSource] = useState<'mock' | 'supabase'>('mock');
  const toast = useToast();

  const toggleGoalTask = (goalId, dayIdx) => {
    const goal = goals.find(g => g.id === goalId);
    const day = goal?.days?.[dayIdx];
    const nextCompleted = !day?.is_completed;
    setGoals(gs => gs.map(g => g.id !== goalId ? g : {
      ...g, days: g.days.map((d, i) => i !== dayIdx ? d : { ...d, is_completed: !d.is_completed })
    }));
    if (dataSource === 'supabase' && day) {
      updateGoalTaskCompletion(goalId, day.day_number, nextCompleted).catch((err) => {
        console.warn('Failed to update goal task:', err);
        toast.push('同步失败，稍后再试', 'danger');
      });
    }
  };
  const toggleHabitCheckin = (habitId, dayIdx) => {
    const habit = habits.find(h => h.id === habitId);
    const checkin = habit?.checkins?.[dayIdx];
    const nextCompleted = !checkin?.is_completed;
    setHabits(hs => hs.map(h => h.id !== habitId ? h : {
      ...h, checkins: h.checkins.map((c, i) => i !== dayIdx ? c : { ...c, is_completed: !c.is_completed })
    }));
    if (dataSource === 'supabase' && checkin) {
      updateHabitCheckinCompletion(habitId, checkin.day_number, nextCompleted).catch((err) => {
        console.warn('Failed to update habit checkin:', err);
        toast.push('同步失败，稍后再试', 'danger');
      });
    }
  };

  const updateHabitReminderLocal = (id, patch) => {
    setHabits(hs => hs.map(h => h.id === id ? { ...h, ...patch } : h));
    if (dataSource === 'supabase') {
      updateHabitReminder(id, patch).catch((err) => {
        console.warn('Failed to update habit reminder:', err);
        toast.push('提醒同步失败', 'danger');
      });
    }
  };

  const adjustGoalPlan = async (goal) => {
    toast.push('AI 重新调整中…', 'info');
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'adjust',
          kind: 'goal',
          title: goal.title,
          description: goal.description,
          current: `当前是第 ${goal.currentDay} 天，已完成 ${goal.days.filter(d => d.is_completed).length} 天。`,
          endDate: fmtFull(goal.endDate),
          dailyTime: goal.dailyTime,
          existingPlan: goal.days,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || payload.error || 'AI 重新调整失败');
      setGoals(gs => gs.map(g => g.id !== goal.id ? g : {
        ...g,
        days: payload.plan.days.map((day, index) => ({
          day_number: day.day_number,
          date: fmtFull(addDays(today, index)),
          title: day.title,
          tasks: day.tasks,
          estimated_time: day.estimated_time,
          encouragement: day.encouragement,
          is_completed: false,
          note: '',
        })),
        totalDays: payload.plan.days.length,
        currentDay: 1,
      }));
      toast.push('计划已重新调整');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 重新调整失败';
      toast.push(message, 'danger');
    }
  };

  const syncDailyData = (cancelledRef?: { current: boolean }) =>
    loadDailyData()
      .then((result) => {
        if (cancelledRef?.current || result.status !== 'loaded') return;
        setGoals(result.goals.length ? result.goals : initialGoals);
        setHabits(result.habits.length ? result.habits : initialHabits);
        setDataSource('supabase');
      })
      .catch((err) => {
        console.warn('Supabase load failed, using local demo data:', err);
        toast.push('Supabase 暂不可用，已显示示例数据', 'info');
      });

  useEffect(() => {
    const cancelledRef = { current: false };
    syncDailyData(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, []);


  // Register service worker (PWA) and detect iOS standalone mode
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) =>
        console.warn('SW registration failed:', err)
      );
    }
    // Detect: is iOS Safari, NOT in standalone mode → show install banner
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) {
      // delay so it doesn't flash on first render
      const t = setTimeout(() => setShowInstallPrompt(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  return (
    <div
      className="min-h-screen kk-page text-[#111827]"
      style={{
        backgroundColor: '#DBEAFE',
        color: '#111827',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes check-pop { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
        @keyframes check-draw { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pop-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-110vh) rotate(540deg); opacity: 0; }
        }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes slide-up { 0% { transform: translateY(16px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes pulse-soft { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.02); } }
        @keyframes toast-in {
          0% { transform: translateY(20px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-check-pop { animation: check-pop 0.4s ease-out; }
        .animate-check-draw { animation: check-draw 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-pop-in { animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-float-up { animation: float-up 1.8s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pulse-soft { animation: pulse-soft 1.4s ease-in-out infinite; }
        .animate-toast-in { animation: toast-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }

        /* Form element fixes — critical for visibility */
        input, textarea, select {
          font-family: inherit;
          color: #111827;
          color-scheme: light;
        }
        button { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; opacity: 1; }
        /* Prevent iOS Safari auto-zoom on focus (must be ≥16px) */
        input[type="text"], input[type="email"], input[type="password"],
        input[type="time"], input[type="date"], input[type="number"],
        textarea, select { font-size: 16px; }
        /* Native time/date controls render dark on iOS by default — force light text mode */
        input[type="time"], input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
          background-color: white;
        }

        /* === Guaranteed-render brand color classes === */
        /* These bypass Tailwind arbitrary value rendering issues */
        .kk-page { background-color: #DBEAFE; }
        .kk-card { background-color: #FFFFFF; }
        .kk-brand { background-color: #7B61FF; }
        .kk-brand-grad { background: linear-gradient(135deg, #7B61FF 0%, #9D85FF 100%); }
        .kk-dark { background-color: #1F2937; }
        .kk-dark-grad { background: linear-gradient(135deg, #1F2937 0%, #374151 100%); }
        .kk-success { background-color: #22C55E; }
        .kk-danger { background-color: #EF4444; }
        .kk-brand-soft { background-color: #F3F0FF; }
        .kk-success-soft { background-color: #DCFCE7; }
        .kk-danger-soft { background-color: #FEE2E2; }
        .kk-amber-soft { background-color: #FEF3C7; }
        .kk-warn-soft { background-color: #FEF2F2; }
        .kk-text-brand { color: #7B61FF; }
        .kk-text-success { color: #22C55E; }
        .kk-text-danger { color: #EF4444; }
        .kk-text-amber { color: #D97706; }
        .kk-text-success-dark { color: #15803D; }
        .kk-text-danger-dark { color: #991B1B; }
        .kk-text-warn-dark { color: #B91C1C; }
        .kk-text-soft-purple { color: #A78BFA; }
        .kk-border-brand { border-color: #7B61FF; }
        .kk-green-1 { background-color: #86EFAC; }
        .kk-green-2 { background-color: #4ADE80; }
        .kk-green-3 { background-color: #22C55E; }
        .kk-green-4 { background-color: #15803D; }
        .kk-cell-empty { background-color: #E5E7EB; }
        .kk-cell-future { background-color: #F3F4F6; }
      ` }} />

      <div
        className="max-w-[440px] mx-auto kk-page min-h-screen relative shadow-[0_0_60px_rgba(17,24,39,0.06)]"
        style={{ backgroundColor: '#DBEAFE' }}
      >
        {page === 'login' && <Login onLogin={() => { syncDailyData(); setPage('dashboard'); }} />}
        {page === 'dashboard' && (
          <Dashboard
            goals={goals} habits={habits}
            onOpenGoal={(id) => { setSelectedGoalId(id); setPage('goalDetail'); }}
            onOpenCheckin={() => setPage('checkin')}
            onCreate={() => setPage('create')}
            toggleGoalTask={(gid, di) => { toggleGoalTask(gid, di); }}
            toggleHabitCheckin={(hid, di) => { toggleHabitCheckin(hid, di); }}
          />
        )}
        {page === 'create' && (
          <CreateWizard
            onClose={() => setPage('dashboard')}
            onDone={() => { toast.push('已创建 ✨'); setPage('dashboard'); }}
          />
        )}
        {page === 'goalDetail' && selectedGoal && (
          <GoalDetail
            goal={selectedGoal}
            onBack={() => setPage('dashboard')}
            onAdjust={() => adjustGoalPlan(selectedGoal)}
            toggleGoalTask={toggleGoalTask}
          />
        )}
        {page === 'checkin' && (
          <Checkin
            goals={goals} habits={habits}
            onBack={() => setPage('dashboard')}
            toggleGoalTask={toggleGoalTask}
            toggleHabitCheckin={toggleHabitCheckin}
          />
        )}
        {page === 'calendar' && <CalendarPage goals={goals} habits={habits} />}
        {page === 'profile' && (
          <Profile
            onLogout={() => {
              signOut().catch((err) => console.warn('Sign out failed:', err));
              setPage('login');
              setDataSource('mock');
            }}
            goals={goals} habits={habits}
            onNavReminders={() => setPage('reminders')}
          />
        )}
        {page === 'reminders' && (
          <ReminderSettings onBack={() => setPage('profile')} habits={habits} updateHabit={updateHabitReminderLocal} />
        )}

        {page !== 'login' && page !== 'create' && <BottomNav page={page} onNav={setPage} />}
        {showInstallPrompt && (
          <IOSInstallBanner onClose={() => setShowInstallPrompt(false)} />
        )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
