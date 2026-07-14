import type { Priority } from './model'

export type GoalDifficulty = 'easy' | 'medium' | 'hard'

export const GOAL_BASE_XP = 15

export const goalXpForPriority = (priority: Priority) => GOAL_BASE_XP * (priority === 'high' ? 4 : priority === 'medium' ? 2 : 1)

export const goalDifficultyForPriority = (priority: Priority): GoalDifficulty => priority === 'high' ? 'hard' : priority === 'medium' ? 'medium' : 'easy'

export const priorityForGoalDifficulty = (difficulty: GoalDifficulty): Priority => difficulty === 'hard' ? 'high' : difficulty === 'medium' ? 'medium' : 'low'
