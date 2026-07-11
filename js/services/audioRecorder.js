const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.mimeType = null;
  }

  async start() {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("このブラウザは録音に対応していません。writingモードをご利用ください。");
    }
    this.mimeType = pickMimeType();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(
      this.stream,
      this.mimeType ? { mimeType: this.mimeType } : undefined
    );
    this.mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    });
    this.mediaRecorder.start();
  }

  isRecording() {
    return this.mediaRecorder?.state === "recording";
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }
      this.mediaRecorder.addEventListener(
        "stop",
        () => {
          const mimeType = this.mediaRecorder.mimeType || this.mimeType || "audio/webm";
          const blob = new Blob(this.chunks, { type: mimeType });
          this.stream.getTracks().forEach((track) => track.stop());
          resolve({ blob, mimeType });
        },
        { once: true }
      );
      this.mediaRecorder.stop();
    });
  }
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
