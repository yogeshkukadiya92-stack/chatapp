import { PhoneOff, Video, Phone } from "lucide-react";
import type { CallState } from "../types";

type IncomingCallModalProps = {
  call: CallState;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
};

export function IncomingCallModal({ call, callerName, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="modal-backdrop">
      <section className="call-card">
        <div className="call-icon">{call.type === "video" ? <Video size={28} /> : <Phone size={28} />}</div>
        <h2>{callerName}</h2>
        <p>Incoming {call.type} call</p>
        <div className="call-actions">
          <button className="danger-button" onClick={onReject} aria-label="Reject call">
            <PhoneOff size={20} />
          </button>
          <button className="accept-button" onClick={onAccept} aria-label="Accept call">
            <Phone size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
