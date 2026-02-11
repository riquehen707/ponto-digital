type HomeClockProps = {
  timeString: string;
  dateString: string;
  locale: string;
  shiftActive: boolean;
  shiftNotice: string;
  shiftNoticeTone: string;
  shiftButtonLabel: string;
  shiftButtonDisabled: boolean;
  onShiftToggle: () => void;
  openRecordStartAt?: string | null;
};

export default function HomeClock({
  timeString,
  dateString,
  locale,
  shiftActive,
  shiftNotice,
  shiftNoticeTone,
  shiftButtonLabel,
  shiftButtonDisabled,
  onShiftToggle,
  openRecordStartAt,
}: HomeClockProps) {
  return (
    <main className="home">
      <div className="clock-card">
        <div className="clock-time">{timeString}</div>
        <div className="clock-date">{dateString}</div>
      </div>
      <button
        className="shift-button"
        type="button"
        data-active={shiftActive}
        onClick={onShiftToggle}
        disabled={shiftButtonDisabled}
      >
        {shiftButtonLabel}
      </button>
      {shiftNotice ? (
        <span className={`shift-note ${shiftNoticeTone}`}>{shiftNotice}</span>
      ) : shiftActive && openRecordStartAt ? (
        <span className="shift-note">
          Inicio: {new Date(openRecordStartAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : null}
    </main>
  );
}
