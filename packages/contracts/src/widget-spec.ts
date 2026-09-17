import { z } from 'zod'

const Citation = z.object({
  ref: z.string(),
  label: z.string(),
})

const Frame = z.object({
  name: z.string(),
  args: z.record(z.unknown()).optional(),
})

const Option = z.object({
  key: z.string(),
  text: z.string(),
})

const Base = z.object({
  family: z.enum(['stepper', 'slider', 'predict_check']),
  kind: z.string().min(1),
  title: z.string().max(120),
  explanationMd: z.string().max(4000),
  citations: z.array(Citation).max(6).default([]),
})

export const TraceStepper = Base.extend({
  family: z.literal('stepper'),
  code: z.object({
    language: z.string(),
    source: z.string().max(4000),
  }),
  steps: z.array(
    z.object({
      line: z.number().int().min(1),
      stack: z.array(Frame).max(12),
      vars: z.record(z.string()).optional(),
      note: z.string().max(300),
    })
  ).min(2).max(40),
})

export const Slider = Base.extend({
  family: z.literal('slider'),
  param: z.object({
    name: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    default: z.number(),
  }),
  // expr is evaluated by a safe evaluator, not eval()
  series: z.array(
    z.object({
      label: z.string(),
      expr: z.string().max(200),
    })
  ).min(1).max(4),
})

export const PredictCheck = Base.extend({
  family: z.literal('predict_check'),
  stages: z.array(
    z.object({
      promptMd: z.string(),
      options: z.array(Option).min(2).max(4),
      correctKey: z.string(),
      revealMd: z.string(),
    })
  ).min(1).max(5),
})

export const WidgetSpec = z.discriminatedUnion('family', [TraceStepper, Slider, PredictCheck])
export type WidgetSpec = z.infer<typeof WidgetSpec>
export type TraceStepperSpec = z.infer<typeof TraceStepper>
export type SliderSpec = z.infer<typeof Slider>
export type PredictCheckSpec = z.infer<typeof PredictCheck>
