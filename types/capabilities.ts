/** What the server has configured — booleans only, never secrets. */
export interface Capabilities {
  /** Free conversation with Emma through Claude. */
  aiChat: boolean;
  cloudTts: boolean;
  cloudStt: boolean;
  /** The API routes need the APP_ACCESS_CODE (entered once in Settings). */
  accessCodeRequired: boolean;
  ttsProvider: 'openai' | 'elevenlabs' | null;
}
