export async function transcribeVoice(_bytes: Buffer): Promise<string> {
  if (process.env.WHISPER_MODE === "real") {
    throw new Error("Whisper integration not implemented (v1.1)");
  }
  return "[voice transcript unavailable in v1 — pre-canned by seed for demo flow]";
}
