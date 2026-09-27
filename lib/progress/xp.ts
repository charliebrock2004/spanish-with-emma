/** XP rewards — deliberately simple. */
export const XP = {
  correct: 10,
  /** A question you got wrong earlier in the lesson, answered correctly on the second go. */
  retry: 5,
  speaking: 15,
  lessonComplete: 25,
  perfectLesson: 50,
  levelMilestone: 100,
  reviewComplete: 20,
  conversationTurn: 5,
  conversationComplete: 30,
  gameCorrect: 2,
  gameComplete: 10,
  dailyGoal: 20,
} as const;

export interface LessonXpBreakdown {
  answers: number;
  completion: number;
  perfect: number;
  milestone: number;
  total: number;
}

export function lessonBonus({ perfect, milestone }: { perfect: boolean; milestone: boolean }) {
  const completion = XP.lessonComplete;
  const perfectBonus = perfect ? XP.perfectLesson : 0;
  const milestoneBonus = milestone ? XP.levelMilestone : 0;
  return { completion, perfect: perfectBonus, milestone: milestoneBonus, total: completion + perfectBonus + milestoneBonus };
}
