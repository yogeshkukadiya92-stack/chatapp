import { FormEvent, useState } from "react";
import { MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import type { AuthMode } from "../lib/api";

type AuthPanelProps = {
  step: "phone" | "otp";
  phone: string;
  mode: AuthMode;
  loading: boolean;
  error?: string | null;
  onModeChange: (mode: AuthMode) => void;
  onPhoneSubmit: (phone: string) => Promise<void>;
  onOtpSubmit: (otp: string, name?: string) => Promise<void>;
  onBack: () => void;
};

export function AuthPanel({
  step,
  phone,
  mode,
  loading,
  error,
  onModeChange,
  onPhoneSubmit,
  onOtpSubmit,
  onBack
}: AuthPanelProps) {
  const [phoneInput, setPhoneInput] = useState(phone);
  const [otp, setOtp] = useState("123456");
  const [name, setName] = useState("");

  async function submitPhone(event: FormEvent) {
    event.preventDefault();
    await onPhoneSubmit(phoneInput);
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault();
    await onOtpSubmit(otp, name || undefined);
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-lockup">
          <span className="brand-mark">
            <MessageCircle size={26} />
          </span>
          <div>
            <h1>Pulse Chat</h1>
            <p>Realtime conversations for teams and customers.</p>
          </div>
        </div>

        {step === "phone" ? (
          <form className="auth-form" onSubmit={submitPhone}>
            <div className="auth-toggle" aria-label="Authentication mode">
              <button
                type="button"
                className={mode === "signin" ? "active" : ""}
                onClick={() => onModeChange("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => onModeChange("signup")}
              >
                Sign up
              </button>
            </div>
            <label htmlFor="phone">Phone number</label>
            <div className="input-with-icon">
              <Smartphone size={18} />
              <input
                id="phone"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                placeholder="+15551234567"
                autoComplete="tel"
              />
            </div>
            <button className="primary-button" disabled={loading || !phoneInput.trim()}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitOtp}>
            <button className="text-button" type="button" onClick={onBack}>
              Change phone
            </button>
            <p className="auth-flow-label">{mode === "signin" ? "Sign in" : "Sign up"} verification</p>
            <label htmlFor="otp">Verification code</label>
            <div className="input-with-icon">
              <ShieldCheck size={18} />
              <input
                id="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                maxLength={8}
              />
            </div>
            {mode === "signup" ? (
              <>
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </>
            ) : null}
            <button
              className="primary-button"
              disabled={loading || !otp.trim() || (mode === "signup" && !name.trim())}
            >
              {mode === "signin" ? "Verify sign in" : "Create account"}
            </button>
          </form>
        )}

        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  );
}
