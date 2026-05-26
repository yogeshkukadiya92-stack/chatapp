import { FormEvent, useState } from "react";
import { Lock, ShieldCheck, X } from "lucide-react";

type ChatLockOverlayProps = {
  title: string;
  hasPin: boolean;
  error?: string | null;
  onSetPin: (pin: string) => boolean;
  onUnlock: (pin: string) => boolean;
  onCancel?: () => void;
};

export function ChatLockOverlay({
  title,
  hasPin,
  error,
  onSetPin,
  onUnlock,
  onCancel
}: ChatLockOverlayProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (!/^\d{4,8}$/.test(pin)) {
      setLocalError("PIN must be 4 to 8 digits.");
      return;
    }

    if (!hasPin && pin !== confirmPin) {
      setLocalError("PIN confirmation does not match.");
      return;
    }

    const ok = hasPin ? onUnlock(pin) : onSetPin(pin);

    if (!ok) {
      setLocalError(hasPin ? "Wrong PIN. Try again." : "Could not set PIN.");
      return;
    }

    setPin("");
    setConfirmPin("");
  }

  return (
    <div className="chat-lock-overlay" role="dialog" aria-modal="true" aria-label="Chat privacy lock">
      <div className="lock-card">
        {onCancel ? (
          <button className="lock-close" onClick={onCancel} aria-label="Close chat lock">
            <X size={16} />
          </button>
        ) : null}
        <div className="lock-emblem">
          {hasPin ? <Lock size={26} /> : <ShieldCheck size={26} />}
        </div>
        <h2>{hasPin ? "Private chat locked" : "Create privacy PIN"}</h2>
        <p>
          {hasPin
            ? `${title} is hidden until your PIN is entered.`
            : "Set a local PIN to lock sensitive chats on this browser."}
        </p>
        <form className="lock-form" onSubmit={submit}>
          <input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder={hasPin ? "Enter PIN" : "New PIN"}
            inputMode="numeric"
            type="password"
            autoFocus
          />
          {!hasPin ? (
            <input
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Confirm PIN"
              inputMode="numeric"
              type="password"
            />
          ) : null}
          <button className="primary-button">{hasPin ? "Unlock chat" : "Save PIN"}</button>
        </form>
        {localError || error ? <span className="lock-error">{localError || error}</span> : null}
      </div>
    </div>
  );
}
