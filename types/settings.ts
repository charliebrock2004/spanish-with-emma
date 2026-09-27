/**
 * Voice modes:
 *  - spanish:  Emma only voices Spanish; her English explanations are text only (immersion).
 *  - scottish: Emma voices her English explanations in a Scottish-English voice and
 *              the Spanish in a Castilian Spanish voice.
 *  - auto:     Scottish-English help while you're a beginner (levels 1–3), then Spanish only.
 */
export type VoiceMode = 'spanish' | 'scottish' | 'auto';

export type DifficultySetting = 'auto' | 'easier' | 'normal' | 'harder';

export type EnginePreference = 'auto' | 'device' | 'cloud';

export type PronunciationDisplay = 'auto' | 'always' | 'never';

export interface Settings {
  voiceMode: VoiceMode;
  /** Speech rate multiplier for Emma (0.6–1.2). */
  speechRate: number;
  difficulty: DifficultySetting;
  soundEffects: boolean;
  music: boolean;
  dailyGoalMinutes: number;
  showPronunciation: PronunciationDisplay;
  autoplayAudio: boolean;
  /** When set in the future, speaking exercises become typing exercises until then. */
  speakingPausedUntil: number | null;
  sttEngine: EnginePreference;
  ttsEngine: EnginePreference;
  /** Preferred device voices (SpeechSynthesisVoice.voiceURI). */
  spanishVoiceURI: string | null;
  englishVoiceURI: string | null;
  reduceMotion: boolean;
  /** Access code for protected deployments (sent to the API routes). */
  accessCode: string;
}
