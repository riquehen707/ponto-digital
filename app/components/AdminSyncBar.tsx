type AdminSyncBarProps = {
  syncStatus: "idle" | "syncing" | "synced" | "error";
  lastSyncAt: Date | null;
  errorMessage?: string;
  onSyncNow: () => void;
  onForceSave: () => void;
};

const STATUS_LABELS: Record<AdminSyncBarProps["syncStatus"], string> = {
  idle: "Offline",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  error: "Falha",
};

const STATUS_CLASS: Record<AdminSyncBarProps["syncStatus"], string> = {
  idle: "",
  syncing: "pending",
  synced: "approved",
  error: "denied",
};

export default function AdminSyncBar({
  syncStatus,
  lastSyncAt,
  errorMessage,
  onSyncNow,
  onForceSave,
}: AdminSyncBarProps) {
  return (
    <div className="admin-sync-bar" role="status">
      <div className="admin-sync-row">
        <div>
          <span className="admin-sync-title">Sincronizacao</span>
          <div className="admin-sync-meta">
            Ultima: {lastSyncAt ? lastSyncAt.toLocaleString("pt-BR") : "Sem registro"}
          </div>
        </div>
        <span className={`status-pill ${STATUS_CLASS[syncStatus]}`}>
          {STATUS_LABELS[syncStatus]}
        </span>
      </div>
      <div className="admin-sync-actions">
        <button className="ghost ghost--small" type="button" onClick={onSyncNow}>
          Sincronizar agora
        </button>
        <button className="ghost ghost--small" type="button" onClick={onForceSave}>
          Inicializar banco
        </button>
      </div>
      {errorMessage ? <div className="admin-sync-error">{errorMessage}</div> : null}
    </div>
  );
}
