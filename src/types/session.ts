export type SessionStatus = "waiting" | "active" | "paused" | "completed";

export interface Session {
  id: string;
  template_id: string;
  teacher_id: string;
  battle_code: string;
  expected_student_count: number;
  status: SessionStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  student_id: string;
  current_question_index: number;
  damage_dealt: number;
  xp_earned: number;
  joined_at: string;
}

export interface SessionState {
  session_id: string;
  current_boss_hp: number;
  max_boss_hp: number;
  current_question_index: number;
  logs: import("./battle").BattleLogEntry[];
  updated_at: string;
}
