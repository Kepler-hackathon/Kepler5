import { db, generationJobs, chatMessages, chatThreads } from '@kepler/db'
import { eq, and, gte, count } from 'drizzle-orm'

/** Returns true if the user is within the 30 generation jobs/hour limit. */
export async function checkJobBudget(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const [row] = await db
    .select({ count: count() })
    .from(generationJobs)
    .where(and(eq(generationJobs.requestedBy, userId), gte(generationJobs.createdAt, oneHourAgo)))
  return Number(row?.count ?? 0) < 30
}

/** Returns true if the user is within the 200 chat messages/day limit. */
export async function checkChatBudget(userId: string): Promise<boolean> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [row] = await db
    .select({ count: count() })
    .from(chatMessages)
    .innerJoin(chatThreads, eq(chatMessages.threadId, chatThreads.id))
    .where(
      and(
        eq(chatThreads.userId, userId),
        eq(chatMessages.role, 'user'),
        gte(chatMessages.createdAt, startOfDay),
      ),
    )
  return Number(row?.count ?? 0) < 200
}
