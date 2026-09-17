import { z } from 'zod'

export const QuizOption = z.object({
  key: z.string(),
  text: z.string(),
})

export const QuizQuestion = z.object({
  id: z.string().uuid().optional(),
  promptMd: z.string(),
  options: z.array(QuizOption).min(2).max(4),
  correctKey: z.string(),
  explanationMd: z.string().optional(),
  conceptLabel: z.string(),
})

export type QuizQuestion = z.infer<typeof QuizQuestion>
export type QuizOption = z.infer<typeof QuizOption>
