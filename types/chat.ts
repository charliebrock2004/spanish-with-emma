import type { LevelId } from './curriculum';

export type EmmaEmotion = 'happy' | 'encouraging' | 'thinking' | 'surprised' | 'celebrating' | 'confused';

export interface ChatTurn {
  role: 'emma' | 'player';
  text: string;
}

export interface ChatTopic {
  id: string;
  title: string;
  /** What the conversation is about, or the role Emma plays. */
  brief: string;
}

/** What the browser sends to /api/chat. */
export interface ChatRequestBody {
  level: LevelId;
  name: string;
  messages: ChatTurn[];
  /** One of the chat topics. The server looks up the topic's brief itself. */
  topicId?: string;
  /** The player has been struggling — Emma should simplify. */
  struggling: boolean;
}

/** What the server builds Emma's prompt from. */
export interface ChatPromptInput extends Omit<ChatRequestBody, 'topicId'> {
  topic?: ChatTopic;
}

export interface EmmaCorrection {
  hasMistake: boolean;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'word-order' | 'spelling' | 'none';
}

export interface EmmaChatReply {
  reply: string;
  translation: string;
  correction: EmmaCorrection;
  suggestions: string[];
  emotion: EmmaEmotion;
  understood: boolean;
  end: boolean;
}
