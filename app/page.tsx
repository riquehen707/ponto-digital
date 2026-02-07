"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type GeoStatus = "idle" | "loading" | "ready" | "error";

type GeoInfo = {
  accuracy?: number;
  updatedAt?: Date;
  error?: string;
};

type Role = "admin" | "staff";

type Account = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type DemoAccount = Account & {
  password: string;
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
  pay: PayInfo;
};

type ScheduleEntry = {
  title: string;
  time: string;
  people: string[];
  note?: string;
  tone: "work" | "manager" | "cleaning";
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "admin",
    name: "Henrique Admin",
    email: "admin@empresa.com",
    role: "admin",
    password: "admin123",
    token: "admin-hq",
  },
  {
    id: "ayra",
    name: "Ayra",
    email: "ayra@empresa.com",
    role: "staff",
    password: "1234",
    token: "ayra-2026",
  },
  {
    id: "nathyeli",
    name: "Nathyeli",
    email: "nathyeli@empresa.com",
    role: "staff",
    password: "1234",
    token: "nathyeli-2026",
  },
];

const STAFF_ACCOUNTS = DEMO_ACCOUNTS.filter(
  (account) => account.role === "staff"
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
    scheduleName: "Mariza Santos",
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

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [shiftActive, setShiftActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoInfo, setGeoInfo] = useState<GeoInfo>({});
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [origin, setOrigin] = useState("");
  const [copiedToken, setCopiedToken] = useState("");

  const isAdmin = currentUser?.role === "admin";
  const personalProfile =
    currentUser?.role === "staff"
      ? STAFF_PROFILES.find((profile) => profile.id === currentUser.id) ?? null
      : null;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
    setLoginPassword("");
    window.history.replaceState({}, "", window.location.pathname);
  }, [currentUser]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    const matchingAccount = DEMO_ACCOUNTS.find(
      (account) =>
        account.email.toLowerCase() === email &&
        account.password === loginPassword
    );

    if (!matchingAccount) {
      setLoginError("Credenciais invalidas");
      return;
    }

    setCurrentUser({
      id: matchingAccount.id,
      name: matchingAccount.name,
      email: matchingAccount.email,
      role: matchingAccount.role,
    });
    setLoginError("");
    setLoginPassword("");
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail("");
    setLoginPassword("");
    setCopiedToken("");
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

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoInfo({ error: "Geolocalizacao indisponivel." });
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoStatus("ready");
        setGeoInfo({
          accuracy: Math.round(position.coords.accuracy),
          updatedAt: new Date(),
        });
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

  const handleShiftToggle = () => {
    setShiftActive((prev) => !prev);
    requestLocation();
  };

  const geoTitle =
    geoStatus === "ready"
      ? "GPS pronto"
      : geoStatus === "loading"
        ? "Buscando sinal"
        : geoStatus === "error"
          ? "GPS indisponivel"
          : "Aguardando GPS";

  const geoDetail =
    geoStatus === "ready"
      ? `Raio ${geoInfo.accuracy ?? 0}m - Atualizado ha ${geoMinutesAgo ?? 0} min`
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
            <h1>Entrar</h1>
            <p className="login-subtitle">
              Use sua conta para bater ponto e solicitar folga. Se recebeu um link
              automatico, basta abrir.
            </p>
            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(event) => {
                  setLoginEmail(event.target.value);
                  setLoginError("");
                }}
                required
              />

              <label htmlFor="login-password">Senha</label>
              <input
                id="login-password"
                type="password"
                placeholder="Digite sua senha"
                value={loginPassword}
                onChange={(event) => {
                  setLoginPassword(event.target.value);
                  setLoginError("");
                }}
                required
              />

              <button className="shift-button login-button" type="submit">
                Entrar
              </button>
              {loginError ? <span className="login-error">{loginError}</span> : null}
            </form>

            <div className="login-hint">
              <span>Demo:</span>
              <span>admin@empresa.com / admin123</span>
              <span>ayra@empresa.com / 1234</span>
              <span>nathyeli@empresa.com / 1234</span>
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
                  <div key={`${entry.title}-${entry.time}`} className={`day-entry ${entry.tone}`}>
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
                    {entry.note ? <span className="entry-note">{entry.note}</span> : null}
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
            <p>Geolocalizacao ativa para validar batidas dentro do raio permitido.</p>
            <div className="gps-status">
              <span className={`gps-dot ${geoStatus}`} aria-hidden="true" />
              <div>
                <strong>{geoTitle}</strong>
                <span>{geoDetail}</span>
              </div>
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

          <section className={`tool-card admin-card ${isAdmin ? "" : "admin-card--locked"}`}>
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
                  <p className="admin-links-title">
                    Links de acesso automatico para a equipe
                  </p>
                  {STAFF_ACCOUNTS.map((account) => {
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

                <div className="admin-payroll">
                  <p className="admin-links-title">Pagamentos (admin)</p>
                  {STAFF_PROFILES.map((profile) => (
                    <div key={profile.id} className="payroll-item">
                      <div>
                        <strong>{profile.name}</strong>
                        <span className="payroll-meta">
                          {profile.pay.type === "daily" ? "Diaria" : "Mensal"}
                        </span>
                        {profile.pay.note ? (
                          <span className="payroll-note">{profile.pay.note}</span>
                        ) : null}
                      </div>
                      <span className="payroll-amount">
                        {formatCurrency(profile.pay.amount)}
                        {profile.pay.type === "daily" ? "/dia" : "/mes"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="admin-locked">
                Entre com uma conta admin para acessar.
              </div>
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
        >
          {shiftActive ? "Finalizar turno" : "Iniciar turno"}
        </button>
      </main>
    </div>
  );
}
