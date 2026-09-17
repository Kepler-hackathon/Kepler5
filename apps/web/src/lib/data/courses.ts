import { course as cs201 } from "./lecture-8";
import type { Course } from "./types";

/**
 * Multi-course selector (added per user request — the finalized plan originally scoped
 * this as a single-course demo, §5.1). CS 201 is the only course with real module and
 * lecture content; the others exist so the "no modules published yet" empty state
 * (already specified for S1) has real courses to render against.
 */
export const courses: Course[] = [
  cs201,
  {
    id: "cs143",
    code: "CS 143",
    title: "Software Engineering Practices",
    instructor: "Prof. Daniel Ostrow",
    term: "Fall 2026",
    hasModules: false,
  },
  {
    id: "math220",
    code: "MATH 220",
    title: "Discrete Mathematics",
    instructor: "Dr. Elena Vasquez",
    term: "Fall 2026",
    hasModules: false,
  },
  {
    id: "phys201",
    code: "PHYS 201",
    title: "Introduction to Mechanics",
    instructor: "Prof. Marcus Chen",
    term: "Fall 2026",
    hasModules: false,
  },
];

export function courseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}
