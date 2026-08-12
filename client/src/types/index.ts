export interface Column {
  id: string;
  title: string;
  order: number;
  emoji: string;
  accentColor: string;
}

export type PriorityLevel = 'highest' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: string;
  priority: PriorityLevel;
  pomodoroMinutes: number;
  order: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  scheduledTime: number | null;
  startTime: number | null;
  endTime: number | null;
}

export interface PomodoroSession {
  id: number;
  taskId: string | null;
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

export type StatsViewRange = 'day' | 'week' | 'month' | 'year' | 'all';

export interface FocusTimeRecord {
  uuid: string;
  dayNum: number;
  endTime: number;
  name: string;
  comment: string;
  pauseEndTime: number;
  pauseStartTime: number;
  pauseTotalTime: number;
  startTime: number;
  state: number;
  type: number;
  timeZone: number;
  userId: number;
  createTime: number;
  updateTime: number;
  isDeleted: number;
  scheduledTime: number;
}

export interface FocusStats {
  totalMinutes: number;
  totalSessions: number;
  completedSessions: number;
  streakDays: number;
  dailyMinutes: Record<string, number>;
  taskBreakdown: Record<string, { name: string; minutes: number; sessions: number }>;
  longestSession: { duration: number; name: string; date: string } | null;
  avgDailyMinutes: number;
}

export interface StatsCache {
  records: FocusTimeRecord[];
  lastFetchTime: number;
  viewRange: StatsViewRange;
  stats: FocusStats;
}

export interface User {
  id: number;
  email: string;
  phone: string;
  nickname: string;
  avatarUrl: string;
  school: string;
  registerTime: number;
  vipType: number;
  userType: number;
  expiredTime: number;
  lastFocusTimeId: number;
  lastFocusTimeUuid: string;
  lastFocusTimeCreateTime: number;
  secret: number;
  signature: string;
  status: number;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TodoListDTO {
  uuid: string;
  createTime: number;
  decoration: string;
  isTrash: number;
  name: string;
  updateTime: number;
  userId: number;
  reorder: number;
  isDeleted: number;
  type: number;
  newTodoItemName: string;
}

export interface TodoItemDTO {
  uuid: string;
  createTime: number;
  name: string;
  comment: string;
  priority: number;
  state: number;
  todoListUuid: string;
  updateTime: number;
  reorder: number;
  isDeleted: number;
  scheduledTime: number;
  checkedTime: number;
  seriesUuid: string;
  occurrenceIndex: number;
  occurrenceTime: number;
  endTime: number;
  isTrash: number;
  startTime: number;
  type: number;
  userId: number;
  imageUrl: string;
  count: number;
}
