export type GeoStatus = "idle" | "loading" | "ready" | "error";

export type GeoInfo = {
  accuracy?: number;
  updatedAt?: Date;
  error?: string;
  distance?: number;
  inside?: boolean;
};

export type Role = "admin" | "staff" | "manager" | "support";

export type PayInfo = {
  type: "daily" | "monthly" | "hourly";
  amount: number;
  note?: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
  externalId?: string;
  canPunch: boolean;
  shiftStart: string;
  shiftEnd: string;
  workDays: number[];
  pay?: PayInfo;
  isTest?: boolean;
};

export type Task = {
  id: string;
  title: string;
  points: number;
  active: boolean;
};

export type ScheduleEntry = {
  title: string;
  time: string;
  people: string[];
  note?: string;
  tone: "work" | "manager" | "cleaning";
};

export type TaskCompletion = {
  id: string;
  taskId: string;
  userId: string;
  date: string;
};

export type TimeOffRequest = {
  id: string;
  userId: string;
  date: string;
  status: "pending" | "approved" | "denied";
  note?: string;
  createdAt: string;
};

export type PaymentStatus = "planned" | "paid";

export type PaymentKind = "salary" | "daily" | "bonus" | "adjustment";

export type PaymentRecord = {
  id: string;
  userId: string;
  date: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  kind: PaymentKind;
  note?: string;
  createdAt: string;
  externalRef?: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type Settings = {
  shiftStart: string;
  shiftEnd: string;
  toleranceMinutes: number;
  overtimeAfter: string;
  locale: string;
  currency: string;
  timezone: string;
  payrollCycleStartDay: number;
  payrollCycleLengthDays: number;
  geofenceName: string;
  geofencePlusCode: string;
  geofenceLat: number;
  geofenceLng: number;
  geofenceRadius: number;
  cleaningDay: number;
  cleaningStart: string;
  cleaningEnd: string;
  cleaningNote: string;
  cleaningParticipants: string[];
  minStaff: number;
  maxStaff: number;
  minWageMonthly: number;
  minWageHours: number;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  employees: Employee[];
  settings: Settings;
  tasks: Task[];
  completions: TaskCompletion[];
  timeOffRequests: TimeOffRequest[];
  payments: PaymentRecord[];
  punchRecords: PunchRecord[];
};

export type Session =
  | { type: "admin"; adminId: string }
  | { type: "staff"; orgId: string; employeeId: string };

export type PunchRecord = {
  id: string;
  userId: string;
  startAt: string;
  endAt?: string;
  closedBy?: "manual" | "geofence";
};

export type AppData = {
  adminUsers: AdminUser[];
  organizations: Organization[];
  currentOrgId: string | null;
};

export type ShiftNoticeTone = "default" | "success" | "error";

export type ReportRange = "week" | "month" | "30d";

export const STORAGE_KEY = "ponto-vivo-data-v1";
export const SESSION_KEY = "ponto-vivo-session-v1";
export const APP_STATE_KEY = "primary";

export const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

export const DEFAULT_SETTINGS: Settings = {
  shiftStart: "16:00",
  shiftEnd: "22:00",
  toleranceMinutes: 5,
  overtimeAfter: "22:00",
  locale: "pt-BR",
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  payrollCycleStartDay: 1,
  payrollCycleLengthDays: 30,
  geofenceName: "VH89+92 Teresopolis, Alagoinhas - BA",
  geofencePlusCode: "VH89+92",
  geofenceLat: -12.1340625,
  geofenceLng: -38.4324375,
  geofenceRadius: 120,
  cleaningDay: 6,
  cleaningStart: "09:00",
  cleaningEnd: "12:00",
  cleaningNote: "2-3h (1x/semana, a combinar)",
  cleaningParticipants: ["ayra", "nathyeli"],
  minStaff: 2,
  maxStaff: 4,
  minWageMonthly: 1621,
  minWageHours: 220,
};

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "admin",
    name: "Henrique Admin",
    email: "admin@empresa.com",
    role: "admin",
    token: "admin-hq",
    canPunch: false,
    shiftStart: "08:00",
    shiftEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
  },
  {
    id: "ayra",
    name: "Ayra",
    email: "ayra@empresa.com",
    role: "staff",
    token: "ayra-2026",
    canPunch: true,
    shiftStart: "16:00",
    shiftEnd: "22:00",
    workDays: [3, 4, 5, 6, 0],
    pay: {
      type: "daily",
      amount: 55,
      note: "Escala 5:2 (folga seg/ter)",
    },
  },
  {
    id: "nathyeli",
    name: "Nathyeli",
    email: "nathyeli@empresa.com",
    role: "staff",
    token: "nathyeli-2026",
    canPunch: true,
    shiftStart: "16:00",
    shiftEnd: "22:00",
    workDays: [5, 6, 0, 1, 2],
    pay: {
      type: "daily",
      amount: 55,
      note: "Escala 5:2 (folga qua/qui)",
    },
  },
  {
    id: "mariza",
    name: "Mariza Santos",
    email: "mariza@empresa.com",
    role: "manager",
    token: "mariza-gerente",
    canPunch: false,
    shiftStart: "08:00",
    shiftEnd: "18:00",
    workDays: [4, 5, 6, 0, 1],
    pay: {
      type: "monthly",
      amount: 1500,
      note: "Ajuste previsto para R$ 1600 (a confirmar). Diarias extras quando necessario.",
    },
  },
  {
    id: "bezinha",
    name: "Bezinha",
    email: "bezinha@empresa.com",
    role: "support",
    token: "bezinha-2026",
    canPunch: false,
    shiftStart: "16:00",
    shiftEnd: "22:00",
    workDays: [2, 3],
    pay: {
      type: "daily",
      amount: 70,
      note: "Cobre ter/qua quando Mariza folga",
    },
  },
  {
    id: "henrique-teste",
    name: "Henrique Teste",
    email: "teste@empresa.com",
    role: "staff",
    token: "henrique-teste",
    canPunch: true,
    shiftStart: "16:00",
    shiftEnd: "22:00",
    workDays: [1, 2, 3, 4, 5],
    isTest: true,
  },
];

export const DEFAULT_TASKS: Task[] = [
  { id: "task-1", title: "Limpeza rapida do setor", points: 10, active: true },
  { id: "task-2", title: "Reposicao de estoque", points: 8, active: true },
  { id: "task-3", title: "Atendimento premium", points: 12, active: true },
];

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: "admin-1",
    name: "Admin Principal",
    email: "admin@empresa.com",
    password: "admin123",
  },
];

export const DEFAULT_ORG: Organization = {
  id: "org-principal",
  name: "Empresa Principal",
  slug: "empresa-principal",
  employees: DEFAULT_EMPLOYEES,
  settings: DEFAULT_SETTINGS,
  tasks: DEFAULT_TASKS,
  completions: [],
  timeOffRequests: [],
  payments: [],
  punchRecords: [],
};

export const DEFAULT_DATA: AppData = {
  adminUsers: DEFAULT_ADMIN_USERS,
  organizations: [DEFAULT_ORG],
  currentOrgId: DEFAULT_ORG.id,
};

export const formatCurrency = (
  value: number,
  locale: string = "pt-BR",
  currency: string = "BRL"
) =>
  value.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });

export const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

export const getMinutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toRadians = (value: number) => (value * Math.PI) / 180;

export const getDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const earthRadius = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const getRangeStart = (range: ReportRange) => {
  const now = new Date();
  const start = new Date(now);
  if (range === "week") {
    const day = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === "30d") {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const formatWorkDays = (days: number[]) => {
  if (!days.length) {
    return "Sem escala";
  }
  return days
    .slice()
    .sort()
    .map((day) => WEEK_LABELS[(day + 6) % 7])
    .join(", ");
};

export const buildScheduleEntries = (
  weekday: number,
  employees: Employee[],
  settings: Settings
): ScheduleEntry[] => {
  const entries: ScheduleEntry[] = [];

  if (settings.cleaningDay === weekday) {
    const cleaningPeople = employees
      .filter((employee) => settings.cleaningParticipants.includes(employee.id))
      .map((employee) => employee.name);

    entries.push({
      title: "Limpeza geral",
      time: `${settings.cleaningStart}-${settings.cleaningEnd}`,
      people: cleaningPeople,
      note: settings.cleaningNote,
      tone: "cleaning",
    });
  }

  const shiftWorkers = employees.filter(
    (employee) =>
      employee.role !== "admin" &&
      employee.role !== "manager" &&
      employee.workDays.includes(weekday)
  );

  if (shiftWorkers.length) {
    entries.push({
      title: "Turno da equipe",
      time: `${settings.shiftStart}-${settings.shiftEnd}`,
      people: shiftWorkers.map((employee) => employee.name),
      tone: "work",
    });
  }

  const manager = employees.find(
    (employee) => employee.role === "manager" && employee.workDays.includes(weekday)
  );

  if (manager) {
    entries.push({
      title: "Gerencia (sem ponto)",
      time: "Escala gerente",
      people: [manager.name],
      tone: "manager",
    });
  }

  return entries;
};

export const getDayType = (
  weekday: number,
  profile: Employee | null,
  employees: Employee[],
  settings: Settings
) => {
  if (profile) {
    return profile.workDays.includes(weekday) ? "work" : "off";
  }
  return buildScheduleEntries(weekday, employees, settings).length ? "work" : "off";
};

export const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);

export const generateToken = (base: string) => {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
};

export const generateId = (base: string) => `${base}-${Date.now().toString(36)}`;

export const normalizeOrg = (
  org: Partial<Organization>,
  fallbackId: string,
  fallbackName: string
): Organization => {
  const id = org.id || fallbackId || generateId("org");
  const name = org.name?.trim() || fallbackName;
  const slug = org.slug?.trim() || createSlug(name) || id;

  return {
    id,
    name,
    slug,
    employees: Array.isArray(org.employees) ? org.employees : DEFAULT_EMPLOYEES,
    settings: { ...DEFAULT_SETTINGS, ...(org.settings ?? {}) },
    tasks: Array.isArray(org.tasks) ? org.tasks : DEFAULT_TASKS,
    completions: Array.isArray(org.completions) ? org.completions : [],
    timeOffRequests: Array.isArray(org.timeOffRequests) ? org.timeOffRequests : [],
    payments: Array.isArray(org.payments) ? org.payments : [],
    punchRecords: Array.isArray(org.punchRecords) ? org.punchRecords : [],
  };
};
