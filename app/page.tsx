"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GeoStatus = "idle" | "loading" | "ready" | "error";

type GeoInfo = {
  accuracy?: number;
  updatedAt?: Date;
  error?: string;
  distance?: number;
  inside?: boolean;
};

type Role = "admin" | "staff" | "manager" | "support";

type PayInfo = {
  type: "daily" | "monthly";
  amount: number;
  note?: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
  canPunch: boolean;
  shiftStart: string;
  shiftEnd: string;
  workDays: number[];
  pay?: PayInfo;
  isTest?: boolean;
};

type Task = {
  id: string;
  title: string;
  points: number;
  active: boolean;
};

type ScheduleEntry = {
  title: string;
  time: string;
  people: string[];
  note?: string;
  tone: "work" | "manager" | "cleaning";
};

type TaskCompletion = {
  id: string;
  taskId: string;
  userId: string;
  date: string;
};

type TimeOffRequest = {
  id: string;
  userId: string;
  date: string;
  status: "pending" | "approved" | "denied";
  note?: string;
  createdAt: string;
};

type PaymentStatus = "planned" | "paid";

type PaymentKind = "salary" | "daily" | "bonus" | "adjustment";

type PaymentRecord = {
  id: string;
  userId: string;
  date: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  kind: PaymentKind;
  note?: string;
  createdAt: string;
};

type PunchRecord = {
  id: string;
  userId: string;
  startAt: string;
  endAt?: string;
  closedBy?: "manual" | "geofence";
};

type Settings = {
  shiftStart: string;
  shiftEnd: string;
  toleranceMinutes: number;
  overtimeAfter: string;
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
};

type AppData = {
  employees: Employee[];
  settings: Settings;
  tasks: Task[];
  completions: TaskCompletion[];
  timeOffRequests: TimeOffRequest[];
  payments: PaymentRecord[];
  punchRecords: PunchRecord[];
};

type ShiftNoticeTone = "default" | "success" | "error";

type ReportRange = "week" | "month" | "30d";

const STORAGE_KEY = "ponto-vivo-data-v1";

const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const DEFAULT_SETTINGS: Settings = {
  shiftStart: "16:00",
  shiftEnd: "22:00",
  toleranceMinutes: 5,
  overtimeAfter: "22:00",
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
};

const DEFAULT_EMPLOYEES: Employee[] = [
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

const DEFAULT_TASKS: Task[] = [
  { id: "task-1", title: "Limpeza rapida do setor", points: 10, active: true },
  { id: "task-2", title: "Reposicao de estoque", points: 8, active: true },
  { id: "task-3", title: "Atendimento premium", points: 12, active: true },
];

const DEFAULT_DATA: AppData = {
  employees: DEFAULT_EMPLOYEES,
  settings: DEFAULT_SETTINGS,
  tasks: DEFAULT_TASKS,
  completions: [],
  timeOffRequests: [],
  payments: [],
  punchRecords: [],
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

const getMinutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (
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

const getRangeStart = (range: ReportRange) => {
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

const formatWorkDays = (days: number[]) => {
  if (!days.length) {
    return "Sem escala";
  }
  return days
    .slice()
    .sort()
    .map((day) => WEEK_LABELS[(day + 6) % 7])
    .join(", ");
};

const buildScheduleEntries = (
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
    (employee) =>
      employee.role === "manager" && employee.workDays.includes(weekday)
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

const getDayType = (
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

const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);

const generateToken = (base: string) => {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
};

const generateId = (base: string) => `${base}-${Date.now().toString(36)}`;

export default function Home() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [origin, setOrigin] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoInfo, setGeoInfo] = useState<GeoInfo>({});
  const [shiftNotice, setShiftNotice] = useState("");
  const [shiftNoticeTone, setShiftNoticeTone] = useState<ShiftNoticeTone>("default");
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [reportRange, setReportRange] = useState<ReportRange>("month");
  const [taskForm, setTaskForm] = useState({ title: "", points: 10 });
  const [employeeForm, setEmployeeForm] = useState({
    id: "",
    name: "",
    email: "",
    role: "staff" as Role,
    token: "",
    canPunch: true,
    shiftStart: DEFAULT_SETTINGS.shiftStart,
    shiftEnd: DEFAULT_SETTINGS.shiftEnd,
    workDays: [] as number[],
    payType: "daily" as PayInfo["type"],
    payAmount: 0,
    payNote: "",
    isTest: false,
  });
  const [employeeMode, setEmployeeMode] = useState<"new" | "edit">("new");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState("");
  const [exportData, setExportData] = useState("");
  const [exportLabel, setExportLabel] = useState<"JSON" | "CSV" | "">("");
  const [exportNotice, setExportNotice] = useState("");
  const [importData, setImportData] = useState("");
  const [importError, setImportError] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    userId: "",
    date: getLocalDateKey(new Date()),
    amount: 0,
    method: "pix",
    status: "planned" as PaymentStatus,
    kind: "daily" as PaymentKind,
    note: "",
  });
  const [now, setNow] = useState(() => new Date());

  const watchIdRef = useRef<number | null>(null);
  const shiftActiveRef = useRef(false);

  const currentUser = data.employees.find((emp) => emp.id === currentUserId) ?? null;
  const isAdmin = currentUser?.role === "admin";
  const canPunch = currentUser?.canPunch ?? false;

  const personalProfile = currentUser?.role === "staff" ? currentUser : null;
  const geofence = data.settings;

  const teamAccounts = data.employees.filter(
    (employee) => employee.canPunch && !employee.isTest
  );
  const testAccount = data.employees.find((employee) => employee.isTest) ?? null;
  const adminAccounts = data.employees.filter((employee) => employee.role === "admin");

  const openRecord = useMemo(() => {
    if (!currentUserId) {
      return null;
    }
    return (
      data.punchRecords.find(
        (record) => record.userId === currentUserId && !record.endAt
      ) ?? null
    );
  }, [data.punchRecords, currentUserId]);

  const shiftActive = Boolean(openRecord);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    shiftActiveRef.current = shiftActive;
  }, [shiftActive]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setDataLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(saved) as Partial<AppData>;
      setData({
        employees: Array.isArray(parsed.employees)
          ? parsed.employees
          : DEFAULT_DATA.employees,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_DATA.tasks,
        completions: Array.isArray(parsed.completions) ? parsed.completions : [],
        timeOffRequests: Array.isArray(parsed.timeOffRequests)
          ? parsed.timeOffRequests
          : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        punchRecords: Array.isArray(parsed.punchRecords) ? parsed.punchRecords : [],
      });
    } catch {
      setData(DEFAULT_DATA);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!dataLoaded || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded || currentUserId || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("autologin");
    if (!token) {
      return;
    }

    const matchingAccount = data.employees.find((employee) => employee.token === token);
    if (!matchingAccount) {
      setLoginError("Link invalido ou expirado");
      return;
    }

    setCurrentUserId(matchingAccount.id);
    setLoginError("");
    window.history.replaceState({}, "", window.location.pathname);
  }, [dataLoaded, currentUserId, data.employees]);

  useEffect(() => {
    if (currentUserId && !currentUser) {
      setCurrentUserId(null);
    }
  }, [currentUserId, currentUser]);

  useEffect(() => {
    if (!canPunch) {
      stopWatch();
      return;
    }
    if (shiftActive) {
      startWatch();
    } else {
      stopWatch();
    }
  }, [shiftActive, canPunch]);

  useEffect(() => {
    return () => stopWatch();
  }, []);

  const stopWatch = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const updateGeoFromPosition = (position: GeolocationPosition) => {
    const distance = getDistanceMeters(
      position.coords.latitude,
      position.coords.longitude,
      geofence.geofenceLat,
      geofence.geofenceLng
    );
    const inside = distance <= geofence.geofenceRadius;

    setGeoStatus("ready");
    setGeoInfo({
      accuracy: Math.round(position.coords.accuracy),
      updatedAt: new Date(),
      distance,
      inside,
    });

    return inside;
  };

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoInfo({ error: "Geolocalizacao indisponivel." });
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateGeoFromPosition(position);
      },
      () => {
        setGeoStatus("error");
        setGeoInfo({ error: "Permissao negada ou indisponivel." });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const startWatch = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    if (watchIdRef.current !== null) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const inside = updateGeoFromPosition(position);
        if (!inside && shiftActiveRef.current) {
          closeShift("geofence");
          setShiftNotice("Saiu do ponto, turno encerrado automaticamente.");
          setShiftNoticeTone("error");
        }
      },
      () => {
        setGeoStatus("error");
        setGeoInfo({ error: "Sinal de GPS perdido." });
        if (shiftActiveRef.current) {
          setShiftNotice("Sinal perdido. Verifique o GPS.");
          setShiftNoticeTone("error");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const startShift = () => {
    if (!currentUserId) {
      return;
    }
    if (!canPunch) {
      setShiftNotice("Conta sem ponto.");
      setShiftNoticeTone("default");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoInfo({ error: "Geolocalizacao indisponivel." });
      setShiftNotice("Geolocalizacao indisponivel.");
      setShiftNoticeTone("error");
      return;
    }

    setShiftNotice("");
    setShiftNoticeTone("default");
    setGeoStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const inside = updateGeoFromPosition(position);
        if (!inside) {
          setShiftNotice("Voce esta fora do ponto permitido.");
          setShiftNoticeTone("error");
          return;
        }

        const newRecord: PunchRecord = {
          id: `rec_${Date.now()}`,
          userId: currentUserId,
          startAt: new Date().toISOString(),
        };

        setData((prev) => ({
          ...prev,
          punchRecords: [...prev.punchRecords, newRecord],
        }));

        setShiftNotice("Turno iniciado dentro do raio.");
        setShiftNoticeTone("success");
      },
      () => {
        setGeoStatus("error");
        setGeoInfo({ error: "Permissao negada ou indisponivel." });
        setShiftNotice("Nao foi possivel obter o GPS.");
        setShiftNoticeTone("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const closeShift = (reason: "manual" | "geofence") => {
    if (!openRecord) {
      return;
    }
    const closedAt = new Date().toISOString();

    setData((prev) => ({
      ...prev,
      punchRecords: prev.punchRecords.map((record) =>
        record.id === openRecord.id
          ? { ...record, endAt: closedAt, closedBy: reason }
          : record
      ),
    }));
  };

  const handleShiftToggle = () => {
    if (shiftActive) {
      closeShift("manual");
      setShiftNotice("Turno encerrado.");
      setShiftNoticeTone("default");
      return;
    }

    startShift();
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setCopiedToken("");
    setShiftNotice("");
    setShiftNoticeTone("default");
    stopWatch();
    setMenuOpen(false);
  };

  const handleCopyLink = async (token: string) => {
    if (typeof navigator === "undefined") {
      return;
    }

    const link = `${origin || ""}/?autologin=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      setCopiedToken("");
    }
  };

  const handleTaskComplete = (taskId: string) => {
    if (!currentUserId) {
      return;
    }
    const alreadyCompleted = data.completions.some((completion) => {
      if (completion.taskId !== taskId || completion.userId !== currentUserId) {
        return false;
      }
      return isSameDay(new Date(completion.date), now);
    });

    if (alreadyCompleted) {
      return;
    }

    const completion: TaskCompletion = {
      id: `cmp_${Date.now()}`,
      taskId,
      userId: currentUserId,
      date: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      completions: [...prev.completions, completion],
    }));
  };

  const handleAddTask = () => {
    if (!taskForm.title.trim()) {
      return;
    }
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: taskForm.title.trim(),
      points: Math.max(1, Number(taskForm.points) || 1),
      active: true,
    };

    setData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
    setTaskForm({ title: "", points: 10 });
  };

  const handleToggleTask = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, active: !task.active } : task
      ),
    }));
  };

  const handleRemoveTask = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const handleStartEditEmployee = (employee: Employee) => {
    setEmployeeMode("edit");
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      token: employee.token,
      canPunch: employee.canPunch,
      shiftStart: employee.shiftStart,
      shiftEnd: employee.shiftEnd,
      workDays: employee.workDays,
      payType: employee.pay?.type ?? "daily",
      payAmount: employee.pay?.amount ?? 0,
      payNote: employee.pay?.note ?? "",
      isTest: employee.isTest ?? false,
    });
  };

  const resetEmployeeForm = () => {
    setEmployeeMode("new");
    setEditingEmployeeId(null);
    setEmployeeForm({
      id: "",
      name: "",
      email: "",
      role: "staff",
      token: "",
      canPunch: true,
      shiftStart: data.settings.shiftStart,
      shiftEnd: data.settings.shiftEnd,
      workDays: [],
      payType: "daily",
      payAmount: 0,
      payNote: "",
      isTest: false,
    });
  };

  const handleSaveEmployee = () => {
    if (!employeeForm.name.trim()) {
      return;
    }

    const slug = createSlug(employeeForm.name);
    const isNew = employeeMode === "new" || !editingEmployeeId;
    const id = isNew ? generateId(slug || "staff") : employeeForm.id;
    const token = isNew
      ? generateToken(slug || "staff")
      : employeeForm.token || generateToken(slug || "staff");

    const newEmployee: Employee = {
      id,
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      role: employeeForm.role,
      token,
      canPunch: employeeForm.canPunch,
      shiftStart: employeeForm.shiftStart,
      shiftEnd: employeeForm.shiftEnd,
      workDays: employeeForm.workDays,
      isTest: employeeForm.isTest,
      pay: employeeForm.payAmount
        ? {
            type: employeeForm.payType,
            amount: employeeForm.payAmount,
            note: employeeForm.payNote,
          }
        : undefined,
    };

    setData((prev) => {
      const existing = prev.employees.some((employee) => employee.id === id);
      return {
        ...prev,
        employees: existing
          ? prev.employees.map((employee) =>
              employee.id === id ? newEmployee : employee
            )
          : [...prev.employees, newEmployee],
      };
    });

    resetEmployeeForm();
  };

  const handleRemoveEmployee = (employeeId: string) => {
    if (employeeId === currentUserId) {
      return;
    }
    setData((prev) => ({
      ...prev,
      employees: prev.employees.filter((employee) => employee.id !== employeeId),
    }));
  };

  const toggleWorkDay = (dayIndex: number) => {
    setEmployeeForm((prev) => {
      const exists = prev.workDays.includes(dayIndex);
      return {
        ...prev,
        workDays: exists
          ? prev.workDays.filter((day) => day !== dayIndex)
          : [...prev.workDays, dayIndex],
      };
    });
  };

  const handleSettingsChange = (patch: Partial<Settings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const handleCleaningParticipantToggle = (id: string) => {
    setData((prev) => {
      const exists = prev.settings.cleaningParticipants.includes(id);
      return {
        ...prev,
        settings: {
          ...prev.settings,
          cleaningParticipants: exists
            ? prev.settings.cleaningParticipants.filter((item) => item !== id)
            : [...prev.settings.cleaningParticipants, id],
        },
      };
    });
  };

  const timeString = useMemo(
    () =>
      now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [now]
  );

  const dateString = useMemo(
    () =>
      now.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [now]
  );

  const monthLabel = useMemo(
    () =>
      viewMonth.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    [viewMonth]
  );

  const reportStart = useMemo(() => getRangeStart(reportRange), [reportRange]);

  const requestMap = useMemo(() => {
    const map = new Map<string, TimeOffRequest>();
    if (!currentUserId) {
      return map;
    }
    data.timeOffRequests
      .filter((request) => request.userId === currentUserId)
      .forEach((request) => map.set(request.date, request));
    return map;
  }, [data.timeOffRequests, currentUserId]);

  const selectedDateKey = useMemo(() => getLocalDateKey(selectedDate), [selectedDate]);

  const selectedRequest = currentUserId
    ? requestMap.get(selectedDateKey) ?? null
    : null;

  const scheduleEntries = useMemo(
    () =>
      buildScheduleEntries(
        selectedDate.getDay(),
        data.employees,
        data.settings
      ),
    [selectedDate, data.employees, data.settings]
  );

  const calendarDays = useMemo(() => {
    const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startOffset);

    const days = [] as Array<{
      date: Date;
      key: string;
      inMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dayType: "work" | "off";
      requestStatus?: TimeOffRequest["status"];
    }>;

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const key = getLocalDateKey(date);
      const inMonth = date.getMonth() === viewMonth.getMonth();
      const isToday = isSameDay(date, now);
      const isSelected = isSameDay(date, selectedDate);
      const dayType = getDayType(
        date.getDay(),
        personalProfile,
        data.employees,
        data.settings
      );
      const request = requestMap.get(key);

      days.push({
        date,
        key,
        inMonth,
        isToday,
        isSelected,
        dayType,
        requestStatus: request?.status,
      });
    }

    return days;
  }, [
    viewMonth,
    selectedDate,
    data.employees,
    data.settings,
    personalProfile,
    requestMap,
    now,
  ]);

  const activeTasks = useMemo(
    () => data.tasks.filter((task) => task.active),
    [data.tasks]
  );

  const completedToday = useMemo(() => {
    const set = new Set<string>();
    if (!currentUserId) {
      return set;
    }
    data.completions.forEach((completion) => {
      if (completion.userId !== currentUserId) {
        return;
      }
      if (!isSameDay(new Date(completion.date), now)) {
        return;
      }
      set.add(completion.taskId);
    });
    return set;
  }, [data.completions, currentUserId, now]);

  const personalRequests = useMemo(() => {
    if (!currentUserId) {
      return [] as TimeOffRequest[];
    }
    return data.timeOffRequests
      .filter((request) => request.userId === currentUserId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.timeOffRequests, currentUserId]);

  const adminRequests = useMemo(
    () =>
      data.timeOffRequests
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.timeOffRequests]
  );

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    data.tasks.forEach((task) => map.set(task.id, task));
    return map;
  }, [data.tasks]);

  const pointsByUser = useMemo(() => {
    const totals = new Map<string, number>();
    data.completions.forEach((completion) => {
      const completedAt = new Date(completion.date);
      if (completedAt < reportStart) {
        return;
      }
      const task = tasksById.get(completion.taskId);
      const points = task?.points ?? 0;
      totals.set(
        completion.userId,
        (totals.get(completion.userId) ?? 0) + points
      );
    });
    return totals;
  }, [data.completions, tasksById, reportStart]);

  const formatMinutes = (value: number) => {
    const rounded = Math.round(value);
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    return `${hours}h ${minutes}m`;
  };

  const computeMetrics = (employee: Employee) => {
    const records = data.punchRecords.filter(
      (record) => record.userId === employee.id && record.endAt
    );

    let totalMinutes = 0;
    let lateCount = 0;
    let overtimeMinutes = 0;
    const daySet = new Set<string>();

    records.forEach((record) => {
      const start = new Date(record.startAt);
      if (start < reportStart) {
        return;
      }
      if (!record.endAt) {
        return;
      }
      const end = new Date(record.endAt);
      const duration = Math.max(0, (end.getTime() - start.getTime()) / 60000);
      totalMinutes += duration;
      daySet.add(start.toDateString());

      const shiftStartMinutes = timeToMinutes(
        employee.shiftStart || data.settings.shiftStart
      );
      const lateAfter = shiftStartMinutes + data.settings.toleranceMinutes;
      const startMinutes = getMinutesOfDay(start);
      if (startMinutes > lateAfter) {
        lateCount += 1;
      }

      const overtimeAfter = timeToMinutes(
        data.settings.overtimeAfter || employee.shiftEnd
      );
      const endMinutes = getMinutesOfDay(end);
      if (endMinutes > overtimeAfter) {
        overtimeMinutes += endMinutes - overtimeAfter;
      }
    });

    return {
      totalMinutes,
      lateCount,
      overtimeMinutes,
      daysWorked: daySet.size,
    };
  };

  const reportRows = useMemo(
    () =>
      data.employees
        .filter((employee) => employee.role !== "admin")
        .map((employee) => {
          const metrics = computeMetrics(employee);
          return {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            ...metrics,
            points: pointsByUser.get(employee.id) ?? 0,
          };
        }),
    [data.employees, data.punchRecords, data.settings, reportStart, pointsByUser]
  );

  const escapeCsv = (value: string | number) => {
    const text = String(value ?? "");
    if (/[\";\n]/.test(text)) {
      return `"${text.replace(/\"/g, '""')}"`;
    }
    return text;
  };

  const reportCsv = useMemo(() => {
    const header = [
      "nome",
      "funcao",
      "dias",
      "minutos",
      "atrasos",
      "extra_min",
      "pontos",
    ];
    const rows = reportRows.map((row) =>
      [
        escapeCsv(row.name),
        escapeCsv(row.role),
        row.daysWorked,
        Math.round(row.totalMinutes),
        row.lateCount,
        Math.round(row.overtimeMinutes),
        row.points,
      ].join(";")
    );
    return [header.join(";"), ...rows].join("\n");
  }, [reportRows]);

  const paymentsInRange = useMemo(() => {
    return data.payments.filter((payment) => {
      const day = new Date(`${payment.date}T00:00:00`);
      return day >= reportStart;
    });
  }, [data.payments, reportStart]);

  const paymentsByUser = useMemo(() => {
    const totals = new Map<
      string,
      { paid: number; planned: number; count: number }
    >();
    paymentsInRange.forEach((payment) => {
      const entry = totals.get(payment.userId) ?? {
        paid: 0,
        planned: 0,
        count: 0,
      };
      if (payment.status === "paid") {
        entry.paid += payment.amount;
      } else {
        entry.planned += payment.amount;
      }
      entry.count += 1;
      totals.set(payment.userId, entry);
    });
    return totals;
  }, [paymentsInRange]);

  const paymentsCsv = useMemo(() => {
    const header = [
      "nome",
      "data",
      "tipo",
      "status",
      "valor",
      "metodo",
      "nota",
    ];
    const rows = paymentsInRange.map((payment) => {
      const employee = data.employees.find((item) => item.id === payment.userId);
      return [
        escapeCsv(employee?.name ?? "Funcionario"),
        payment.date,
        payment.kind,
        payment.status,
        payment.amount,
        escapeCsv(payment.method),
        escapeCsv(payment.note ?? ""),
      ].join(";");
    });
    return [header.join(";"), ...rows].join("\n");
  }, [paymentsInRange, data.employees]);

  const currentMetrics = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    return reportRows.find((row) => row.id === currentUser.id) ?? null;
  }, [currentUser, reportRows]);

  const openShifts = useMemo(() => {
    return data.punchRecords
      .filter((record) => !record.endAt)
      .map((record) => {
        const employee = data.employees.find((item) => item.id === record.userId);
        const startedAt = new Date(record.startAt);
        const durationMinutes = Math.max(
          0,
          (now.getTime() - startedAt.getTime()) / 60000
        );
        return {
          id: record.id,
          name: employee?.name ?? "Funcionario",
          startedAt,
          durationMinutes,
        };
      })
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }, [data.punchRecords, data.employees, now]);

  const pendingRequests = useMemo(
    () =>
      data.timeOffRequests.filter((request) => request.status === "pending")
        .length,
    [data.timeOffRequests]
  );

  const handlePrevMonth = () => {
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleToggleTimeOff = () => {
    if (!currentUserId) {
      return;
    }
    if (getStartOfDay(selectedDate) < getStartOfDay(now)) {
      return;
    }
    const existing = requestMap.get(selectedDateKey);
    if (existing) {
      if (existing.status !== "pending") {
        return;
      }
      setData((prev) => ({
        ...prev,
        timeOffRequests: prev.timeOffRequests.filter(
          (request) => request.id !== existing.id
        ),
      }));
      return;
    }

    const request: TimeOffRequest = {
      id: `req_${Date.now()}`,
      userId: currentUserId,
      date: selectedDateKey,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      timeOffRequests: [...prev.timeOffRequests, request],
    }));
  };

  const handleUpdateTimeOffStatus = (
    id: string,
    status: TimeOffRequest["status"]
  ) => {
    setData((prev) => ({
      ...prev,
      timeOffRequests: prev.timeOffRequests.map((request) =>
        request.id === id ? { ...request, status } : request
      ),
    }));
  };

  const handleRemoveTimeOff = (id: string) => {
    setData((prev) => ({
      ...prev,
      timeOffRequests: prev.timeOffRequests.filter((request) => request.id !== id),
    }));
  };

  const buildExportPayload = () => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  });

  const handleExportJson = () => {
    const payload = JSON.stringify(buildExportPayload(), null, 2);
    setExportData(payload);
    setExportLabel("JSON");
    setExportNotice("Export JSON pronto.");
    setImportError("");
  };

  const handleExportCsv = () => {
    setExportData(reportCsv);
    setExportLabel("CSV");
    setExportNotice("Export CSV pronto.");
    setImportError("");
  };

  const handleCopyExport = async () => {
    if (!exportData || typeof navigator === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(exportData);
      setExportNotice("Export copiado.");
    } catch {
      setExportNotice("Nao foi possivel copiar.");
    }
  };

  const handleDownloadExport = () => {
    if (!exportData || typeof window === "undefined") {
      return;
    }
    const ext = exportLabel === "CSV" ? "csv" : "json";
    const mime =
      exportLabel === "CSV" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
    const blob = new Blob([exportData], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ponto-vivo-export-${getLocalDateKey(new Date())}.${ext}`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setExportNotice("Arquivo gerado.");
  };

  const handleImportData = () => {
    if (!importData.trim()) {
      return;
    }
    try {
      const parsed = JSON.parse(importData) as Partial<AppData> & {
        data?: Partial<AppData>;
      };
      const incoming = parsed.data ?? parsed;
      if (!incoming.employees || !Array.isArray(incoming.employees)) {
        throw new Error("Formato invalido");
      }
      setData({
        employees: incoming.employees,
        settings: { ...DEFAULT_SETTINGS, ...(incoming.settings ?? {}) },
        tasks: Array.isArray(incoming.tasks) ? incoming.tasks : DEFAULT_DATA.tasks,
        completions: Array.isArray(incoming.completions) ? incoming.completions : [],
        timeOffRequests: Array.isArray(incoming.timeOffRequests)
          ? incoming.timeOffRequests
          : [],
        payments: Array.isArray(incoming.payments) ? incoming.payments : [],
        punchRecords: Array.isArray(incoming.punchRecords) ? incoming.punchRecords : [],
      });
      setImportData("");
      setImportError("");
      setExportNotice("Importacao concluida.");
    } catch (error) {
      setImportError("Erro ao importar. Verifique o JSON.");
    }
  };

  const handleAddPayment = () => {
    if (!paymentForm.userId || !paymentForm.date || !paymentForm.amount) {
      return;
    }
    const record: PaymentRecord = {
      id: `pay_${Date.now()}`,
      userId: paymentForm.userId,
      date: paymentForm.date,
      amount: Number(paymentForm.amount),
      method: paymentForm.method.trim() || "pix",
      status: paymentForm.status,
      kind: paymentForm.kind,
      note: paymentForm.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      payments: [record, ...prev.payments],
    }));
    setPaymentForm((prev) => ({
      ...prev,
      amount: 0,
      note: "",
      status: "planned",
    }));
  };

  const handleTogglePaymentStatus = (id: string) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((payment) =>
        payment.id === id
          ? {
              ...payment,
              status: payment.status === "paid" ? "planned" : "paid",
            }
          : payment
      ),
    }));
  };

  const handleRemovePayment = (id: string) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.filter((payment) => payment.id !== id),
    }));
  };

  if (!currentUser) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <span className="login-brand">Ponto Vivo</span>
          <h1>Acesso por link</h1>
          <p className="login-subtitle">
            Este app funciona apenas com link de acesso enviado pelo admin.
          </p>
          {loginError ? <p className="login-error">{loginError}</p> : null}
          <div className="login-hint">
            <span>
              Exemplo: {origin ? `${origin}/?autologin=token` : "/?autologin=token"}
            </span>
            <span>Se precisar, solicite o link ao admin.</span>
          </div>
        </div>
      </div>
    );
  }

  const timeOffLabels: Record<TimeOffRequest["status"], string> = {
    pending: "Pendente",
    approved: "Aprovada",
    denied: "Negada",
  };

  const currentPoints = currentUser
    ? pointsByUser.get(currentUser.id) ?? 0
    : 0;

  const pointsToday = Array.from(completedToday).reduce((total, taskId) => {
    const task = tasksById.get(taskId);
    return total + (task?.points ?? 0);
  }, 0);

  const selectedDayType = getDayType(
    selectedDate.getDay(),
    personalProfile,
    data.employees,
    data.settings
  );

  const isPastDate = getStartOfDay(selectedDate) < getStartOfDay(now);

  const shiftButtonLabel = shiftActive ? "Finalizar turno" : "Iniciar turno";
  const shiftButtonDisabled = !canPunch;

  return (
    <div className={`page ${menuOpen ? "page--menu-open" : ""}`}>
      <button
        className="menu-toggle"
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
      >
        Menu
      </button>

      <div
        className="menu-overlay"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className="menu-drawer" aria-hidden={!menuOpen}>
        <div className="menu-header">
          <div>
            <div className="menu-title">Menu</div>
            <div className="menu-subtitle">Bem vindo, {currentUser.name}</div>
          </div>
          <button
            className="menu-close"
            type="button"
            onClick={() => setMenuOpen(false)}
          >
            Fechar
          </button>
        </div>

        <div className="menu-grid">
          <section className="tool-card">
            <div className="card-header">
              <div>
                <h3>Calendario da equipe</h3>
                <p>Escala, folgas e agenda.</p>
              </div>
              <div className="month-nav">
                <button
                  className="ghost ghost--icon"
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                >
                  {"<"}
                </button>
                <span className="month-label">{monthLabel}</span>
                <button
                  className="ghost ghost--icon"
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Proximo mes"
                >
                  {">"}
                </button>
              </div>
            </div>

            <div className="calendar-shell">
              <div className="calendar-weekdays">
                {WEEK_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="calendar-days">
                {calendarDays.map((day) => (
                  <button
                    key={day.key}
                    className={`calendar-day ${day.dayType} ${
                      day.inMonth ? "" : "is-outside"
                    } ${day.isToday ? "is-today" : ""} ${
                      day.isSelected ? "is-selected" : ""
                    } ${
                      day.requestStatus ? `request-${day.requestStatus}` : ""
                    }`}
                    type="button"
                    onClick={() => handleSelectDate(day.date)}
                    disabled={!day.inMonth}
                  >
                    {day.date.getDate()}
                    {day.requestStatus ? (
                      <span className={`request-dot ${day.requestStatus}`} />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot work" />
                Trabalho
              </div>
              <div className="legend-item">
                <span className="legend-dot off" />
                Folga
              </div>
              <div className="legend-item">
                <span className="legend-dot request" />
                Folga solicitada
              </div>
            </div>

            <div className="selected-date">
              <div>
                <span>Selecionado</span>
                <strong>{selectedDate.toLocaleDateString("pt-BR")}</strong>
              </div>
              <span className={`day-pill ${selectedDayType}`}>
                {selectedDayType === "work" ? "Trabalho" : "Folga"}
              </span>
            </div>

            <div className="day-details">
              <div className="personal-shift">
                <span>{personalProfile ? "Seu turno" : "Turno padrao"}</span>
                <strong>
                  {personalProfile
                    ? `${personalProfile.shiftStart}-${personalProfile.shiftEnd}`
                    : `${data.settings.shiftStart}-${data.settings.shiftEnd}`}
                </strong>
              </div>
              {personalProfile ? (
                <span className="entry-note">
                  Dias: {formatWorkDays(personalProfile.workDays)}
                </span>
              ) : null}
              <div className="day-entries">
                {scheduleEntries.length ? (
                  scheduleEntries.map((entry) => (
                    <div
                      key={`${entry.title}-${entry.time}`}
                      className={`day-entry ${entry.tone}`}
                    >
                      <div className="day-entry-header">
                        <span>{entry.title}</span>
                        <span>{entry.time}</span>
                      </div>
                      <div className="schedule-badges">
                        {entry.people.map((person) => (
                          <span key={person} className="badge">
                            {person}
                          </span>
                        ))}
                      </div>
                      {entry.note ? (
                        <span className="entry-note">{entry.note}</span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <span className="entry-note">
                    Sem turnos definidos para este dia.
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="tool-card">
            <h3>Solicitar folga</h3>
            <p>Escolha o dia no calendario para enviar sua solicitacao.</p>
            <div className="selected-date">
              <div>
                <span>Dia escolhido</span>
                <strong>{selectedDate.toLocaleDateString("pt-BR")}</strong>
              </div>
              {selectedRequest ? (
                <span className={`status-pill ${selectedRequest.status}`}>
                  {timeOffLabels[selectedRequest.status]}
                </span>
              ) : (
                <span className="day-pill">Novo</span>
              )}
            </div>
            <button
              className="action-btn"
              type="button"
              onClick={handleToggleTimeOff}
              disabled={
                !canPunch ||
                isPastDate ||
                (selectedRequest ? selectedRequest.status !== "pending" : false)
              }
            >
              {selectedRequest
                ? selectedRequest.status === "pending"
                  ? "Cancelar solicitacao"
                  : "Solicitacao registrada"
                : "Solicitar folga"}
            </button>
            {!canPunch ? (
              <span className="entry-note">
                Esta conta nao possui ponto nem solicitacao de folga.
              </span>
            ) : isPastDate ? (
              <span className="entry-note">
                Nao e possivel solicitar folga para dias passados.
              </span>
            ) : null}
            <div className="timeoff-list">
              {personalRequests.length ? (
                personalRequests.slice(0, 4).map((request) => (
                  <div key={request.id} className="timeoff-item">
                    <div>
                      <strong>
                        {new Date(
                          `${request.date}T00:00:00`
                        ).toLocaleDateString("pt-BR")}
                      </strong>
                      <span className="entry-note">
                        Solicitado em {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString(
                              "pt-BR"
                            )
                          : "data nao registrada"}
                      </span>
                    </div>
                    <span className={`status-pill ${request.status}`}>
                      {timeOffLabels[request.status]}
                    </span>
                  </div>
                ))
              ) : (
                <span className="entry-note">Nenhuma solicitacao enviada.</span>
              )}
            </div>
          </section>

          <section className="tool-card">
            <h3>GPS e ponto</h3>
            <p>Use o GPS para validar o inicio e fim do turno.</p>
            <div className="gps-status">
              <span className={`gps-dot ${geoStatus}`} />
              <div>
                <strong>
                  {geoStatus === "ready"
                    ? geoInfo.inside
                      ? "Dentro do raio"
                      : "Fora do raio"
                    : geoStatus === "loading"
                    ? "Buscando GPS"
                    : geoStatus === "error"
                    ? "GPS indisponivel"
                    : "Sem leitura"}
                </strong>
                <span>
                  {geoInfo.error
                    ? geoInfo.error
                    : `Raio permitido: ${geofence.geofenceRadius}m`}
                </span>
              </div>
            </div>
            <div className="gps-meta">
              <span>Local: {geofence.geofenceName}</span>
              <span>Plus code: {geofence.geofencePlusCode}</span>
              <span>
                Ultima leitura: {geoInfo.updatedAt
                  ? geoInfo.updatedAt.toLocaleTimeString("pt-BR")
                  : "Sem leitura"}
              </span>
              {geoInfo.distance !== undefined ? (
                <span>Distancia: {Math.round(geoInfo.distance)}m</span>
              ) : null}
            </div>
            <div className="action-grid">
              <button className="action-btn" type="button" onClick={requestLocation}>
                Atualizar GPS
              </button>
              <button
                className="action-btn"
                type="button"
                onClick={handleShiftToggle}
                disabled={shiftButtonDisabled}
              >
                {shiftButtonLabel}
              </button>
            </div>
          </section>

          <section className="tool-card">
            <h3>Tarefas e pontos</h3>
            <p>Complete tarefas e acumule pontos do time.</p>
            <div className="task-summary">
              <div>
                <span className="stat-label">Pontos hoje</span>
                <strong className="stat-value">{pointsToday}</strong>
              </div>
              <div>
                <span className="stat-label">Total no periodo</span>
                <strong className="stat-value">{currentPoints}</strong>
              </div>
            </div>
            <div className="task-list">
              {activeTasks.length ? (
                activeTasks.map((task) => {
                  const isDone = completedToday.has(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`task-item ${isDone ? "is-done" : ""}`}
                    >
                      <div className="task-meta">
                        <strong>{task.title}</strong>
                        <span className="task-points">{task.points} pontos</span>
                      </div>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleTaskComplete(task.id)}
                        disabled={isDone || !canPunch}
                      >
                        {isDone ? "Concluida" : "Concluir"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <span className="entry-note">Nenhuma tarefa ativa.</span>
              )}
            </div>
          </section>

          <section className="tool-card">
            <h3>Resumo rapido</h3>
            <p>Indicadores do periodo selecionado.</p>
            <div className="form-grid">
              <div>
                <label>Periodo</label>
                <select
                  value={reportRange}
                  onChange={(event) =>
                    setReportRange(event.target.value as ReportRange)
                  }
                >
                  <option value="week">Semana atual</option>
                  <option value="month">Mes atual</option>
                  <option value="30d">Ultimos 30 dias</option>
                </select>
              </div>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label">Horas</span>
                <span className="stat-value">
                  {currentMetrics
                    ? formatMinutes(currentMetrics.totalMinutes)
                    : "0h 0m"}
                </span>
                <span className="stat-note">
                  Dias: {currentMetrics?.daysWorked ?? 0}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Atrasos</span>
                <span className="stat-value">{currentMetrics?.lateCount ?? 0}</span>
                <span className="stat-note">Tolerancia {data.settings.toleranceMinutes}m</span>
              </div>
              <div className="stat">
                <span className="stat-label">Hora extra</span>
                <span className="stat-value">
                  {currentMetrics
                    ? formatMinutes(currentMetrics.overtimeMinutes)
                    : "0h 0m"}
                </span>
                <span className="stat-note">Apos {data.settings.overtimeAfter}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Pontos</span>
                <span className="stat-value">{currentPoints}</span>
                <span className="stat-note">Tarefas concluidas</span>
              </div>
              {isAdmin ? (
                <div className="stat">
                  <span className="stat-label">Solicitacoes pendentes</span>
                  <span className="stat-value">{pendingRequests}</span>
                  <span className="stat-note">
                    Equipe ativa {data.employees.filter(
                      (employee) => employee.role !== "admin"
                    ).length}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="tool-card account-card">
            <div className="account-header">
              <div>
                <div className="account-name">{currentUser.name}</div>
                <div className="account-email">
                  {currentUser.email || "Sem email"}
                </div>
              </div>
              <span className={`role-pill ${currentUser.role}`}>
                {currentUser.role}
              </span>
            </div>
            <p className="entry-note">
              Escala: {formatWorkDays(currentUser.workDays)} | Turno {currentUser.shiftStart}-
              {currentUser.shiftEnd}
            </p>
            <div className="action-grid">
              <button className="action-btn" type="button" onClick={handleLogout}>
                Sair
              </button>
              {isAdmin ? (
                <button
                  className="action-btn"
                  type="button"
                  onClick={() => handleCopyLink(currentUser.token)}
                >
                  {copiedToken === currentUser.token ? "Copiado" : "Copiar link"}
                </button>
              ) : null}
            </div>
          </section>

          {!isAdmin ? (
            <section className="tool-card admin-card admin-card--locked">
              <div className="admin-header">
                <h3>Area admin</h3>
                <span className="admin-pill">Restrito</span>
              </div>
              <p className="admin-locked">
                Funcoes administrativas sao exclusivas do admin.
              </p>
            </section>
          ) : (
            <>
            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Links de acesso</h3>
                <span className="admin-pill">Admin</span>
              </div>
              <p>Envie links diretos para cada funcionario.</p>
              <div className="admin-links">
                <div className="admin-links-title">Equipe</div>
                {teamAccounts.length ? (
                  teamAccounts.map((employee) => (
                    <div key={employee.id} className="admin-link-row">
                      <div>
                        <strong>{employee.name}</strong>
                        <span className="admin-link-text">
                          {origin
                            ? `${origin}/?autologin=${employee.token}`
                            : `/?autologin=${employee.token}`}
                        </span>
                      </div>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleCopyLink(employee.token)}
                      >
                        {copiedToken === employee.token ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="entry-note">Nenhuma conta com ponto.</span>
                )}
                {testAccount ? (
                  <div className="admin-link-row">
                    <div>
                      <strong>{testAccount.name} (teste)</strong>
                      <span className="admin-link-text">
                        {origin
                          ? `${origin}/?autologin=${testAccount.token}`
                          : `/?autologin=${testAccount.token}`}
                      </span>
                    </div>
                    <button
                      className="ghost ghost--small"
                      type="button"
                      onClick={() => handleCopyLink(testAccount.token)}
                    >
                      {copiedToken === testAccount.token ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                ) : null}
                <div className="admin-links-title">Admin</div>
                {adminAccounts.map((employee) => (
                  <div key={employee.id} className="admin-link-row">
                    <div>
                      <strong>{employee.name}</strong>
                      <span className="admin-link-text">
                        {origin
                          ? `${origin}/?autologin=${employee.token}`
                          : `/?autologin=${employee.token}`}
                      </span>
                    </div>
                    <button
                      className="ghost ghost--small"
                      type="button"
                      onClick={() => handleCopyLink(employee.token)}
                    >
                      {copiedToken === employee.token ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Monitoramento</h3>
                <span className="admin-pill">Ao vivo</span>
              </div>
              <p>Turnos ativos e duracao.</p>
              <div className="report-list">
                {openShifts.length ? (
                  openShifts.map((shift) => (
                    <div key={shift.id} className="report-card">
                      <div className="report-head">
                        <div>
                          <strong>{shift.name}</strong>
                          <span className="entry-note">
                            Inicio {shift.startedAt.toLocaleTimeString("pt-BR")}
                          </span>
                        </div>
                        <span className="status-pill approved">Em turno</span>
                      </div>
                      <div className="report-metrics">
                        <div className="metric">
                          <span className="stat-label">Duracao</span>
                          <strong>{formatMinutes(shift.durationMinutes)}</strong>
                        </div>
                        <div className="metric">
                          <span className="stat-label">Inicio</span>
                          <strong>
                            {shift.startedAt.toLocaleDateString("pt-BR")}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="entry-note">Nenhum turno ativo.</span>
                )}
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Configuracoes</h3>
                <span className="admin-pill">Personalizar</span>
              </div>
              <p>Defina turno, tolerancia, GPS e limpeza.</p>
              <div className="form-grid">
                <div>
                  <label>Turno padrao</label>
                  <div className="inline-row">
                    <input
                      type="time"
                      value={data.settings.shiftStart}
                      onChange={(event) =>
                        handleSettingsChange({ shiftStart: event.target.value })
                      }
                    />
                    <input
                      type="time"
                      value={data.settings.shiftEnd}
                      onChange={(event) =>
                        handleSettingsChange({ shiftEnd: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="inline-row">
                  <div>
                    <label>Tolerancia (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={data.settings.toleranceMinutes}
                      onChange={(event) =>
                        handleSettingsChange({
                          toleranceMinutes: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label>Hora extra apos</label>
                    <input
                      type="time"
                      value={data.settings.overtimeAfter}
                      onChange={(event) =>
                        handleSettingsChange({ overtimeAfter: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label>Geofence (nome do local)</label>
                  <input
                    type="text"
                    value={data.settings.geofenceName}
                    onChange={(event) =>
                      handleSettingsChange({ geofenceName: event.target.value })
                    }
                  />
                </div>
                <div className="inline-row">
                  <div>
                    <label>Plus code</label>
                    <input
                      type="text"
                      value={data.settings.geofencePlusCode}
                      onChange={(event) =>
                        handleSettingsChange({
                          geofencePlusCode: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label>Raio (m)</label>
                    <input
                      type="number"
                      min={10}
                      value={data.settings.geofenceRadius}
                      onChange={(event) =>
                        handleSettingsChange({
                          geofenceRadius: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="inline-row">
                  <div>
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={data.settings.geofenceLat}
                      onChange={(event) =>
                        handleSettingsChange({
                          geofenceLat: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={data.settings.geofenceLng}
                      onChange={(event) =>
                        handleSettingsChange({
                          geofenceLng: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label>Limpeza semanal</label>
                  <div className="inline-row">
                    <select
                      value={data.settings.cleaningDay}
                      onChange={(event) =>
                        handleSettingsChange({
                          cleaningDay: Number(event.target.value),
                        })
                      }
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <option key={day} value={day}>
                          {WEEK_LABELS[(day + 6) % 7]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={data.settings.cleaningStart}
                      onChange={(event) =>
                        handleSettingsChange({
                          cleaningStart: event.target.value,
                        })
                      }
                    />
                    <input
                      type="time"
                      value={data.settings.cleaningEnd}
                      onChange={(event) =>
                        handleSettingsChange({ cleaningEnd: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label>Nota da limpeza</label>
                  <input
                    type="text"
                    value={data.settings.cleaningNote}
                    onChange={(event) =>
                      handleSettingsChange({ cleaningNote: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Participantes da limpeza</label>
                  <div className="toggle-list">
                    {data.employees
                      .filter((employee) => employee.role !== "admin")
                      .map((employee) => (
                        <label key={employee.id} className="toggle-row">
                          <input
                            type="checkbox"
                            checked={data.settings.cleaningParticipants.includes(
                              employee.id
                            )}
                            onChange={() =>
                              handleCleaningParticipantToggle(employee.id)
                            }
                          />
                          <span>{employee.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Cadastro de funcionarios</h3>
                <span className="admin-pill">Equipe</span>
              </div>
              <p>Crie contas, personalize escalas e permissoes.</p>
              <div className="employee-list">
                {data.employees.map((employee) => (
                  <div key={employee.id} className="employee-card">
                    <div className="employee-head">
                      <div>
                        <strong>{employee.name}</strong>
                        <span className="employee-meta">
                          {employee.role} | {employee.shiftStart}-{employee.shiftEnd}
                        </span>
                        <span className="employee-meta">
                          Dias: {formatWorkDays(employee.workDays)}
                        </span>
                      </div>
                      <div className="employee-tags">
                        {employee.isTest ? (
                          <span className="status-pill pending">Teste</span>
                        ) : null}
                        <span
                          className={`status-pill ${
                            employee.canPunch ? "approved" : "denied"
                          }`}
                        >
                          {employee.canPunch ? "Ponto" : "Sem ponto"}
                        </span>
                      </div>
                    </div>
                    <div className="employee-actions">
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleStartEditEmployee(employee)}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleCopyLink(employee.token)}
                      >
                        {copiedToken === employee.token ? "Copiado" : "Copiar link"}
                      </button>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleRemoveEmployee(employee.id)}
                        disabled={employee.id === currentUserId}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="employee-form">
                <h4>{employeeMode === "new" ? "Nova conta" : "Editar conta"}</h4>
                <div className="form-grid">
                  <div>
                    <label>Nome</label>
                    <input
                      type="text"
                      value={employeeForm.name}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label>Email</label>
                    <input
                      type="email"
                      value={employeeForm.email}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label>Funcao</label>
                    <select
                      value={employeeForm.role}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          role: event.target.value as Role,
                        }))
                      }
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="support">Support</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="inline-row">
                    <div>
                      <label>Inicio turno</label>
                      <input
                        type="time"
                        value={employeeForm.shiftStart}
                        onChange={(event) =>
                          setEmployeeForm((prev) => ({
                            ...prev,
                            shiftStart: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Fim turno</label>
                      <input
                        type="time"
                        value={employeeForm.shiftEnd}
                        onChange={(event) =>
                          setEmployeeForm((prev) => ({
                            ...prev,
                            shiftEnd: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label>Dias trabalhados</label>
                    <div className="workday-grid">
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={`workday-btn ${
                            employeeForm.workDays.includes(day) ? "active" : ""
                          }`}
                          onClick={() => toggleWorkDay(day)}
                        >
                          {WEEK_LABELS[(day + 6) % 7]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label>Token de acesso</label>
                    <input
                      type="text"
                      placeholder="Gerado automaticamente"
                      value={employeeForm.token}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          token: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="inline-row">
                    <div>
                      <label>Tipo pagamento</label>
                      <select
                        value={employeeForm.payType}
                        onChange={(event) =>
                          setEmployeeForm((prev) => ({
                            ...prev,
                            payType: event.target.value as PayInfo["type"],
                          }))
                        }
                      >
                        <option value="daily">Diaria</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </div>
                    <div>
                      <label>Valor</label>
                      <input
                        type="number"
                        value={employeeForm.payAmount}
                        onChange={(event) =>
                          setEmployeeForm((prev) => ({
                            ...prev,
                            payAmount: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label>Nota pagamento</label>
                    <input
                      type="text"
                      value={employeeForm.payNote}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          payNote: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={employeeForm.canPunch}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          canPunch: event.target.checked,
                        }))
                      }
                    />
                    <span>Conta bate ponto</span>
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={employeeForm.isTest}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          isTest: event.target.checked,
                        }))
                      }
                    />
                    <span>Conta de teste</span>
                  </label>
                </div>
                <div className="action-grid">
                  <button
                    className="action-btn"
                    type="button"
                    onClick={handleSaveEmployee}
                  >
                    {employeeMode === "new" ? "Adicionar funcionario" : "Salvar ajustes"}
                  </button>
                  <button
                    className="ghost ghost--small"
                    type="button"
                    onClick={resetEmployeeForm}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Solicitacoes de folga</h3>
                <span className="admin-pill">Admin</span>
              </div>
              <p>Ajuste o status das solicitacoes.</p>
              <div className="timeoff-list">
                {adminRequests.length ? (
                  adminRequests.map((request) => {
                    const employee = data.employees.find(
                      (item) => item.id === request.userId
                    );
                    return (
                      <div key={request.id} className="timeoff-item">
                        <div>
                          <strong>{employee?.name ?? "Funcionario"}</strong>
                          <span className="entry-note">
                            {new Date(
                              `${request.date}T00:00:00`
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div className="timeoff-actions">
                          <select
                            value={request.status}
                            onChange={(event) =>
                              handleUpdateTimeOffStatus(
                                request.id,
                                event.target.value as TimeOffRequest["status"]
                              )
                            }
                          >
                            {Object.entries(timeOffLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="ghost ghost--small"
                            type="button"
                            onClick={() => handleRemoveTimeOff(request.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="entry-note">Sem solicitacoes.</span>
                )}
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Tarefas da empresa</h3>
                <span className="admin-pill">Pontos</span>
              </div>
              <p>Gerencie tarefas e pontos.</p>
              <div className="task-list">
                {data.tasks.length ? (
                  data.tasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div className="task-meta">
                        <strong>{task.title}</strong>
                        <span className="task-points">{task.points} pontos</span>
                      </div>
                      <div className="task-actions">
                        <button
                          className="ghost ghost--small"
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                        >
                          {task.active ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          className="ghost ghost--small"
                          type="button"
                          onClick={() => handleRemoveTask(task.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="entry-note">Nenhuma tarefa cadastrada.</span>
                )}
              </div>
              <div className="task-form">
                <div className="form-grid">
                  <div>
                    <label>Nova tarefa</label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(event) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label>Pontos</label>
                    <input
                      type="number"
                      value={taskForm.points}
                      onChange={(event) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          points: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <button
                  className="action-btn"
                  type="button"
                  onClick={handleAddTask}
                >
                  Adicionar tarefa
                </button>
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Relatorios</h3>
                <span className="admin-pill">Produtividade</span>
              </div>
              <p>Horas, atrasos, extras e pontos por periodo.</p>
              <div className="report-list">
                {reportRows.length ? (
                  reportRows.map((row) => (
                    <div key={row.id} className="report-card">
                      <div className="report-head">
                        <div>
                          <strong>{row.name}</strong>
                          <span className="entry-note">{row.role}</span>
                        </div>
                        <span className="status-pill pending">
                          Atrasos {row.lateCount}
                        </span>
                      </div>
                      <div className="report-metrics">
                        <div className="metric">
                          <span className="stat-label">Horas</span>
                          <strong>{formatMinutes(row.totalMinutes)}</strong>
                        </div>
                        <div className="metric">
                          <span className="stat-label">Dias</span>
                          <strong>{row.daysWorked}</strong>
                        </div>
                        <div className="metric">
                          <span className="stat-label">Extra</span>
                          <strong>{formatMinutes(row.overtimeMinutes)}</strong>
                        </div>
                        <div className="metric">
                          <span className="stat-label">Pontos</span>
                          <strong>{row.points}</strong>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="entry-note">
                    Nenhum registro de ponto neste periodo.
                  </span>
                )}
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Integracoes</h3>
                <span className="admin-pill">Exportacao</span>
              </div>
              <p>Exporte dados para outros sistemas ou importe ajustes.</p>
              <div className="action-grid">
                <button className="action-btn" type="button" onClick={handleExportJson}>
                  Exportar JSON
                </button>
                <button className="action-btn" type="button" onClick={handleExportCsv}>
                  Exportar CSV
                </button>
                <button
                  className="action-btn"
                  type="button"
                  onClick={() => {
                    setExportData(paymentsCsv);
                    setExportLabel("CSV");
                    setExportNotice("Export de pagamentos pronto.");
                    setImportError("");
                  }}
                >
                  Export pagamentos
                </button>
              </div>
              {exportNotice ? (
                <div className="status-banner success">{exportNotice}</div>
              ) : null}
              {exportData ? (
                <div className="export-box">
                  <div className="export-head">
                    <strong>{exportLabel || "Export"}</strong>
                    <div className="export-actions">
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={handleCopyExport}
                      >
                        Copiar
                      </button>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={handleDownloadExport}
                      >
                        Baixar
                      </button>
                    </div>
                  </div>
                  <textarea className="code-area" readOnly value={exportData} />
                </div>
              ) : null}
              <div className="import-box">
                <label>Importar JSON</label>
                <textarea
                  className="code-area"
                  placeholder="Cole aqui o JSON exportado"
                  value={importData}
                  onChange={(event) => setImportData(event.target.value)}
                />
                <div className="action-grid">
                  <button className="action-btn" type="button" onClick={handleImportData}>
                    Importar dados
                  </button>
                  <button
                    className="ghost ghost--small"
                    type="button"
                    onClick={() => {
                      setImportData("");
                      setImportError("");
                    }}
                  >
                    Limpar
                  </button>
                </div>
                {importError ? (
                  <div className="status-banner error">{importError}</div>
                ) : null}
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Folha de pagamento</h3>
                <span className="admin-pill">Admin</span>
              </div>
              <p>Valores visiveis apenas para o admin.</p>
              <div className="admin-payroll">
                {data.employees.filter((employee) => employee.pay).length ? (
                  data.employees
                    .filter((employee) => employee.pay)
                    .map((employee) => (
                      <div key={employee.id} className="payroll-item">
                        <div>
                          <strong>{employee.name}</strong>
                          <span className="payroll-meta">
                            {employee.pay?.type === "monthly" ? "Mensal" : "Diaria"}
                          </span>
                          {employee.pay?.note ? (
                            <span className="payroll-note">{employee.pay.note}</span>
                          ) : null}
                        </div>
                        <div className="payroll-amount">
                          {employee.pay ? formatCurrency(employee.pay.amount) : "-"}
                        </div>
                      </div>
                    ))
                ) : (
                  <span className="entry-note">Sem valores cadastrados.</span>
                )}
              </div>
            </section>

            <section className="tool-card admin-card">
              <div className="admin-header">
                <h3>Pagamentos</h3>
                <span className="admin-pill">Financeiro</span>
              </div>
              <p>Registre pagamentos, bonus e ajustes.</p>
              <div className="payment-summary">
                {data.employees
                  .filter((employee) => employee.role !== "admin")
                  .map((employee) => {
                    const totals = paymentsByUser.get(employee.id) ?? {
                      paid: 0,
                      planned: 0,
                      count: 0,
                    };
                    return (
                      <div key={employee.id} className="payment-summary-card">
                        <strong>{employee.name}</strong>
                        <span className="entry-note">
                          Lancamentos: {totals.count}
                        </span>
                        <div className="payment-values">
                          <span>Pago {formatCurrency(totals.paid)}</span>
                          <span>Previsto {formatCurrency(totals.planned)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="payment-form">
                <h4>Novo pagamento</h4>
                <div className="form-grid">
                  <div>
                    <label>Funcionario</label>
                    <select
                      value={paymentForm.userId}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          userId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecionar</option>
                      {data.employees
                        .filter((employee) => employee.role !== "admin")
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="inline-row">
                    <div>
                      <label>Data</label>
                      <input
                        type="date"
                        value={paymentForm.date}
                        onChange={(event) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            date: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Valor</label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(event) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            amount: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="inline-row">
                    <div>
                      <label>Tipo</label>
                      <select
                        value={paymentForm.kind}
                        onChange={(event) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            kind: event.target.value as PaymentKind,
                          }))
                        }
                      >
                        <option value="daily">Diaria</option>
                        <option value="salary">Mensal</option>
                        <option value="bonus">Bonus</option>
                        <option value="adjustment">Ajuste</option>
                      </select>
                    </div>
                    <div>
                      <label>Status</label>
                      <select
                        value={paymentForm.status}
                        onChange={(event) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            status: event.target.value as PaymentStatus,
                          }))
                        }
                      >
                        <option value="planned">Previsto</option>
                        <option value="paid">Pago</option>
                      </select>
                    </div>
                  </div>
                  <div className="inline-row">
                    <div>
                      <label>Metodo</label>
                      <input
                        type="text"
                        value={paymentForm.method}
                        onChange={(event) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            method: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Nota</label>
                      <input
                        type="text"
                        value={paymentForm.note}
                        onChange={(event) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            note: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <button className="action-btn" type="button" onClick={handleAddPayment}>
                  Registrar pagamento
                </button>
              </div>

              <div className="payment-list">
                {data.payments.length ? (
                  data.payments.slice(0, 12).map((payment) => {
                    const employee = data.employees.find(
                      (item) => item.id === payment.userId
                    );
                    return (
                      <div key={payment.id} className="payment-item">
                        <div>
                          <strong>{employee?.name ?? "Funcionario"}</strong>
                          <span className="payment-meta">
                            {payment.date} - {payment.kind} - {payment.method}
                          </span>
                          {payment.note ? (
                            <span className="payment-meta">{payment.note}</span>
                          ) : null}
                        </div>
                        <div className="payment-actions">
                          <span
                            className={`status-pill ${
                              payment.status === "paid" ? "approved" : "pending"
                            }`}
                          >
                            {payment.status === "paid" ? "Pago" : "Previsto"}
                          </span>
                          <strong>{formatCurrency(payment.amount)}</strong>
                          <button
                            className="ghost ghost--small"
                            type="button"
                            onClick={() => handleTogglePaymentStatus(payment.id)}
                          >
                            {payment.status === "paid" ? "Marcar previsto" : "Marcar pago"}
                          </button>
                          <button
                            className="ghost ghost--small"
                            type="button"
                            onClick={() => handleRemovePayment(payment.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="entry-note">Sem pagamentos registrados.</span>
                )}
              </div>
            </section>
            </>
          )}
        </div>
      </aside>

      <main className="home">
        <div className="clock-card">
          <div className="clock-time">{timeString}</div>
          <div className="clock-date">{dateString}</div>
        </div>
        <button
          className="shift-button"
          type="button"
          data-active={shiftActive}
          onClick={handleShiftToggle}
          disabled={shiftButtonDisabled}
        >
          {shiftButtonLabel}
        </button>
        {shiftNotice ? (
          <span className={`shift-note ${shiftNoticeTone}`}>{shiftNotice}</span>
        ) : shiftActive && openRecord ? (
          <span className="shift-note">
            Inicio: {new Date(openRecord.startAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </main>
    </div>
  );
}
