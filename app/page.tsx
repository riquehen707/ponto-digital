"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HomeClock from "./components/HomeClock";
import LoginScreen from "./components/LoginScreen";
import AdminSyncBar from "./components/AdminSyncBar";
import {
  type GeoStatus,
  type GeoInfo,
  type Role,
  type PayInfo,
  type Employee,
  type Task,
  type TaskCompletion,
  type TimeOffRequest,
  type PaymentStatus,
  type PaymentKind,
  type PaymentRecord,
  type AdminUser,
  type Organization,
  type Session,
  type PunchRecord,
  type Settings,
  type AppData,
  type ShiftNoticeTone,
  type ReportRange,
  STORAGE_KEY,
  SESSION_KEY,
  APP_STATE_KEY,
  WEEK_LABELS,
  DEFAULT_SETTINGS,
  DEFAULT_TASKS,
  DEFAULT_DATA,
  formatCurrency,
  timeToMinutes,
  getMinutesOfDay,
  isSameDay,
  getLocalDateKey,
  getStartOfDay,
  getDistanceMeters,
  getRangeStart,
  formatWorkDays,
  buildScheduleEntries,
  getDayType,
  createSlug,
  generateToken,
  generateId,
  normalizeOrg,
} from "./lib/app-data";

const ADMIN_NAV_ITEMS = [
  { id: "admin-links", label: "Links" },
  { id: "admin-companies", label: "Empresas" },
  { id: "admin-monitor", label: "Ao vivo" },
  { id: "admin-settings", label: "Config" },
  { id: "admin-team", label: "Equipe" },
  { id: "admin-timeoff", label: "Folgas" },
  { id: "admin-reports", label: "Relatorios" },
  { id: "admin-integrations", label: "Integracoes" },
  { id: "admin-payroll", label: "Folha" },
  { id: "admin-payments", label: "Pagamentos" },
  { id: "admin-profile", label: "Perfil" },
];

export default function Home() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loginError, setLoginError] = useState("");
  const [adminLogin, setAdminLogin] = useState({ email: "", password: "" });
  const [adminLoginError, setAdminLoginError] = useState("");
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
    externalId: "",
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
    externalRef: "",
  });
  const [orgForm, setOrgForm] = useState({ id: "", name: "", mode: "new" as "new" | "edit" });
  const [adminProfileForm, setAdminProfileForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "planned">(
    "all"
  );
  const [paymentLimit, setPaymentLimit] = useState(12);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">(
    "idle"
  );
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const watchIdRef = useRef<number | null>(null);
  const shiftActiveRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const skipNextPushRef = useRef(false);
  const lastSyncRef = useRef<Date | null>(null);
  const syncStatusRef = useRef(syncStatus);
  const syncFetchRef = useRef<Promise<void> | null>(null);

  const activeOrgId =
    session?.type === "staff"
      ? session.orgId
      : data.currentOrgId ?? data.organizations[0]?.id ?? null;
  const activeOrg =
    data.organizations.find((org) => org.id === activeOrgId) ??
    data.organizations[0] ??
    null;

  const adminUser =
    session?.type === "admin"
      ? data.adminUsers.find((admin) => admin.id === session.adminId) ?? null
      : null;
  const currentEmployee =
    session?.type === "staff" && activeOrg
      ? activeOrg.employees.find((emp) => emp.id === session.employeeId) ?? null
      : null;
  const currentEmployeeId = currentEmployee?.id ?? null;

  const isAdmin = session?.type === "admin";
  const canPunch = currentEmployee?.canPunch ?? false;
  const displayName = isAdmin
    ? adminUser?.name || "Admin"
    : currentEmployee?.name || "Usuario";

  const personalProfile = currentEmployee?.role === "staff" ? currentEmployee : null;
  const geofence = activeOrg?.settings ?? DEFAULT_SETTINGS;

  const teamAccounts = activeOrg
    ? activeOrg.employees.filter((employee) => employee.canPunch && !employee.isTest)
    : [];
  const testAccount = activeOrg?.employees.find((employee) => employee.isTest) ?? null;

  const openRecord = useMemo(() => {
    if (!activeOrg || session?.type !== "staff") {
      return null;
    }
    return (
      activeOrg.punchRecords.find(
        (record) => record.userId === session.employeeId && !record.endAt
      ) ?? null
    );
  }, [activeOrg, session]);

  const shiftActive = Boolean(openRecord);

  const normalizeAppData = useCallback(
    (
    parsed: Partial<AppData> & {
      employees?: Employee[];
      settings?: Settings;
      tasks?: Task[];
      completions?: TaskCompletion[];
      timeOffRequests?: TimeOffRequest[];
      payments?: PaymentRecord[];
      punchRecords?: PunchRecord[];
    }
  ): AppData => {
      if (Array.isArray(parsed.organizations)) {
        const organizations = parsed.organizations.map((org, index) =>
          normalizeOrg(org, `org-${index + 1}`, `Empresa ${index + 1}`)
        );
        return {
          adminUsers: Array.isArray(parsed.adminUsers)
            ? parsed.adminUsers
            : DEFAULT_DATA.adminUsers,
          organizations: organizations.length ? organizations : DEFAULT_DATA.organizations,
          currentOrgId:
            parsed.currentOrgId ??
            organizations[0]?.id ??
            DEFAULT_DATA.currentOrgId,
        };
      }

      if (Array.isArray(parsed.employees)) {
        const org = normalizeOrg(
          {
            employees: parsed.employees,
            settings: parsed.settings,
            tasks: parsed.tasks,
            completions: parsed.completions,
            timeOffRequests: parsed.timeOffRequests,
            payments: parsed.payments,
            punchRecords: parsed.punchRecords,
          },
          "org-principal",
          "Empresa Principal"
        );
        return {
          adminUsers: DEFAULT_DATA.adminUsers,
          organizations: [org],
          currentOrgId: org.id,
        };
      }

      return DEFAULT_DATA;
    },
    []
  );

  const updateSyncStamp = useCallback((stamp?: string) => {
    const next = stamp ? new Date(stamp) : new Date();
    lastSyncRef.current = next;
    setLastSyncAt(next);
  }, []);

  const formatSyncError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof Error && error.message) {
        return error.message;
      }
      if (typeof error === "string" && error.trim()) {
        return error.trim();
      }
      return fallback;
    },
    []
  );

  const readResponseError = useCallback(
    async (response: Response, fallback: string) => {
      try {
        const payload = (await response.json()) as { error?: string; detail?: string };
        if (payload?.error && payload?.detail) {
          return `${payload.error} ${payload.detail}`;
        }
        if (payload?.detail) {
          return payload.detail;
        }
        if (payload?.error) {
          return payload.error;
        }
      } catch {
        // ignore parsing errors
      }
      return fallback;
    },
    []
  );

  const applyRemoteData = useCallback(
    (payload: Partial<AppData>, updatedAt?: string) => {
      skipNextPushRef.current = true;
      setData(normalizeAppData(payload));
      setSyncStatus("synced");
      setSyncError("");
      updateSyncStamp(updatedAt);
    },
    [normalizeAppData, updateSyncStamp]
  );

  const pullRemoteData = useCallback(
    async (mode: "auto" | "manual") => {
      if (typeof window === "undefined") {
        return;
      }
      if (syncFetchRef.current) {
        return;
      }
      if (syncStatusRef.current === "syncing") {
        return;
      }
      if (!navigator.onLine) {
        if (mode === "manual") {
          setSyncStatus("idle");
          setSyncError("Sem conexao com a internet.");
        }
        return;
      }
      if (mode === "manual") {
        setSyncStatus("syncing");
        setSyncError("");
      }
      const task = (async () => {
        const response = await fetch(`/api/state?key=${APP_STATE_KEY}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const message = await readResponseError(
            response,
            `Erro ${response.status} ao carregar dados.`
          );
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          data?: Partial<AppData>;
          updatedAt?: string;
        };
        if (!payload?.data) {
          if (mode === "manual") {
            setSyncStatus("synced");
          }
          return;
        }
        const remoteStamp = payload.updatedAt ? new Date(payload.updatedAt) : new Date();
        const lastStamp = lastSyncRef.current;
        if (!lastStamp || remoteStamp > lastStamp) {
          applyRemoteData(payload.data, payload.updatedAt);
          return;
        }
        if (mode === "manual") {
          setSyncStatus("synced");
          updateSyncStamp(payload.updatedAt);
        }
      })();
      syncFetchRef.current = task;
      try {
        await task;
      } catch (error) {
        if (mode === "manual") {
          setSyncStatus("error");
          setSyncError(formatSyncError(error, "Falha ao carregar. Tente novamente."));
        }
      } finally {
        syncFetchRef.current = null;
      }
    },
    [applyRemoteData, formatSyncError, readResponseError, updateSyncStamp]
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

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
    let cancelled = false;

    const loadLocal = () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return null;
      }
      try {
        const parsed = JSON.parse(saved) as Partial<AppData> & {
          employees?: Employee[];
          settings?: Settings;
          tasks?: Task[];
          completions?: TaskCompletion[];
          timeOffRequests?: TimeOffRequest[];
          payments?: PaymentRecord[];
          punchRecords?: PunchRecord[];
        };
        return normalizeAppData(parsed);
      } catch {
        return null;
      }
    };

    const localData = loadLocal();
    if (localData) {
      setData(localData);
    }

    const fetchRemote = async () => {
      setSyncStatus("syncing");
      try {
        const response = await fetch(`/api/state?key=${APP_STATE_KEY}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Erro ao carregar");
        }
        const payload = (await response.json()) as {
          data?: Partial<AppData>;
          updatedAt?: string;
        };
        if (payload?.data) {
          applyRemoteData(payload.data, payload.updatedAt);
        } else if (!localData) {
          setData(DEFAULT_DATA);
          setSyncStatus("synced");
        } else {
          setSyncStatus("synced");
        }
      } catch {
        if (!localData) {
          setData(DEFAULT_DATA);
        }
        setSyncStatus("error");
      } finally {
        if (!cancelled) {
          setDataLoaded(true);
        }
      }
    };

    fetchRemote();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dataLoaded || typeof window === "undefined") {
      return;
    }
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus("idle");
      setSyncError("Sem conexao com a internet.");
      return;
    }
    setSyncStatus("syncing");
    setSyncError("");
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: APP_STATE_KEY, data }),
        });
        if (!response.ok) {
          const message = await readResponseError(
            response,
            `Erro ${response.status} ao salvar dados.`
          );
          throw new Error(message);
        }
        const payload = (await response.json()) as { updatedAt?: string };
        setSyncStatus("synced");
        updateSyncStamp(payload.updatedAt);
      } catch (error) {
        setSyncStatus("error");
        setSyncError(formatSyncError(error, "Falha ao salvar. Verifique a conexao."));
      }
    }, 900);
  }, [data, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded || typeof window === "undefined") {
      return;
    }
    const intervalMs = isAdmin ? 15000 : 30000;
    const interval = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      void pullRemoteData("auto");
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [dataLoaded, isAdmin, pullRemoteData]);

  useEffect(() => {
    if (!dataLoaded || typeof window === "undefined") {
      return;
    }
    const savedSession = window.localStorage.getItem(SESSION_KEY);
    if (!savedSession) {
      return;
    }
    try {
      const parsed = JSON.parse(savedSession) as Session;
      if (parsed.type === "admin") {
        const exists = data.adminUsers.some((admin) => admin.id === parsed.adminId);
        if (exists) {
          setSession(parsed);
        }
      } else if (parsed.type === "staff") {
        const org = data.organizations.find((item) => item.id === parsed.orgId);
        const exists = org?.employees.some((emp) => emp.id === parsed.employeeId);
        if (exists) {
          setSession(parsed);
        }
      }
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [dataLoaded, data.adminUsers, data.organizations]);

  useEffect(() => {
    if (!dataLoaded || typeof window === "undefined") {
      return;
    }
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [dataLoaded, session]);

  useEffect(() => {
    if (!dataLoaded || session || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("autologin");
    if (!token) {
      return;
    }

    const orgParam = params.get("org");
    let matchingOrg = orgParam
      ? data.organizations.find((org) => org.id === orgParam)
      : undefined;
    if (!matchingOrg) {
      matchingOrg = data.organizations.find((org) =>
        org.employees.some((employee) => employee.token === token)
      );
    }
    const matchingAccount = matchingOrg?.employees.find(
      (employee) => employee.token === token
    );
    if (!matchingOrg || !matchingAccount) {
      setLoginError("Link invalido ou expirado");
      return;
    }

    setSession({ type: "staff", orgId: matchingOrg.id, employeeId: matchingAccount.id });
    setLoginError("");
    window.history.replaceState({}, "", window.location.pathname);
  }, [dataLoaded, session, data.organizations]);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (session.type === "admin") {
      const exists = data.adminUsers.some((admin) => admin.id === session.adminId);
      if (!exists) {
        setSession(null);
      }
      return;
    }
    const org = data.organizations.find((item) => item.id === session.orgId);
    const employee = org?.employees.find((emp) => emp.id === session.employeeId);
    if (!employee) {
      setSession(null);
    }
  }, [session, data.adminUsers, data.organizations]);

  useEffect(() => {
    if (!dataLoaded) {
      return;
    }
    if (!data.organizations.length) {
      return;
    }
    const exists = data.organizations.some((org) => org.id === data.currentOrgId);
    if (!exists) {
      setData((prev) => ({
        ...prev,
        currentOrgId: prev.organizations[0]?.id ?? null,
      }));
    }
  }, [dataLoaded, data.organizations, data.currentOrgId]);

  useEffect(() => {
    if (!adminUser) {
      return;
    }
    setAdminProfileForm({ name: adminUser.name, email: adminUser.email, password: "" });
  }, [adminUser]);

  useEffect(() => {
    if (!activeOrg) {
      return;
    }
    setEmployeeForm((prev) => ({
      ...prev,
      shiftStart: activeOrg.settings.shiftStart,
      shiftEnd: activeOrg.settings.shiftEnd,
    }));
    setPaymentForm((prev) => ({
      ...prev,
      userId: "",
      date: getLocalDateKey(new Date()),
      externalRef: "",
    }));
  }, [activeOrgId, activeOrg]);

  useEffect(() => {
    setPaymentLimit(12);
  }, [paymentFilter, activeOrgId]);

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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const updateOrg = (orgId: string, updater: (org: Organization) => Organization) => {
    setData((prev) => ({
      ...prev,
      organizations: prev.organizations.map((org) =>
        org.id === orgId ? updater(org) : org
      ),
    }));
  };

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
    if (!currentEmployeeId || !activeOrgId) {
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
          userId: currentEmployeeId,
          startAt: new Date().toISOString(),
        };

        updateOrg(activeOrgId, (org) => ({
          ...org,
          punchRecords: [...org.punchRecords, newRecord],
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
    if (!openRecord || !activeOrgId) {
      return;
    }
    const closedAt = new Date().toISOString();

    updateOrg(activeOrgId, (org) => ({
      ...org,
      punchRecords: org.punchRecords.map((record) =>
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
    setSession(null);
    setAdminLoginError("");
    setCopiedToken("");
    setShiftNotice("");
    setShiftNoticeTone("default");
    stopWatch();
    setMenuOpen(false);
  };

  const handleCopyLink = async (token: string, orgId?: string) => {
    if (typeof navigator === "undefined") {
      return;
    }

    const orgParam = orgId ? `&org=${orgId}` : "";
    const link = `${origin || ""}/?autologin=${token}${orgParam}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      setCopiedToken("");
    }
  };

  const handleTaskComplete = (taskId: string) => {
    if (!currentEmployeeId || !activeOrgId || !activeOrg) {
      return;
    }
    const alreadyCompleted = activeOrg.completions.some((completion) => {
      if (completion.taskId !== taskId || completion.userId !== currentEmployeeId) {
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
      userId: currentEmployeeId,
      date: new Date().toISOString(),
    };

    updateOrg(activeOrgId, (org) => ({
      ...org,
      completions: [...org.completions, completion],
    }));
  };

  const handleAddTask = () => {
    if (!taskForm.title.trim() || !activeOrgId) {
      return;
    }
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: taskForm.title.trim(),
      points: Math.max(1, Number(taskForm.points) || 1),
      active: true,
    };

    updateOrg(activeOrgId, (org) => ({
      ...org,
      tasks: [...org.tasks, newTask],
    }));
    setTaskForm({ title: "", points: 10 });
  };

  const handleToggleTask = (taskId: string) => {
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      tasks: org.tasks.map((task) =>
        task.id === taskId ? { ...task, active: !task.active } : task
      ),
    }));
  };

  const handleRemoveTask = (taskId: string) => {
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      tasks: org.tasks.filter((task) => task.id !== taskId),
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
      externalId: employee.externalId ?? "",
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
      externalId: "",
      canPunch: true,
      shiftStart: activeOrg?.settings.shiftStart ?? DEFAULT_SETTINGS.shiftStart,
      shiftEnd: activeOrg?.settings.shiftEnd ?? DEFAULT_SETTINGS.shiftEnd,
      workDays: [],
      payType: "daily",
      payAmount: 0,
      payNote: "",
      isTest: false,
    });
  };

  const handleSaveEmployee = () => {
    if (!employeeForm.name.trim() || !activeOrgId) {
      return;
    }

    const slug = createSlug(employeeForm.name);
    const isNew = employeeMode === "new" || !editingEmployeeId;
    const id = isNew ? generateId(slug || "staff") : employeeForm.id;
    let token = isNew
      ? generateToken(slug || "staff")
      : employeeForm.token || generateToken(slug || "staff");

    const tokenExists = data.organizations.some((org) =>
      org.employees.some(
        (employee) => employee.token === token && employee.id !== id
      )
    );
    if (tokenExists) {
      token = generateToken(slug || "staff");
    }

    const newEmployee: Employee = {
      id,
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      role: employeeForm.role,
      token,
      externalId: employeeForm.externalId.trim() || undefined,
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

    updateOrg(activeOrgId, (org) => {
      const existing = org.employees.some((employee) => employee.id === id);
      return {
        ...org,
        employees: existing
          ? org.employees.map((employee) =>
              employee.id === id ? newEmployee : employee
            )
          : [...org.employees, newEmployee],
      };
    });

    resetEmployeeForm();
  };

  const handleRemoveEmployee = (employeeId: string) => {
    if (!activeOrgId || employeeId === currentEmployeeId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      employees: org.employees.filter((employee) => employee.id !== employeeId),
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
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      settings: { ...org.settings, ...patch },
    }));
  };

  const handleCleaningParticipantToggle = (id: string) => {
    if (!activeOrgId || !activeOrg) {
      return;
    }
    updateOrg(activeOrgId, (org) => {
      const exists = org.settings.cleaningParticipants.includes(id);
      return {
        ...org,
        settings: {
          ...org.settings,
          cleaningParticipants: exists
            ? org.settings.cleaningParticipants.filter((item) => item !== id)
            : [...org.settings.cleaningParticipants, id],
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
    if (!currentEmployeeId || !activeOrg) {
      return map;
    }
    activeOrg.timeOffRequests
      .filter((request) => request.userId === currentEmployeeId)
      .forEach((request) => map.set(request.date, request));
    return map;
  }, [activeOrg, currentEmployeeId]);

  const selectedDateKey = useMemo(() => getLocalDateKey(selectedDate), [selectedDate]);

  const selectedRequest = currentEmployeeId
    ? requestMap.get(selectedDateKey) ?? null
    : null;

  const scheduleEntries = useMemo(
    () =>
      buildScheduleEntries(
        selectedDate.getDay(),
        activeOrg?.employees ?? [],
        activeOrg?.settings ?? DEFAULT_SETTINGS
      ),
    [selectedDate, activeOrg]
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
        activeOrg?.employees ?? [],
        activeOrg?.settings ?? DEFAULT_SETTINGS
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
    activeOrg,
    personalProfile,
    requestMap,
    now,
  ]);

  const activeTasks = useMemo(
    () => (activeOrg ? activeOrg.tasks.filter((task) => task.active) : []),
    [activeOrg]
  );

  const completedToday = useMemo(() => {
    const set = new Set<string>();
    if (!currentEmployeeId || !activeOrg) {
      return set;
    }
    activeOrg.completions.forEach((completion) => {
      if (completion.userId !== currentEmployeeId) {
        return;
      }
      if (!isSameDay(new Date(completion.date), now)) {
        return;
      }
      set.add(completion.taskId);
    });
    return set;
  }, [activeOrg, currentEmployeeId, now]);

  const personalRequests = useMemo(() => {
    if (!currentEmployeeId || !activeOrg) {
      return [] as TimeOffRequest[];
    }
    return activeOrg.timeOffRequests
      .filter((request) => request.userId === currentEmployeeId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activeOrg, currentEmployeeId]);

  const adminRequests = useMemo(
    () =>
      (activeOrg ? activeOrg.timeOffRequests : [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [activeOrg]
  );

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    (activeOrg?.tasks ?? []).forEach((task) => map.set(task.id, task));
    return map;
  }, [activeOrg]);

  const pointsByUser = useMemo(() => {
    const totals = new Map<string, number>();
    (activeOrg?.completions ?? []).forEach((completion) => {
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
  }, [activeOrg, tasksById, reportStart]);

  const todayKey = getLocalDateKey(now);
  const rangeDays = useMemo(() => {
    const days: { key: string; weekday: number }[] = [];
    const cursor = new Date(reportStart);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(`${todayKey}T00:00:00`);
    while (cursor < end) {
      days.push({ key: getLocalDateKey(cursor), weekday: cursor.getDay() });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [reportStart, todayKey]);

  const timeOffByUserDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (activeOrg?.timeOffRequests ?? []).forEach((request) => {
      if (request.status === "denied") {
        return;
      }
      const day = new Date(`${request.date}T00:00:00`);
      if (day < reportStart) {
        return;
      }
      const set = map.get(request.userId) ?? new Set<string>();
      set.add(request.date);
      map.set(request.userId, set);
    });
    return map;
  }, [activeOrg, reportStart]);

  const presenceByUserDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (activeOrg?.punchRecords ?? []).forEach((record) => {
      const start = new Date(record.startAt);
      if (start < reportStart) {
        return;
      }
      const key = getLocalDateKey(start);
      const set = map.get(record.userId) ?? new Set<string>();
      set.add(key);
      map.set(record.userId, set);
    });
    return map;
  }, [activeOrg, reportStart]);

  const attendanceByUser = useMemo(() => {
    const map = new Map<string, { absent: number; expected: number }>();
    (activeOrg?.employees ?? []).forEach((employee) => {
      if (employee.role === "admin" || !employee.canPunch) {
        map.set(employee.id, { absent: 0, expected: 0 });
        return;
      }
      const presence = presenceByUserDate.get(employee.id) ?? new Set<string>();
      const timeOff = timeOffByUserDate.get(employee.id) ?? new Set<string>();
      let expected = 0;
      let absent = 0;
      rangeDays.forEach(({ key, weekday }) => {
        if (!employee.workDays.includes(weekday)) {
          return;
        }
        expected += 1;
        if (presence.has(key)) {
          return;
        }
        if (timeOff.has(key)) {
          return;
        }
        absent += 1;
      });
      map.set(employee.id, { absent, expected });
    });
    return map;
  }, [activeOrg, presenceByUserDate, timeOffByUserDate, rangeDays]);

  const formatMinutes = (value: number) => {
    const rounded = Math.round(value);
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    return `${hours}h ${minutes}m`;
  };

  const computeMetrics = (employee: Employee) => {
    const records = (activeOrg?.punchRecords ?? []).filter(
      (record) => record.userId === employee.id
    );
    const dayBuckets = new Map<
      string,
      { earliestStart: Date; latestEnd: Date; totalMinutes: number }
    >();

    records.forEach((record) => {
      const start = new Date(record.startAt);
      if (start < reportStart) {
        return;
      }
      const end = record.endAt ? new Date(record.endAt) : now;
      const duration = Math.max(0, (end.getTime() - start.getTime()) / 60000);
      const dayKey = getLocalDateKey(start);
      const entry = dayBuckets.get(dayKey);
      if (entry) {
        entry.totalMinutes += duration;
        if (start < entry.earliestStart) {
          entry.earliestStart = start;
        }
        if (end > entry.latestEnd) {
          entry.latestEnd = end;
        }
      } else {
        dayBuckets.set(dayKey, {
          earliestStart: start,
          latestEnd: end,
          totalMinutes: duration,
        });
      }
    });

    let totalMinutes = 0;
    let lateCount = 0;
    let overtimeMinutes = 0;

    const shiftStartMinutes = timeToMinutes(
      employee.shiftStart || activeOrg?.settings.shiftStart || DEFAULT_SETTINGS.shiftStart
    );
    const lateAfter =
      shiftStartMinutes +
      (activeOrg?.settings.toleranceMinutes ?? DEFAULT_SETTINGS.toleranceMinutes);

    const overtimeAfter = timeToMinutes(
      activeOrg?.settings.overtimeAfter || employee.shiftEnd || DEFAULT_SETTINGS.overtimeAfter
    );

    dayBuckets.forEach((entry) => {
      totalMinutes += entry.totalMinutes;
      const startMinutes = getMinutesOfDay(entry.earliestStart);
      if (startMinutes > lateAfter) {
        lateCount += 1;
      }
      const endMinutes = getMinutesOfDay(entry.latestEnd);
      if (endMinutes > overtimeAfter) {
        overtimeMinutes += endMinutes - overtimeAfter;
      }
    });

    const attendance = attendanceByUser.get(employee.id);

    return {
      totalMinutes,
      lateCount,
      overtimeMinutes,
      daysWorked: dayBuckets.size,
      absentCount: attendance?.absent ?? 0,
      expectedDays: attendance?.expected ?? 0,
    };
  };

  const reportRows = useMemo(
    () =>
      (activeOrg?.employees ?? [])
        .filter((employee) => employee.role !== "admin")
        .map((employee) => {
          const metrics = computeMetrics(employee);
          return {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            externalId: employee.externalId,
            ...metrics,
            points: pointsByUser.get(employee.id) ?? 0,
          };
        }),
    [activeOrg, reportStart, pointsByUser, attendanceByUser, now]
  );

  const employeeSearchTerm = employeeSearch.trim().toLowerCase();
  const filteredEmployees = useMemo(() => {
    const employees = activeOrg?.employees ?? [];
    if (!employeeSearchTerm) {
      return employees;
    }
    return employees.filter((employee) => {
      const haystack = `${employee.name} ${employee.email} ${
        employee.externalId ?? ""
      }`.toLowerCase();
      return haystack.includes(employeeSearchTerm);
    });
  }, [activeOrg, employeeSearchTerm]);

  const escapeCsv = (value: string | number) => {
    const text = String(value ?? "");
    if (/[\";\n]/.test(text)) {
      return `"${text.replace(/\"/g, '""')}"`;
    }
    return text;
  };

  const reportCsv = useMemo(() => {
    const header = [
      "empresa",
      "nome",
      "id_externo",
      "funcao",
      "dias",
      "faltas",
      "minutos",
      "atrasos",
      "extra_min",
      "pontos",
    ];
    const rows = reportRows.map((row) =>
      [
        escapeCsv(activeOrg?.name ?? "Empresa"),
        escapeCsv(row.name),
        escapeCsv(row.externalId ?? ""),
        escapeCsv(row.role),
        row.daysWorked,
        row.absentCount,
        Math.round(row.totalMinutes),
        row.lateCount,
        Math.round(row.overtimeMinutes),
        row.points,
      ].join(";")
    );
    return [header.join(";"), ...rows].join("\n");
  }, [reportRows, activeOrg]);

  const paymentsInRange = useMemo(() => {
    return (activeOrg?.payments ?? []).filter((payment) => {
      const day = new Date(`${payment.date}T00:00:00`);
      return day >= reportStart;
    });
  }, [activeOrg, reportStart]);

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
      "empresa",
      "nome",
      "id_externo",
      "data",
      "tipo",
      "status",
      "valor",
      "metodo",
      "nota",
      "referencia",
    ];
    const rows = paymentsInRange.map((payment) => {
      const employee = activeOrg?.employees.find((item) => item.id === payment.userId);
      return [
        escapeCsv(activeOrg?.name ?? "Empresa"),
        escapeCsv(employee?.name ?? "Funcionario"),
        escapeCsv(employee?.externalId ?? ""),
        payment.date,
        payment.kind,
        payment.status,
        payment.amount,
        escapeCsv(payment.method),
        escapeCsv(payment.note ?? ""),
        escapeCsv(payment.externalRef ?? ""),
      ].join(";");
    });
    return [header.join(";"), ...rows].join("\n");
  }, [paymentsInRange, activeOrg]);

  const filteredPayments = useMemo(() => {
    const payments = activeOrg?.payments ?? [];
    if (paymentFilter === "all") {
      return payments;
    }
    return payments.filter((payment) => payment.status === paymentFilter);
  }, [activeOrg, paymentFilter]);

  const visiblePayments = filteredPayments.slice(0, paymentLimit);
  const hasMorePayments = filteredPayments.length > paymentLimit;

  const currentMetrics = useMemo(() => {
    if (!currentEmployee) {
      return null;
    }
    return reportRows.find((row) => row.id === currentEmployee.id) ?? null;
  }, [currentEmployee, reportRows]);

  const openShifts = useMemo(() => {
    return (activeOrg?.punchRecords ?? [])
      .filter((record) => !record.endAt)
      .map((record) => {
        const employee = activeOrg?.employees.find((item) => item.id === record.userId);
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
  }, [activeOrg, now]);

  const pendingRequests = useMemo(
    () =>
      (activeOrg?.timeOffRequests ?? []).filter((request) => request.status === "pending")
        .length,
    [activeOrg]
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
    if (!currentEmployeeId || !activeOrgId) {
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
      updateOrg(activeOrgId, (org) => ({
        ...org,
        timeOffRequests: org.timeOffRequests.filter(
          (request) => request.id !== existing.id
        ),
      }));
      return;
    }

    const request: TimeOffRequest = {
      id: `req_${Date.now()}`,
      userId: currentEmployeeId,
      date: selectedDateKey,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    updateOrg(activeOrgId, (org) => ({
      ...org,
      timeOffRequests: [...org.timeOffRequests, request],
    }));
  };

  const handleUpdateTimeOffStatus = (
    id: string,
    status: TimeOffRequest["status"]
  ) => {
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      timeOffRequests: org.timeOffRequests.map((request) =>
        request.id === id ? { ...request, status } : request
      ),
    }));
  };

  const handleRemoveTimeOff = (id: string) => {
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      timeOffRequests: org.timeOffRequests.filter((request) => request.id !== id),
    }));
  };

  const buildExportPayload = () => ({
    version: 2,
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
        employees?: Employee[];
        settings?: Settings;
        tasks?: Task[];
        completions?: TaskCompletion[];
        timeOffRequests?: TimeOffRequest[];
        payments?: PaymentRecord[];
        punchRecords?: PunchRecord[];
      };
      const incoming = (parsed.data ?? parsed) as Partial<AppData> & {
        employees?: Employee[];
        settings?: Settings;
        tasks?: Task[];
        completions?: TaskCompletion[];
        timeOffRequests?: TimeOffRequest[];
        payments?: PaymentRecord[];
        punchRecords?: PunchRecord[];
      };

      if (Array.isArray(incoming.organizations)) {
        const organizations = incoming.organizations.map((org, index) =>
          normalizeOrg(org, `org-${index + 1}`, `Empresa ${index + 1}`)
        );
        setData({
          adminUsers: Array.isArray(incoming.adminUsers)
            ? incoming.adminUsers
            : DEFAULT_DATA.adminUsers,
          organizations: organizations.length ? organizations : DEFAULT_DATA.organizations,
          currentOrgId:
            incoming.currentOrgId ??
            organizations[0]?.id ??
            DEFAULT_DATA.currentOrgId,
        });
      } else if (Array.isArray(incoming.employees)) {
        const org = normalizeOrg(
          {
            employees: incoming.employees,
            settings: incoming.settings,
            tasks: incoming.tasks,
            completions: incoming.completions,
            timeOffRequests: incoming.timeOffRequests,
            payments: incoming.payments,
            punchRecords: incoming.punchRecords,
          },
          "org-principal",
          "Empresa Principal"
        );
        setData({
          adminUsers: DEFAULT_DATA.adminUsers,
          organizations: [org],
          currentOrgId: org.id,
        });
      } else {
        throw new Error("Formato invalido");
      }
      setImportData("");
      setImportError("");
      setExportNotice("Importacao concluida.");
    } catch (error) {
      setImportError("Erro ao importar. Verifique o JSON.");
    }
  };

  const handleSyncNow = async () => {
    await pullRemoteData("manual");
  };

  const handleForceSave = async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus("idle");
      setSyncError("Sem conexao com a internet.");
      return;
    }
    setSyncStatus("syncing");
    setSyncError("");
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: APP_STATE_KEY, data }),
      });
      if (!response.ok) {
        const message = await readResponseError(
          response,
          `Erro ${response.status} ao salvar dados.`
        );
        throw new Error(message);
      }
      const payload = (await response.json()) as { updatedAt?: string };
      setSyncStatus("synced");
      updateSyncStamp(payload.updatedAt);
    } catch (error) {
      setSyncStatus("error");
      setSyncError(formatSyncError(error, "Falha ao inicializar. Verifique o servidor."));
    }
  };

  const handleAddPayment = () => {
    if (!paymentForm.userId || !paymentForm.date || !paymentForm.amount || !activeOrgId) {
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
      externalRef: paymentForm.externalRef.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    updateOrg(activeOrgId, (org) => ({
      ...org,
      payments: [record, ...org.payments],
    }));
    setPaymentForm((prev) => ({
      ...prev,
      amount: 0,
      note: "",
      externalRef: "",
      status: "planned",
    }));
  };

  const handleTogglePaymentStatus = (id: string) => {
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      payments: org.payments.map((payment) =>
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
    if (!activeOrgId) {
      return;
    }
    updateOrg(activeOrgId, (org) => ({
      ...org,
      payments: org.payments.filter((payment) => payment.id !== id),
    }));
  };

  const handleAdminLogin = () => {
    if (!adminLogin.email.trim() || !adminLogin.password.trim()) {
      setAdminLoginError("Informe email e senha.");
      return;
    }
    const admin = data.adminUsers.find(
      (item) =>
        item.email.toLowerCase() === adminLogin.email.trim().toLowerCase() &&
        item.password === adminLogin.password
    );
    if (!admin) {
      setAdminLoginError("Credenciais invalidas.");
      return;
    }
    setSession({ type: "admin", adminId: admin.id });
    setAdminLogin({ email: admin.email, password: "" });
    setAdminLoginError("");
    setLoginError("");
    setMenuOpen(false);
    setData((prev) => ({
      ...prev,
      currentOrgId: prev.currentOrgId ?? prev.organizations[0]?.id ?? null,
    }));
  };

  const handleSelectOrg = (orgId: string) => {
    setData((prev) => ({
      ...prev,
      currentOrgId: orgId,
    }));
  };

  const handleSaveOrg = () => {
    if (!orgForm.name.trim()) {
      return;
    }
    if (orgForm.mode === "new") {
      const slug = createSlug(orgForm.name) || "empresa";
      const id = generateId(slug);
      const baseSettings = activeOrg?.settings ?? DEFAULT_SETTINGS;
      const baseTasks = activeOrg?.tasks ?? DEFAULT_TASKS;
      const newOrg: Organization = {
        id,
        name: orgForm.name.trim(),
        slug,
        employees: [],
        settings: { ...baseSettings },
        tasks: baseTasks.map((task) => ({ ...task })),
        completions: [],
        timeOffRequests: [],
        payments: [],
        punchRecords: [],
      };
      setData((prev) => ({
        ...prev,
        organizations: [...prev.organizations, newOrg],
        currentOrgId: id,
      }));
    } else if (orgForm.mode === "edit" && orgForm.id) {
      setData((prev) => ({
        ...prev,
        organizations: prev.organizations.map((org) =>
          org.id === orgForm.id
            ? {
                ...org,
                name: orgForm.name.trim(),
                slug: createSlug(orgForm.name) || org.slug,
              }
            : org
        ),
      }));
    }
    setOrgForm({ id: "", name: "", mode: "new" });
  };

  const handleEditOrg = (org: Organization) => {
    setOrgForm({ id: org.id, name: org.name, mode: "edit" });
  };

  const handleRemoveOrg = (orgId: string) => {
    if (data.organizations.length <= 1) {
      return;
    }
    setData((prev) => {
      const filtered = prev.organizations.filter((org) => org.id !== orgId);
      const nextOrgId =
        prev.currentOrgId === orgId ? filtered[0]?.id ?? null : prev.currentOrgId;
      return {
        ...prev,
        organizations: filtered,
        currentOrgId: nextOrgId,
      };
    });
  };

  const handleSaveAdminProfile = () => {
    if (!adminUser) {
      return;
    }
    setData((prev) => ({
      ...prev,
      adminUsers: prev.adminUsers.map((admin) =>
        admin.id === adminUser.id
          ? {
              ...admin,
              name: adminProfileForm.name.trim() || admin.name,
              email: adminProfileForm.email.trim() || admin.email,
              password: adminProfileForm.password
                ? adminProfileForm.password
                : admin.password,
            }
          : admin
      ),
    }));
    setAdminProfileForm((prev) => ({ ...prev, password: "" }));
  };

  if (!session) {
    return (
      <LoginScreen
        origin={origin}
        loginError={loginError}
        adminLogin={adminLogin}
        adminLoginError={adminLoginError}
        onAdminEmailChange={(value) =>
          setAdminLogin((prev) => ({ ...prev, email: value }))
        }
        onAdminPasswordChange={(value) =>
          setAdminLogin((prev) => ({ ...prev, password: value }))
        }
        onAdminLogin={handleAdminLogin}
      />
    );
  }

  const timeOffLabels: Record<TimeOffRequest["status"], string> = {
    pending: "Pendente",
    approved: "Aprovada",
    denied: "Negada",
  };

  const currentPoints = currentEmployee
    ? pointsByUser.get(currentEmployee.id) ?? 0
    : 0;

  const pointsToday = Array.from(completedToday).reduce((total, taskId) => {
    const task = tasksById.get(taskId);
    return total + (task?.points ?? 0);
  }, 0);

  const selectedDayType = getDayType(
    selectedDate.getDay(),
    personalProfile,
    activeOrg?.employees ?? [],
    activeOrg?.settings ?? DEFAULT_SETTINGS
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
            <div className="menu-subtitle">Bem vindo, {displayName}</div>
            {isAdmin ? (
              <div className="menu-org">
                <label>Empresa ativa</label>
                <select
                  value={activeOrgId ?? ""}
                  onChange={(event) => handleSelectOrg(event.target.value)}
                >
                  {data.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
                    : `${
                        activeOrg?.settings.shiftStart ?? DEFAULT_SETTINGS.shiftStart
                      }-${
                        activeOrg?.settings.shiftEnd ?? DEFAULT_SETTINGS.shiftEnd
                      }`}
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
                  {currentMetrics?.expectedDays
                    ? ` / ${currentMetrics.expectedDays}`
                    : ""}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Atrasos</span>
                <span className="stat-value">{currentMetrics?.lateCount ?? 0}</span>
                <span className="stat-note">
                  Tolerancia{" "}
                  {activeOrg?.settings.toleranceMinutes ?? DEFAULT_SETTINGS.toleranceMinutes}m
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Faltas</span>
                <span className="stat-value">{currentMetrics?.absentCount ?? 0}</span>
                <span className="stat-note">Dias sem registro</span>
              </div>
              <div className="stat">
                <span className="stat-label">Hora extra</span>
                <span className="stat-value">
                  {currentMetrics
                    ? formatMinutes(currentMetrics.overtimeMinutes)
                    : "0h 0m"}
                </span>
                <span className="stat-note">
                  Apos {activeOrg?.settings.overtimeAfter ?? DEFAULT_SETTINGS.overtimeAfter}
                </span>
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
                    Equipe ativa{" "}
                    {(activeOrg?.employees ?? []).filter(
                      (employee) => employee.role !== "admin"
                    ).length}
                  </span>
                </div>
              ) : null}
              {isAdmin ? (
                <div className="stat">
                  <span className="stat-label">Equipe online</span>
                  <span className="stat-value">{openShifts.length}</span>
                  <span className="stat-note">Turnos ativos agora</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="tool-card account-card">
            <div className="account-header">
              <div>
                <div className="account-name">
                  {isAdmin ? adminUser?.name ?? "Admin" : currentEmployee?.name ?? "Usuario"}
                </div>
                <div className="account-email">
                  {isAdmin
                    ? adminUser?.email ?? "Sem email"
                    : currentEmployee?.email || "Sem email"}
                </div>
              </div>
              <span className={`role-pill ${isAdmin ? "admin" : currentEmployee?.role}`}>
                {isAdmin ? "admin" : currentEmployee?.role}
              </span>
            </div>
            {isAdmin ? (
              <p className="entry-note">
                Empresa selecionada: {activeOrg?.name ?? "Nenhuma"}
              </p>
            ) : (
              <p className="entry-note">
                Escala: {formatWorkDays(currentEmployee?.workDays ?? [])} | Turno{" "}
                {currentEmployee?.shiftStart}-{currentEmployee?.shiftEnd}
              </p>
            )}
            <div className="action-grid">
              <button className="action-btn" type="button" onClick={handleLogout}>
                Sair
              </button>
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
            <section className="tool-card admin-card admin-nav-card" id="admin-top">
              <div className="admin-header">
                <h3>Painel admin</h3>
                <span className="admin-pill">Atalhos</span>
              </div>
              <p>Navegacao rapida para as principais areas.</p>
              <nav className="admin-nav" aria-label="Atalhos admin">
                {ADMIN_NAV_ITEMS.map((item) => (
                  <a key={item.id} className="admin-nav-pill" href={`#${item.id}`}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </section>

            <section className="tool-card admin-card" id="admin-links">
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
                            ? `${origin}/?autologin=${employee.token}${
                                activeOrgId ? `&org=${activeOrgId}` : ""
                              }`
                            : `/?autologin=${employee.token}${
                                activeOrgId ? `&org=${activeOrgId}` : ""
                              }`}
                        </span>
                      </div>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleCopyLink(employee.token, activeOrgId ?? undefined)}
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
                          ? `${origin}/?autologin=${testAccount.token}${
                              activeOrgId ? `&org=${activeOrgId}` : ""
                            }`
                          : `/?autologin=${testAccount.token}${
                              activeOrgId ? `&org=${activeOrgId}` : ""
                            }`}
                      </span>
                    </div>
                    <button
                      className="ghost ghost--small"
                      type="button"
                      onClick={() => handleCopyLink(testAccount.token, activeOrgId ?? undefined)}
                    >
                      {copiedToken === testAccount.token ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="tool-card admin-card" id="admin-companies">
              <div className="admin-header">
                <h3>Empresas</h3>
                <span className="admin-pill">Multi</span>
              </div>
              <p>Gerencie varias empresas com o mesmo admin.</p>
              <div className="org-list">
                {data.organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`org-item ${org.id === activeOrgId ? "is-active" : ""}`}
                  >
                    <div>
                      <strong>{org.name}</strong>
                      <span className="entry-note">
                        Pessoas: {org.employees.length} | ID: {org.slug}
                      </span>
                    </div>
                    <div className="org-actions">
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleSelectOrg(org.id)}
                      >
                        {org.id === activeOrgId ? "Ativa" : "Selecionar"}
                      </button>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleEditOrg(org)}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleRemoveOrg(org.id)}
                        disabled={data.organizations.length <= 1}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="org-form">
                <h4>{orgForm.mode === "new" ? "Nova empresa" : "Editar empresa"}</h4>
                <div className="form-grid">
                  <div>
                    <label>Nome da empresa</label>
                    <input
                      type="text"
                      value={orgForm.name}
                      onChange={(event) =>
                        setOrgForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="action-grid">
                  <button className="action-btn" type="button" onClick={handleSaveOrg}>
                    {orgForm.mode === "new" ? "Adicionar empresa" : "Salvar empresa"}
                  </button>
                  <button
                    className="ghost ghost--small"
                    type="button"
                    onClick={() => setOrgForm({ id: "", name: "", mode: "new" })}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </section>

            <section className="tool-card admin-card" id="admin-monitor">
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

            <section className="tool-card admin-card" id="admin-settings">
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
                      value={activeOrg?.settings.shiftStart ?? DEFAULT_SETTINGS.shiftStart}
                      onChange={(event) =>
                        handleSettingsChange({ shiftStart: event.target.value })
                      }
                    />
                    <input
                      type="time"
                      value={activeOrg?.settings.shiftEnd ?? DEFAULT_SETTINGS.shiftEnd}
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
                      value={
                        activeOrg?.settings.toleranceMinutes ??
                        DEFAULT_SETTINGS.toleranceMinutes
                      }
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
                      value={activeOrg?.settings.overtimeAfter ?? DEFAULT_SETTINGS.overtimeAfter}
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
                    value={activeOrg?.settings.geofenceName ?? DEFAULT_SETTINGS.geofenceName}
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
                      value={
                        activeOrg?.settings.geofencePlusCode ??
                        DEFAULT_SETTINGS.geofencePlusCode
                      }
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
                      value={
                        activeOrg?.settings.geofenceRadius ??
                        DEFAULT_SETTINGS.geofenceRadius
                      }
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
                      value={activeOrg?.settings.geofenceLat ?? DEFAULT_SETTINGS.geofenceLat}
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
                      value={activeOrg?.settings.geofenceLng ?? DEFAULT_SETTINGS.geofenceLng}
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
                      value={activeOrg?.settings.cleaningDay ?? DEFAULT_SETTINGS.cleaningDay}
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
                      value={
                        activeOrg?.settings.cleaningStart ?? DEFAULT_SETTINGS.cleaningStart
                      }
                      onChange={(event) =>
                        handleSettingsChange({
                          cleaningStart: event.target.value,
                        })
                      }
                    />
                    <input
                      type="time"
                      value={activeOrg?.settings.cleaningEnd ?? DEFAULT_SETTINGS.cleaningEnd}
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
                    value={activeOrg?.settings.cleaningNote ?? DEFAULT_SETTINGS.cleaningNote}
                    onChange={(event) =>
                      handleSettingsChange({ cleaningNote: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Participantes da limpeza</label>
                  <div className="toggle-list">
                    {(activeOrg?.employees ?? [])
                      .filter((employee) => employee.role !== "admin")
                      .map((employee) => (
                        <label key={employee.id} className="toggle-row">
                          <input
                            type="checkbox"
                            checked={(activeOrg?.settings.cleaningParticipants ?? []).includes(
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

            <section className="tool-card admin-card" id="admin-profile">
              <div className="admin-header">
                <h3>Conta admin</h3>
                <span className="admin-pill">Perfil</span>
              </div>
              <p>Atualize email e senha do admin.</p>
              <div className="form-grid">
                <div>
                  <label>Nome</label>
                  <input
                    type="text"
                    value={adminProfileForm.name}
                    onChange={(event) =>
                      setAdminProfileForm((prev) => ({
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
                    value={adminProfileForm.email}
                    onChange={(event) =>
                      setAdminProfileForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label>Nova senha</label>
                  <input
                    type="password"
                    value={adminProfileForm.password}
                    onChange={(event) =>
                      setAdminProfileForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                  />
                  <span className="entry-note">
                    Deixe vazio para manter a senha atual.
                  </span>
                </div>
              </div>
              <button className="action-btn" type="button" onClick={handleSaveAdminProfile}>
                Salvar perfil admin
              </button>
            </section>

            <section className="tool-card admin-card" id="admin-team">
              <div className="admin-header">
                <h3>Cadastro de funcionarios</h3>
                <span className="admin-pill">Equipe</span>
              </div>
              <p>Crie contas, personalize escalas e permissoes.</p>
              <div className="employee-search">
                <label>Buscar</label>
                <input
                  type="text"
                  value={employeeSearch}
                  placeholder="Nome, email ou ID externo"
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                />
              </div>
              <div className="employee-list">
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => (
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
                          {employee.externalId ? (
                            <span className="employee-meta">
                              ID externo: {employee.externalId}
                            </span>
                          ) : null}
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
                          onClick={() =>
                            handleCopyLink(employee.token, activeOrgId ?? undefined)
                          }
                        >
                          {copiedToken === employee.token ? "Copiado" : "Copiar link"}
                        </button>
                        <button
                          className="ghost ghost--small"
                          type="button"
                          onClick={() => handleRemoveEmployee(employee.id)}
                          disabled={employee.id === currentEmployeeId}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="entry-note">Nenhum funcionario encontrado.</span>
                )}
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
                  <div>
                    <label>ID externo</label>
                    <input
                      type="text"
                      value={employeeForm.externalId}
                      onChange={(event) =>
                        setEmployeeForm((prev) => ({
                          ...prev,
                          externalId: event.target.value,
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

            <section className="tool-card admin-card" id="admin-timeoff">
              <div className="admin-header">
                <h3>Solicitacoes de folga</h3>
                <span className="admin-pill">Admin</span>
              </div>
              <p>Ajuste o status das solicitacoes.</p>
              <div className="timeoff-list">
                {adminRequests.length ? (
                  adminRequests.map((request) => {
                    const employee = activeOrg?.employees.find(
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

            <section className="tool-card admin-card" id="admin-tasks">
              <div className="admin-header">
                <h3>Tarefas da empresa</h3>
                <span className="admin-pill">Pontos</span>
              </div>
              <p>Gerencie tarefas e pontos.</p>
              <div className="task-list">
                {(activeOrg?.tasks ?? []).length ? (
                  (activeOrg?.tasks ?? []).map((task) => (
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

            <section className="tool-card admin-card" id="admin-reports">
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
                          <span className="stat-label">Faltas</span>
                          <strong>{row.absentCount}</strong>
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

            <section className="tool-card admin-card" id="admin-integrations">
              <div className="admin-header">
                <h3>Integracoes</h3>
                <span className="admin-pill">Exportacao</span>
              </div>
              <p>Exporte dados para outros sistemas ou importe ajustes.</p>
              <div className="sync-status">
                <span
                  className={`status-pill ${
                    syncStatus === "synced"
                      ? "approved"
                      : syncStatus === "syncing"
                      ? "pending"
                      : syncStatus === "error"
                      ? "denied"
                      : ""
                  }`}
                >
                  {syncStatus === "synced"
                    ? "Sincronizado"
                    : syncStatus === "syncing"
                    ? "Sincronizando"
                    : syncStatus === "error"
                    ? "Falha"
                    : "Offline"}
                </span>
                <span className="entry-note">
                  Ultima sync:{" "}
                  {lastSyncAt ? lastSyncAt.toLocaleString("pt-BR") : "Sem registro"}
                </span>
                <button className="ghost ghost--small" type="button" onClick={handleSyncNow}>
                  Sincronizar agora
                </button>
              </div>
              <div className="action-grid">
                <button className="action-btn" type="button" onClick={handleForceSave}>
                  Inicializar banco
                </button>
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

            <section className="tool-card admin-card" id="admin-payroll">
              <div className="admin-header">
                <h3>Folha de pagamento</h3>
                <span className="admin-pill">Admin</span>
              </div>
              <p>Valores visiveis apenas para o admin.</p>
              <div className="admin-payroll">
                {(activeOrg?.employees ?? []).filter((employee) => employee.pay).length ? (
                  (activeOrg?.employees ?? [])
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

            <section className="tool-card admin-card" id="admin-payments">
              <div className="admin-header">
                <h3>Pagamentos</h3>
                <span className="admin-pill">Financeiro</span>
              </div>
              <p>Registre pagamentos, bonus e ajustes.</p>
              <div className="payment-summary">
                {(activeOrg?.employees ?? [])
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
                      {(activeOrg?.employees ?? [])
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
                  <div>
                    <label>Referencia externa</label>
                    <input
                      type="text"
                      value={paymentForm.externalRef}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          externalRef: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <button className="action-btn" type="button" onClick={handleAddPayment}>
                  Registrar pagamento
                </button>
              </div>

              <div className="payment-filter">
                <label>Filtro</label>
                <select
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(event.target.value as "all" | "paid" | "planned")
                  }
                >
                  <option value="all">Todos</option>
                  <option value="paid">Pagos</option>
                  <option value="planned">Previstos</option>
                </select>
              </div>

              <div className="payment-list">
                {visiblePayments.length ? (
                  visiblePayments.map((payment) => {
                    const employee = activeOrg?.employees.find(
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
                          {payment.externalRef ? (
                            <span className="payment-meta">
                              Ref: {payment.externalRef}
                            </span>
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
                {hasMorePayments ? (
                  <button
                    className="ghost ghost--small"
                    type="button"
                    onClick={() => setPaymentLimit((prev) => prev + 12)}
                  >
                    Ver mais
                  </button>
                ) : null}
              </div>
            </section>
            </>
          )}
        </div>
      </aside>

      {isAdmin ? (
        <AdminSyncBar
          syncStatus={syncStatus}
          lastSyncAt={lastSyncAt}
          errorMessage={syncError}
          onSyncNow={handleSyncNow}
          onForceSave={handleForceSave}
        />
      ) : null}

      <HomeClock
        timeString={timeString}
        dateString={dateString}
        shiftActive={shiftActive}
        shiftNotice={shiftNotice}
        shiftNoticeTone={shiftNoticeTone}
        shiftButtonLabel={shiftButtonLabel}
        shiftButtonDisabled={shiftButtonDisabled}
        onShiftToggle={handleShiftToggle}
        openRecordStartAt={openRecord?.startAt}
      />
    </div>
  );
}
