import { NextRequest, NextResponse } from 'next/server'
import { db } from '@kepler/db'
import {
  users, courses, modules, lectures, slides,
  generatedItems, quizQuestions, lectureItems,
  studentProgress, learningEvents,
} from '@kepler/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Fixed UUIDs for idempotent seeding (§14.13 #190, B19)
const SEED = {
  courseId:   '00000000-0000-7000-8000-000000000001',
  moduleId:   '00000000-0000-7000-8000-000000000002',
  teacherId:  '00000000-0000-7000-8000-000000000010',
  lecture1Id: '00000000-0000-7000-8000-000000000020',
  lecture2Id: '00000000-0000-7000-8000-000000000021',
  slide1Id:   '00000000-0000-7000-8000-000000000030',
  slide2Id:   '00000000-0000-7000-8000-000000000031',
  slide3Id:   '00000000-0000-7000-8000-000000000032',
  quiz1Id:    '00000000-0000-7000-8000-000000000040',
  item1Id:    '00000000-0000-7000-8000-000000000050',
  li1Id:      '00000000-0000-7000-8000-000000000060',
  students: [
    '00000000-0000-7000-8000-000000000100',
    '00000000-0000-7000-8000-000000000101',
    '00000000-0000-7000-8000-000000000102',
    '00000000-0000-7000-8000-000000000103',
    '00000000-0000-7000-8000-000000000104',
  ],
}

const STUDENT_NAMES = [
  'Amber Falcon', 'Quiet Otter', 'Swift Heron', 'Bright Marten', 'Calm Raven',
]

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Invalid admin token', retryable: false } }, { status: 401 })
  }

  try {
    await db.transaction(async (tx) => {
      // Teacher
      await tx.insert(users).values({
        id: SEED.teacherId,
        displayName: 'Demo Teacher',
        defaultRole: 'teacher',
      }).onConflictDoNothing()

      // Students
      for (let i = 0; i < SEED.students.length; i++) {
        await tx.insert(users).values({
          id: SEED.students[i]!,
          displayName: STUDENT_NAMES[i]!,
          defaultRole: 'student',
        }).onConflictDoNothing()
      }

      // Course
      await tx.insert(courses).values({
        id: SEED.courseId,
        name: 'Introduction to Computer Science',
        code: 'CS101',
        term: 'Fall 2026',
        instructorName: 'Demo Teacher',
      }).onConflictDoNothing()

      // Module
      await tx.insert(modules).values({
        id: SEED.moduleId,
        courseId: SEED.courseId,
        name: 'Binary Search Trees',
        overviewMd: 'Covers BST operations: insert, search, delete, traversals.',
        status: 'published',
        aiOptIn: true,
        itemsPerLecture: 2,
        createdBy: SEED.teacherId,
        orderIndex: 1,
        publishedAt: new Date(),
      }).onConflictDoNothing()

      // Lectures
      await tx.insert(lectures).values({
        id: SEED.lecture1Id,
        moduleId: SEED.moduleId,
        title: 'BST Insert & Search',
        orderIndex: 1,
        parseStatus: 'parsed',
        slideCount: 2,
        estimatedMinutes: 3,
        bundleVersion: 1,
      }).onConflictDoNothing()

      await tx.insert(lectures).values({
        id: SEED.lecture2Id,
        moduleId: SEED.moduleId,
        title: 'BST Delete & Traversals',
        orderIndex: 2,
        parseStatus: 'parsed',
        slideCount: 1,
        estimatedMinutes: 2,
        bundleVersion: 1,
      }).onConflictDoNothing()

      // Slides for lecture 1
      await tx.insert(slides).values({
        id: SEED.slide1Id,
        lectureId: SEED.lecture1Id,
        index: 1,
        text: 'A Binary Search Tree is a rooted binary tree where each node stores a key. For any node n, all keys in its left subtree are less than n.key and all keys in its right subtree are greater.',
        textSource: 'generated',
      }).onConflictDoNothing()

      await tx.insert(slides).values({
        id: SEED.slide2Id,
        lectureId: SEED.lecture1Id,
        index: 2,
        text: 'BST Search: start at root, compare key, recurse left or right until found or null. O(h) time where h is tree height.',
        textSource: 'generated',
      }).onConflictDoNothing()

      // Slide for lecture 2
      await tx.insert(slides).values({
        id: SEED.slide3Id,
        lectureId: SEED.lecture2Id,
        index: 1,
        text: 'In-order traversal visits nodes in sorted order: left, root, right. Pre-order: root, left, right. Post-order: left, right, root.',
        textSource: 'generated',
      }).onConflictDoNothing()

      // Quiz question
      await tx.insert(quizQuestions).values({
        id: SEED.quiz1Id,
        origin: 'wizard',
        lectureId: SEED.lecture1Id,
        sourceSlideId: SEED.slide2Id,
        promptMd: 'What is the time complexity of BST search in the worst case?',
        options: [
          { key: 'A', text: 'O(1)' },
          { key: 'B', text: 'O(log n)' },
          { key: 'C', text: 'O(n)' },
          { key: 'D', text: 'O(n log n)' },
        ],
        correctKey: 'C',
        explanationMd: 'In the worst case (a degenerate/skewed tree), BST search is O(n) — we may traverse every node.',
        conceptLabel: 'BST complexity',
      }).onConflictDoNothing()

      // Generated item referencing the quiz
      await tx.insert(generatedItems).values({
        id: SEED.item1Id,
        lectureId: SEED.lecture1Id,
        sourceSlideId: SEED.slide2Id,
        type: 'quiz',
        status: 'published',
        content: {
          promptMd: 'What is the time complexity of BST search in the worst case?',
          options: [{ key: 'A', text: 'O(1)' }, { key: 'B', text: 'O(log n)' }, { key: 'C', text: 'O(n)' }, { key: 'D', text: 'O(n log n)' }],
          correctKey: 'C',
        },
        conceptLabel: 'BST complexity',
      }).onConflictDoNothing()

      // Lecture item (interstitial placement)
      await tx.insert(lectureItems).values({
        id: SEED.li1Id,
        lectureId: SEED.lecture1Id,
        afterSlideId: SEED.slide2Id,
        kind: 'quiz',
        refId: SEED.quiz1Id,
        orderInSlot: 0,
        status: 'active',
      }).onConflictDoNothing()

      // Synthetic student progress and events
      for (let i = 0; i < SEED.students.length; i++) {
        const userId = SEED.students[i]!
        await tx.insert(studentProgress).values({
          userId,
          lectureId: SEED.lecture1Id,
          lastSlideId: SEED.slide2Id,
          maxSlideIndex: 2,
          completedAt: new Date(),
        }).onConflictDoNothing()

        await tx.insert(learningEvents).values({
          userId,
          type: 'slide_view',
          lectureId: SEED.lecture1Id,
          slideId: SEED.slide1Id,
        }).onConflictDoNothing()

        await tx.insert(learningEvents).values({
          userId,
          type: 'quiz_answer',
          lectureId: SEED.lecture1Id,
          slideId: SEED.slide2Id,
          questionId: SEED.quiz1Id,
          optionKey: i < 3 ? 'C' : 'B',
          isCorrect: i < 3,
        }).onConflictDoNothing()
      }
    })

    return NextResponse.json({ ok: true, seeded: SEED })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json(
      { error: { code: 'seed_failed', message: String(err), retryable: true } },
      { status: 500 }
    )
  }
}
