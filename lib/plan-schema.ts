export const planSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'days'],
  properties: {
    title: { type: 'string', minLength: 1 },
    summary: { type: 'string', minLength: 1 },
    days: {
      type: 'array',
      minItems: 1,
      maxItems: 60,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day_number', 'title', 'tasks', 'estimated_time', 'encouragement'],
        properties: {
          day_number: { type: 'integer', minimum: 1 },
          title: { type: 'string', minLength: 1 },
          tasks: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: { type: 'string', minLength: 1 },
          },
          estimated_time: { type: 'integer', minimum: 5, maximum: 480 },
          encouragement: { type: 'string', minLength: 1 },
        },
      },
    },
  },
} as const;

export type GeneratedPlanDay = {
  day_number: number;
  title: string;
  tasks: string[];
  estimated_time: number;
  encouragement: string;
};

export type GeneratedPlan = {
  title: string;
  summary: string;
  days: GeneratedPlanDay[];
};
