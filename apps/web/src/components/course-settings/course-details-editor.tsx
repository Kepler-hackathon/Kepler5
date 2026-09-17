"use client";

import * as React from "react";
import Link from "next/link";
import { GearSix, Link as LinkIcon, BookOpen, CheckCircle } from "@phosphor-icons/react";
import { AppNav } from "@/components/nav/app-nav";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/lib/identity";
import { apiJson } from "@/lib/api-client";

interface CourseDetails {
  id: string;
  name: string;
  code: string | null;
  term: string | null;
  instructorName: string | null;
  description: string | null;
  syllabusUrl: string | null;
  textbookTitle: string | null;
  textbookAuthor: string | null;
  textbookIsbn: string | null;
  textbookUrl: string | null;
  officeHours: string | null;
  homeworkPolicy: string | null;
  gradingPolicy: string | null;
  prerequisites: string | null;
  contactEmail: string | null;
}

type FormState = Omit<CourseDetails, "id">;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-ink mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 bg-canvas text-ink rounded-[var(--radius-control)] border border-hairline text-[14px] font-body focus:outline-none focus:ring-2 focus:ring-button-primary/30 placeholder:text-muted";

export function CourseDetailsEditor({ courseId }: { courseId: string }) {
  const identity = useIdentity();
  const [course, setCourse] = React.useState<CourseDetails | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!identity) return;
    apiJson<CourseDetails>(`/api/courses/${courseId}`)
      .then((c) => {
        setCourse(c);
        setForm({
          name: c.name,
          code: c.code ?? "",
          term: c.term ?? "",
          instructorName: c.instructorName ?? "",
          description: c.description ?? "",
          syllabusUrl: c.syllabusUrl ?? "",
          textbookTitle: c.textbookTitle ?? "",
          textbookAuthor: c.textbookAuthor ?? "",
          textbookIsbn: c.textbookIsbn ?? "",
          textbookUrl: c.textbookUrl ?? "",
          officeHours: c.officeHours ?? "",
          homeworkPolicy: c.homeworkPolicy ?? "",
          gradingPolicy: c.gradingPolicy ?? "",
          prerequisites: c.prerequisites ?? "",
          contactEmail: c.contactEmail ?? "",
        } as FormState);
      })
      .catch(() => setError("Failed to load course details"));
  }, [identity, courseId]);

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => f ? { ...f, [field]: value } : f);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const nullify = (v: string | null) => (v === "" ? null : v);
      const updated = await apiJson<CourseDetails>(`/api/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          code: nullify(form.code as string),
          term: nullify(form.term as string),
          instructorName: nullify(form.instructorName as string),
          description: nullify(form.description as string),
          syllabusUrl: nullify(form.syllabusUrl as string),
          textbookTitle: nullify(form.textbookTitle as string),
          textbookAuthor: nullify(form.textbookAuthor as string),
          textbookIsbn: nullify(form.textbookIsbn as string),
          textbookUrl: nullify(form.textbookUrl as string),
          officeHours: nullify(form.officeHours as string),
          homeworkPolicy: nullify(form.homeworkPolicy as string),
          gradingPolicy: nullify(form.gradingPolicy as string),
          prerequisites: nullify(form.prerequisites as string),
          contactEmail: nullify(form.contactEmail as string),
        }),
      });
      setCourse(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (identity && identity.role !== "teacher") {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-[15px] text-muted font-body">You don&rsquo;t have permission to edit course details.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppNav
        courseId={courseId}
        course={course ? { code: course.code, title: course.name } : null}
        activeHref={`/course/${courseId}/settings`}
      />

      <main className="w-full pt-16">
        <div className="max-w-[860px] mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[12px] text-muted font-body mb-6">
            <Link href="/courses" className="hover:text-ink transition-colors">Courses</Link>
            <span className="text-hairline">/</span>
            <Link href={`/course/${courseId}`} className="hover:text-ink transition-colors">
              {course?.name ?? "Course"}
            </Link>
            <span className="text-hairline">/</span>
            <span className="text-ink font-medium">Course Details</span>
          </nav>

          {/* Page title */}
          <div className="flex items-center gap-3 mb-8">
            <GearSix weight="duotone" className="size-9 text-button-primary shrink-0" />
            <div>
              <h1 className="font-[family-name:var(--font-headline)] text-[36px] text-ink tracking-tight leading-tight">
                Course Details
              </h1>
              <p className="text-[14px] text-muted font-body mt-0.5">
                These settings apply to the whole course — not per-module.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-[var(--radius-control)] bg-error/10 border border-error/40 px-4 py-3 text-[13px] text-error font-body">
              {error}
            </div>
          )}

          {!form ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 rounded-[var(--radius-card)] bg-surface-soft animate-pulse" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Section 1 — Course Identity */}
              <section className="rounded-[var(--radius-card)] bg-surface-card border border-hairline p-6">
                <h2 className="text-[13px] font-semibold uppercase tracking-[1px] text-muted mb-5">
                  Course Identity
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Course Name *">
                    <input
                      required
                      className={inputCls}
                      value={form.name as string}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Introduction to Algorithms"
                    />
                  </Field>
                  <Field label="Course Code">
                    <input
                      className={inputCls}
                      value={form.code as string}
                      onChange={(e) => set("code", e.target.value)}
                      placeholder="CS 106B"
                    />
                  </Field>
                  <Field label="Term">
                    <input
                      className={inputCls}
                      value={form.term as string}
                      onChange={(e) => set("term", e.target.value)}
                      placeholder="Spring 2026"
                    />
                  </Field>
                  <Field label="Instructor Name">
                    <input
                      className={inputCls}
                      value={form.instructorName as string}
                      onChange={(e) => set("instructorName", e.target.value)}
                      placeholder="Prof. Jane Smith"
                    />
                  </Field>
                  <Field label="Contact Email">
                    <input
                      type="email"
                      className={inputCls}
                      value={form.contactEmail as string}
                      onChange={(e) => set("contactEmail", e.target.value)}
                      placeholder="instructor@university.edu"
                    />
                  </Field>
                </div>
              </section>

              {/* Section 2 — Description & Syllabus */}
              <section className="rounded-[var(--radius-card)] bg-surface-card border border-hairline p-6">
                <h2 className="text-[13px] font-semibold uppercase tracking-[1px] text-muted mb-5">
                  Description &amp; Syllabus
                </h2>
                <div className="space-y-4">
                  <Field label="Course Description">
                    <textarea
                      rows={4}
                      className={inputCls}
                      value={form.description as string}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="A brief overview of what students will learn…"
                    />
                    <p className="text-[11px] text-muted font-body mt-1">Markdown supported. Shown on the course landing page.</p>
                  </Field>
                  <Field label="Prerequisites">
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={form.prerequisites as string}
                      onChange={(e) => set("prerequisites", e.target.value)}
                      placeholder="CS 106A or equivalent; basic comfort with Python"
                    />
                  </Field>
                  <Field label="Syllabus URL">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                      <input
                        type="url"
                        className={`${inputCls} pl-9`}
                        value={form.syllabusUrl as string}
                        onChange={(e) => set("syllabusUrl", e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  </Field>
                </div>
              </section>

              {/* Section 3 — Textbook */}
              <section className="rounded-[var(--radius-card)] bg-surface-card border border-hairline p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen weight="duotone" className="size-5 text-button-primary" />
                  <h2 className="text-[13px] font-semibold uppercase tracking-[1px] text-muted">
                    Textbook
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Title">
                    <input
                      className={inputCls}
                      value={form.textbookTitle as string}
                      onChange={(e) => set("textbookTitle", e.target.value)}
                      placeholder="Introduction to Algorithms (CLRS)"
                    />
                  </Field>
                  <Field label="Author(s)">
                    <input
                      className={inputCls}
                      value={form.textbookAuthor as string}
                      onChange={(e) => set("textbookAuthor", e.target.value)}
                      placeholder="Cormen, Leiserson, Rivest, Stein"
                    />
                  </Field>
                  <Field label="ISBN">
                    <input
                      className={inputCls}
                      value={form.textbookIsbn as string}
                      onChange={(e) => set("textbookIsbn", e.target.value)}
                      placeholder="978-0-262-04630-5"
                    />
                  </Field>
                  <Field label="Link / URL">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                      <input
                        type="url"
                        className={`${inputCls} pl-9`}
                        value={form.textbookUrl as string}
                        onChange={(e) => set("textbookUrl", e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  </Field>
                </div>
              </section>

              {/* Section 4 — Policies */}
              <section className="rounded-[var(--radius-card)] bg-surface-card border border-hairline p-6">
                <h2 className="text-[13px] font-semibold uppercase tracking-[1px] text-muted mb-5">
                  Policies &amp; Schedule
                </h2>
                <div className="space-y-4">
                  <Field label="Office Hours">
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={form.officeHours as string}
                      onChange={(e) => set("officeHours", e.target.value)}
                      placeholder="Mon/Wed 3–5 PM · Gates 380&#10;Fri 1–2 PM · Zoom (link on course portal)"
                    />
                  </Field>
                  <Field label="Homework Policy">
                    <textarea
                      rows={4}
                      className={inputCls}
                      value={form.homeworkPolicy as string}
                      onChange={(e) => set("homeworkPolicy", e.target.value)}
                      placeholder="Assignments are due Sundays at 11:59 PM. Late submissions accepted up to 48 hours with a 10% penalty…"
                    />
                  </Field>
                  <Field label="Grading Policy">
                    <textarea
                      rows={4}
                      className={inputCls}
                      value={form.gradingPolicy as string}
                      onChange={(e) => set("gradingPolicy", e.target.value)}
                      placeholder="Homework 40%, Midterm 25%, Final 30%, Participation 5%…"
                    />
                  </Field>
                </div>
              </section>

              {/* Footer actions */}
              <div className="flex items-center gap-4 pb-8">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Course Details"}
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-success-text font-semibold">
                    <CheckCircle weight="fill" className="size-4" />
                    Saved
                  </span>
                )}
                <Link
                  href={`/course/${courseId}`}
                  className="text-[13px] text-muted hover:text-ink font-body transition-colors"
                >
                  Back to course
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
