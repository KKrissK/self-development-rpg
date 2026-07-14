export type QuestStatus = 'now' | 'next' | 'later' | 'done'
export type GoalTaskStatus = 'todo' | 'in-progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type SkillStatus = 'learning' | 'practicing' | 'proven'
export type ResourceKind = 'book' | 'video' | 'course' | 'article' | 'podcast' | 'other'
export type ResourceStatus = 'queued' | 'in-progress' | 'completed'
export type CvLanguage = 'English' | 'Hungarian' | 'Other'
export type AchievementKind = 'project' | 'milestone' | 'award' | 'certification' | 'contribution' | 'other'

export interface SkillAssessmentDetails {
  summary: string
  strengths: string[]
  gaps: string[]
}

export interface CvAttachment {
  id: string
  fileName: string
  mimeType: string
  size: number
  storedAt: string
}

export interface AchievementImage {
  id: string
  fileName: string
  mimeType: string
  size: number
  storedAt: string
}

export interface Profile {
  id: string
  name: string
  title: string
  bio: string
  level: number
  xp: number
  createdAt: string
}

export interface Skill {
  id: string
  profileId: string
  name: string
  category: string
  level: number
  status: SkillStatus
  evidence: string
  assessment?: SkillAssessmentDetails
}

export interface Quest {
  id: string
  profileId: string
  title: string
  notes: string
  priority: Priority
  status: QuestStatus
  xp: number
  skillId?: string
  skillIds?: string[]
  resourceIds?: string[]
  dueDate?: string
  completedAt?: string
  xpAwardedAt?: string
}

export interface GoalTask {
  id: string
  profileId: string
  goalId: string
  title: string
  notes: string
  status: GoalTaskStatus
  dueDate?: string
  createdAt: string
  completedAt?: string
}

export interface LearningResource {
  id: string
  profileId: string
  title: string
  kind: ResourceKind
  status: ResourceStatus
  creator: string
  url: string
  skillId?: string
  notes: string
}

export interface IncomeSource {
  id: string
  profileId: string
  name: string
  type: string
  monthlyAmount: number
  currency: string
  active: boolean
}

export interface MoneyPlan {
  monthlyTarget: number
  monthlyExpenses: number
  savingsGoal: number
  currency: string
}

export interface CvVariant {
  id: string
  profileId: string
  name: string
  employer: string
  role: string
  language: CvLanguage
  status: 'draft' | 'ready' | 'sent' | 'archived'
  fileName: string
  attachment?: CvAttachment
  notes: string
  updatedAt: string
}

export interface KnowledgeNote {
  id: string
  profileId: string
  title: string
  body: string
  tags: string[]
  createdAt: string
}

export interface AdviceItem {
  id: string
  profileId: string
  title: string
  rationale: string
  nextStep: string
  impact: 'low' | 'medium' | 'high'
  importedAt: string
}

export interface Achievement {
  id: string
  profileId: string
  title: string
  kind: AchievementKind
  description: string
  url: string
  achievedAt?: string
  skillId?: string
  skillIds?: string[]
  image?: AchievementImage
  createdAt: string
}

export interface AppState {
  schemaVersion: 1
  activeProfileId: string
  profiles: Profile[]
  skills: Skill[]
  quests: Quest[]
  tasks: GoalTask[]
  resources: LearningResource[]
  incomeSources: IncomeSource[]
  moneyPlan: MoneyPlan
  cvs: CvVariant[]
  knowledgeNotes: KnowledgeNote[]
  advice: AdviceItem[]
  achievements: Achievement[]
  theme: 'light' | 'dark'
}

export type NewQuest = Pick<Quest, 'title' | 'priority' | 'status'> & Partial<Pick<Quest, 'notes' | 'skillId' | 'skillIds' | 'resourceIds' | 'dueDate' | 'xp'>>
