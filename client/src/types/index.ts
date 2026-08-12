export interface Column {
  id: number;
  title: string;
  order: number;
  emoji: string;
  accentColor: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  columnId: number;
  priority: 'high' | 'medium' | 'low';
  pomodoroMinutes: number;
  order: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PomodoroSession {
  id: number;
  taskId: number | null;
  taskTitle: string;
  duration: number;
  completed: boolean;
  startedAt: string;
  finishedAt: string | null;
  mode: 'focus' | 'break' | 'free';
}

export interface DailyStat {
  date: string;
  minutes: number;
}

export interface Summary {
  totalMinutes: number;
  totalSessions: number;
  streakDays: number;
  todayMinutes: number;
}
