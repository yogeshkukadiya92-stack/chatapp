export type PeerBundle = {
  connection: RTCPeerConnection;
  localStream?: MediaStream;
};

export async function createPeerBundle(kind: "voice" | "video"): Promise<PeerBundle> {
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: kind === "video"
  });

  for (const track of localStream.getTracks()) {
    connection.addTrack(track, localStream);
  }

  return {
    connection,
    localStream
  };
}

export function stopPeerBundle(bundle?: PeerBundle | null) {
  bundle?.localStream?.getTracks().forEach((track) => track.stop());
  bundle?.connection.close();
}
