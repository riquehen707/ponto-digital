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

type Role = "admin" | "staff";

type Account = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type DemoAccount = Account & {
  token: string;
};

type StaffRole = "staff" | "manager" | "support";

type PayInfo = {
  type: "daily" | "monthly";
  amount: number;
  note?: string;
};

type StaffProfile = {
  id: string;
  name: string;
  scheduleName: string;
  role: StaffRole;
  shift: string;
  workDays: number[];
  pay?: PayInfo;
};

type ScheduleEntry = {
  title: string;
  time: string;
  people: string[];
  note?: string;
  tone: "work" | "manager" | "cleaning";
};

type ShiftNoticeTone = "default" | "success" | "error";

const GEOFENCE = {
  name: "VH89+92 Teresopolis, Alagoinhas - BA",
  plusCode: "VH89+92",
  fullCode: "59V3VH89+92",
  lat: -12.1340625,
  lng: -38.4324375,
  radiusMeters: 120,
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "admin",
    name: "Henrique Admin",
    email: "admin@empresa.com",
    role: "admin",
    token: "admin-hq",
  },
  {
    id: "ayra",
    name: "Ayra",
    email: "ayra@empresa.com",
    role: "staff",
    token: "ayra-2026",
  },
  {
    id: "nathyeli",
    name: "Nathyeli",
    email: "nathyeli@empresa.com",
    role: "staff",
    token: "nathyeli-2026",
  },
  {
    id: "henrique-teste",
    name: "Henrique Teste",
    email: "teste@empresa.com",
    role: "staff",
    token: "henrique-teste",
  },
];

const TEAM_ACCOUNTS = DEMO_ACCOUNTS.filter(
  (account) => account.role === "staff" && account.id !== "henrique-teste"
);

const TEST_ACCOUNT = DEMO_ACCOUNTS.find(
  (account) => account.id === "henrique-teste"
);

const ADMIN_ACCOUNTS = DEMO_ACCOUNTS.filter(
  (account) => account.role === "admin"
);

const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

const SHIFT_TIME = "16:00-22:00";
const CLEANING_DAY = 6;

const STAFF_PROFILES: StaffProfile[] = [
  {
    id: "ayra",
    name: "Ayra",
    scheduleName: "Ayra",
    role: "staff",
    shift: SHIFT_TIME,
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
    scheduleName: "Nathyeli",
    role: "staff",
    shift: SHIFT_TIME,
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
    scheduleName: "Mariza (gerente)",
    role: "manager",
    shift: "Gerente (sem ponto)",
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
    scheduleName: "Bezinha (cobertura)",
    role: "support",
    shift: SHIFT_TIME,
    workDays: [2, 3],
    pay: {
      type: "daily",
      amount: 70,
      note: "Cobre ter/qua quando Mariza folga",
    },
  },
];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const getEntriesForDay = (weekday: number): ScheduleEntry[] => {
  const entries: ScheduleEntry[] = [];

  if (weekday === CLEANING_DAY) {
    entries.push({
      title: "Limpeza geral",
      time: "09:00-12:00",
      people: ["Ayra", "Nathyeli"],
      note: "2-3h (1x/semana, a combinar)",
      tone: "cleaning",
    });
  }

  const shiftWorkers = STAFF_PROFILES.filter(
    (profile) => profile.role !== "manager" && profile.workDays.includes(weekday)
  );

  if (shiftWorkers.length) {
    entries.push({
      title: `Turno ${SHIFT_TIME}`,
      time: SHIFT_TIME,
      people: shiftWorkers.map((profile) => profile.scheduleName),
      tone: "work",
    });
  }

  const manager = STAFF_PROFILES.find(
    (profile) => profile.role === "manager" && profile.workDays.includes(weekday)
  );

  if (manager) {
    entries.push({
      title: "Gerencia (sem ponto)",
      time: "Escala gerente",
      people: [manager.scheduleName],
      tone: "manager",
    });
  }

  return entries;
};

const getDayType = (weekday: number, profile: StaffProfile | null) => {
  if (profile) {
    return profile.workDays.includes(weekday) ? "work" : "off";
  }
  return getEntriesForDay(weekday).length ? "work" : "off";
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftNotice, setShiftNotice] = useState("");
  const [shiftNoticeTone, setShiftNoticeTone] = useState<ShiftNoticeTone>("default");
  const [menuOpen, setMenuOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoInfo, setGeoInfo] = useState<GeoInfo>({});
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [loginError, setLoginError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copiedToken, setCopiedToken] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const shiftActiveRef = useRef(false);

  const isAdmin = currentUser?.role === "admin";
  const canPunch = currentUser?.role === "staff";

  const personalProfile =
    currentUser?.role === "staff"
      ? STAFF_PROFILES.find((profile) => profile.id === currentUser.id) ?? null
      : null;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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
    if (currentUser || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("autologin");
    if (!token) {
      return;
    }

    const matchingAccount = DEMO_ACCOUNTS.find(
      (account) => account.token === token
    );

    if (!matchingAccount) {
      setLoginError("Link invalido ou expirado");
      return;
    }

    setCurrentUser({
      id: matchingAccount.id,
      name: matchingAccount.name,
      email: matchingAccount.email,
      role: matchingAccount.role,
    });
    setLoginError("");
    window.history.replaceState({}, "", window.location.pathname);
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }
    };
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
      GEOFENCE.lat,
      GEOFENCE.lng
    );
    const inside = distance <= GEOFENCE.radiusMeters;

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
          setShiftActive(false);
          setShiftNotice("Saiu do ponto, turno encerrado automaticamente.");
          setShiftNoticeTone("error");
          stopWatch();
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

  const attemptStartShift = () => {
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
          setShiftActive(false);
          setShiftNotice("Voce esta fora do ponto permitido.");
          setShiftNoticeTone("error");
          return;
        }

        setShiftActive(true);
        setShiftNotice("Turno iniciado dentro do raio.");
        setShiftNoticeTone("success");
        startWatch();
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

  const handleShiftToggle = () => {
    if (shiftActive) {
      setShiftActive(false);
      setShiftNotice("Turno encerrado.");
      setShiftNoticeTone("default");
      stopWatch();
      return;
    }

    attemptStartShift();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCopiedToken("");
    setShiftActive(false);
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

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - offset + 1;
      const date = new Date(year, month, dayNumber);
      const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const dayType = getDayType(date.getDay(), personalProfile);

      return {
        date,
        isCurrentMonth,
        isToday: isSameDay(date, now),
        isSelected: isSameDay(date, selectedDate),
        dayType,
      };
    });
  }, [viewMonth, selectedDate, now, personalProfile]);

  const selectedEntries = useMemo(
    () => getEntriesForDay(selectedDate.getDay()),
    [selectedDate]
  );

  const personalStatus = personalProfile
    ? personalProfile.workDays.includes(selectedDate.getDay())
      ? "work"
      : "off"
    : null;

  const selectedDayType = getDayType(selectedDate.getDay(), personalProfile);
  const formattedSelectedDate = selectedDate.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  });

  const legendWorkLabel = personalProfile ? "Seu trabalho" : "Equipe ativa";
  const legendOffLabel = personalProfile ? "Sua folga" : "Sem equipe";

  const geoMinutesAgo = geoInfo.updatedAt
    ? Math.max(0, Math.floor((now.getTime() - geoInfo.updatedAt.getTime()) / 60000))
    : null;

  const distanceLabel =
    geoInfo.distance !== undefined ? `${Math.round(geoInfo.distance)}m` : "--";

  const insideLabel =
    geoInfo.inside === undefined
      ? "Sem verificacao"
      : geoInfo.inside
        ? "Dentro do ponto"
        : "Fora do ponto";

  const geoTitle =
    geoStatus === "ready"
      ? geoInfo.inside === undefined
        ? "GPS pronto"
        : geoInfo.inside
          ? "No ponto"
          : "Fora do ponto"
      : geoStatus === "loading"
        ? "Buscando sinal"
        : geoStatus === "error"
          ? "GPS indisponivel"
          : "Aguardando GPS";

  const geoDetail =
    geoStatus === "ready"
      ? `Ponto ${GEOFENCE.plusCode} - Distancia ${distanceLabel} - ${insideLabel} - Atualizado ha ${
          geoMinutesAgo ?? 0
        } min`
      : geoStatus === "loading"
        ? "Solicitando localizacao"
        : geoStatus === "error"
          ? geoInfo.error ?? "Permissao necessaria"
          : "Clique para atualizar o local";

  const goPrevMonth = () =>
    setViewMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      setSelectedDate(next);
      return next;
    });
  const goNextMonth = () =>
    setViewMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      setSelectedDate(next);
      return next;
    });
  const goToday = () => {
    const today = new Date();
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  if (!currentUser) {
    return (
      <div className="page login">
        <main className="login-shell">
          <div className="login-card">
            <p className="login-brand">Ponto Vivo</p>
            <h1>Acesso por link</h1>
            <p className="login-subtitle">
              Este app funciona apenas com links individuais. Abra o link enviado
              pelo admin.
            </p>
            {loginError ? <span className="login-error">{loginError}</span> : null}
            <div className="login-hint">
              <span>Precisa de acesso?</span>
              <span>Fale com o admin para gerar seu link.</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`page ${menuOpen ? "page--menu-open" : ""}`}>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="ferramentas-menu"
        onClick={() => setMenuOpen(true)}
      >
        Ferramentas
      </button>

      <div
        className="menu-overlay"
        role="presentation"
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="ferramentas-menu"
        className="menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        aria-label="Ferramentas da equipe"
      >
        <header className="menu-header">
          <div>
            <p className="menu-title">Ferramentas</p>
            <p className="menu-subtitle">Ola, {currentUser.name}</p>
          </div>
          <button
            className="menu-close"
            type="button"
            onClick={() => setMenuOpen(false)}
          >
            Fechar
          </button>
        </header>

        <div className="menu-grid">
          <section className="tool-card tool-card--calendar">
            <div className="card-header">
              <div>
                <h3>Escala e calendario</h3>
                <p>Toque no dia para ver a escala e selecionar folga.</p>
              </div>
              <div className="month-nav">
                <button
                  className="ghost ghost--icon"
                  type="button"
                  onClick={goPrevMonth}
                  aria-label="Mes anterior"
                >
                  {"<"}
                </button>
                <span className="month-label">{monthLabel}</span>
                <button
                  className="ghost ghost--icon"
                  type="button"
                  onClick={goNextMonth}
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
                {calendarCells.map((cell) => (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    className={`calendar-day ${cell.dayType} ${
                      cell.isCurrentMonth ? "" : "is-outside"
                    } ${cell.isToday ? "is-today" : ""} ${
                      cell.isSelected ? "is-selected" : ""
                    }`}
                    onClick={() => cell.isCurrentMonth && setSelectedDate(cell.date)}
                    disabled={!cell.isCurrentMonth}
                    aria-pressed={cell.isSelected}
                    aria-label={cell.date.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  >
                    {cell.date.getDate()}
                  </button>
                ))}
              </div>
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot work" />
                {legendWorkLabel}
              </div>
              <div className="legend-item">
                <span className="legend-dot off" />
                {legendOffLabel}
              </div>
              <button className="ghost ghost--small" type="button" onClick={goToday}>
                Ir para hoje
              </button>
            </div>

            <div className="day-details">
              <div className="day-meta">
                <div>
                  <p className="day-title">Dia selecionado</p>
                  <strong>{formattedSelectedDate}</strong>
                </div>
                <span className={`day-pill ${personalStatus ?? selectedDayType}`}>
                  {personalStatus
                    ? personalStatus === "work"
                      ? "Seu turno: trabalho"
                      : "Seu turno: folga"
                    : selectedDayType === "work"
                      ? "Equipe ativa"
                      : "Sem equipe"}
                </span>
              </div>
              {personalProfile ? (
                <div className="personal-shift">
                  <span>Seu horario:</span>
                  <strong>{personalProfile.shift}</strong>
                </div>
              ) : null}
              <div className="day-entries">
                {selectedEntries.map((entry) => (
                  <div
                    key={`${entry.title}-${entry.time}`}
                    className={`day-entry ${entry.tone}`}
                  >
                    <div className="day-entry-header">
                      <strong>{entry.title}</strong>
                      <span>{entry.time}</span>
                    </div>
                    {entry.people.length ? (
                      <div className="schedule-badges">
                        {entry.people.map((name) => (
                          <span key={name} className="badge">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {entry.note ? (
                      <span className="entry-note">{entry.note}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="tool-card">
            <h3>Solicitar folga</h3>
            <p>Use o calendario para escolher o dia e enviar a solicitacao.</p>
            <div className="selected-date">
              <span>Data selecionada</span>
              <strong>{formattedSelectedDate}</strong>
            </div>
            <div className="selected-date">
              <span>Solicitante</span>
              <strong>{currentUser.name}</strong>
            </div>
            {personalProfile ? (
              <div className="selected-date">
                <span>Seu turno</span>
                <strong>{personalProfile.shift}</strong>
              </div>
            ) : null}
            <form className="timeoff-form">
              <label htmlFor="motivo">Motivo</label>
              <input
                id="motivo"
                type="text"
                placeholder="Ex: consulta medica"
              />

              <label className="toggle-row" htmlFor="conflito">
                <input id="conflito" type="checkbox" defaultChecked />
                Sinalizar conflito com a escala
              </label>
              <button className="ghost" type="button">
                Enviar solicitacao
              </button>
            </form>
          </section>

          <section className="tool-card">
            <h3>GPS do ponto</h3>
            <p>
              Geolocalizacao ativa para validar batidas dentro do raio permitido.
            </p>
            <div className="gps-status">
              <span className={`gps-dot ${geoStatus}`} aria-hidden="true" />
              <div>
                <strong>{geoTitle}</strong>
                <span>{geoDetail}</span>
              </div>
            </div>
            <div className="gps-meta">
              <span>Ponto: {GEOFENCE.name}</span>
              <span>Raio permitido: {GEOFENCE.radiusMeters}m</span>
            </div>
            <button
              className="ghost"
              type="button"
              onClick={requestLocation}
              disabled={geoStatus === "loading"}
            >
              {geoStatus === "loading" ? "Localizando..." : "Atualizar local"}
            </button>
          </section>
          <section className="tool-card">
            <h3>Resumo do dia</h3>
            <p>Acompanhe rapidamente o que esta acontecendo agora.</p>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label">Batidas hoje</span>
                <strong className="stat-value">2</strong>
                <span className="stat-note">Ultima 16:03</span>
              </div>
              <div className="stat">
                <span className="stat-label">Equipe em campo</span>
                <strong className="stat-value">2</strong>
                <span className="stat-note">Turno 16-22</span>
              </div>
              <div className="stat">
                <span className="stat-label">Alertas</span>
                <strong className="stat-value">0</strong>
                <span className="stat-note">Sem pendencias</span>
              </div>
            </div>
          </section>

          <section className="tool-card">
            <h3>Acoes rapidas</h3>
            <p>Atalhos para tarefas frequentes da equipe.</p>
            <div className="action-grid">
              <button className="action-btn" type="button">
                Enviar aviso
              </button>
              <button className="action-btn" type="button">
                Abrir chat
              </button>
              <button className="action-btn" type="button">
                Gerar relatorio
              </button>
              <button className="action-btn" type="button">
                Solicitar cobertura
              </button>
            </div>
          </section>

          <section className="tool-card account-card">
            <div className="account-header">
              <h3>Conta</h3>
              <span className={`role-pill ${isAdmin ? "admin" : "staff"}`}>
                {isAdmin ? "Admin" : "Equipe"}
              </span>
            </div>
            <p className="account-name">{currentUser.name}</p>
            <p className="account-email">{currentUser.email}</p>
            <button className="ghost ghost--small" type="button" onClick={handleLogout}>
              Sair
            </button>
          </section>

          <section
            className={`tool-card admin-card ${isAdmin ? "" : "admin-card--locked"}`}
          >
            <div className="admin-header">
              <h3>Area admin</h3>
              <span className="admin-pill">Restrito</span>
            </div>
            <p>Funcoes exclusivas para ajuste de escala e aprovacao.</p>

            {isAdmin ? (
              <>
                <div className="admin-tools">
                  <button className="admin-btn" type="button">
                    Ajustar escala
                  </button>
                  <button className="admin-btn" type="button">
                    Aprovar folgas
                  </button>
                  <button className="admin-btn" type="button">
                    Gerenciar equipe
                  </button>
                  <button className="admin-btn" type="button">
                    Exportar relatorios
                  </button>
                </div>

                <div className="admin-links">
                  <p className="admin-links-title">Links da equipe (ponto)</p>
                  {TEAM_ACCOUNTS.map((account) => {
                    const link = `${origin || ""}/?autologin=${account.token}`;
                    return (
                      <div key={account.email} className="admin-link-row">
                        <div>
                          <strong>{account.name}</strong>
                          <span className="admin-link-text">{link}</span>
                        </div>
                        <button
                          className="ghost ghost--small"
                          type="button"
                          onClick={() => handleCopyLink(account.token)}
                        >
                          {copiedToken === account.token ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {TEST_ACCOUNT ? (
                  <div className="admin-links">
                    <p className="admin-links-title">Conta de teste</p>
                    <div className="admin-link-row">
                      <div>
                        <strong>{TEST_ACCOUNT.name}</strong>
                        <span className="admin-link-text">
                          {`${origin || ""}/?autologin=${TEST_ACCOUNT.token}`}
                        </span>
                      </div>
                      <button
                        className="ghost ghost--small"
                        type="button"
                        onClick={() => handleCopyLink(TEST_ACCOUNT.token)}
                      >
                        {copiedToken === TEST_ACCOUNT.token ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {ADMIN_ACCOUNTS.length ? (
                  <div className="admin-links">
                    <p className="admin-links-title">Link admin (privado)</p>
                    {ADMIN_ACCOUNTS.map((account) => (
                      <div key={account.email} className="admin-link-row">
                        <div>
                          <strong>{account.name}</strong>
                          <span className="admin-link-text">
                            {`${origin || ""}/?autologin=${account.token}`}
                          </span>
                        </div>
                        <button
                          className="ghost ghost--small"
                          type="button"
                          onClick={() => handleCopyLink(account.token)}
                        >
                          {copiedToken === account.token ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="admin-payroll">
                  <p className="admin-links-title">Pagamentos (admin)</p>
                  {STAFF_PROFILES.filter((profile) => profile.pay).map((profile) => (
                    <div key={profile.id} className="payroll-item">
                      <div>
                        <strong>{profile.name}</strong>
                        <span className="payroll-meta">
                          {profile.pay?.type === "daily" ? "Diaria" : "Mensal"}
                        </span>
                        {profile.pay?.note ? (
                          <span className="payroll-note">{profile.pay.note}</span>
                        ) : null}
                      </div>
                      <span className="payroll-amount">
                        {formatCurrency(profile.pay?.amount ?? 0)}
                        {profile.pay?.type === "daily" ? "/dia" : "/mes"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="admin-locked">Entre com uma conta admin.</div>
            )}
          </section>
        </div>
      </aside>

      <main className="home" aria-label="Bater ponto">
        <div className="clock-card" role="img" aria-label={`Agora ${timeString}`}>
          <div className="clock-time">{timeString}</div>
          <div className="clock-date">{dateString}</div>
        </div>

        <button
          className="shift-button"
          type="button"
          aria-pressed={shiftActive}
          data-active={shiftActive}
          onClick={handleShiftToggle}
          disabled={!canPunch}
        >
          {shiftActive ? "Finalizar turno" : "Iniciar turno"}
        </button>
        {(!canPunch || shiftNotice) && (
          <p
            className={`shift-note ${
              !canPunch ? "default" : shiftNoticeTone
            }`}
          >
            {!canPunch ? "Conta sem ponto." : shiftNotice}
          </p>
        )}
      </main>
    </div>
  );
}
