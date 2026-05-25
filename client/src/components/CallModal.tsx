import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, Video } from "lucide-react";
import type { CallState } from "../types";
import { createPeerBundle, stopPeerBundle, type PeerBundle } from "../lib/webrtc";

type CallModalProps = {
  call: CallState;
  title: string;
  onEnd: () => void;
};

export function CallModal({ call, title, onEnd }: CallModalProps) {
  const [bundle, setBundle] = useState<PeerBundle | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;

    createPeerBundle(call.type)
      .then((nextBundle) => {
        if (!active) {
          stopPeerBundle(nextBundle);
          return;
        }

        setBundle(nextBundle);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = nextBundle.localStream || null;
        }
      })
      .catch((error: Error) => setMediaError(error.message));

    return () => {
      active = false;
    };
  }, [call.type]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = bundle?.localStream || null;
    }
  }, [bundle]);

  function end() {
    stopPeerBundle(bundle);
    onEnd();
  }

  return (
    <div className="modal-backdrop">
      <section className="call-window">
        <header>
          <div>
            <h2>{title}</h2>
            <p>{call.status}</p>
          </div>
          <button className="danger-button" onClick={end} aria-label="End call">
            <PhoneOff size={20} />
          </button>
        </header>
        <div className="video-grid">
          <video ref={remoteVideoRef} autoPlay playsInline />
          <video ref={localVideoRef} autoPlay muted playsInline />
        </div>
        {mediaError ? <p className="form-error">{mediaError}</p> : null}
        <footer className="call-toolbar">
          <button className="icon-button" aria-label="Mute microphone">
            <Mic size={18} />
          </button>
          <button className="icon-button" aria-label="Toggle camera">
            <Video size={18} />
          </button>
        </footer>
      </section>
    </div>
  );
}
