import {
  INTENT_DIMENSION_MAX,
  INTENT_DIMENSION_MIN,
  type UserIntent,
} from "./types.js";

export class IntentValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`Invalid user intent: ${errors.join("; ")}`);
    this.name = "IntentValidationError";
    this.errors = errors;
  }
}

export type IntentValidationResult =
  | { valid: true; intent: UserIntent }
  | { valid: false; errors: string[] };

const INTENT_FIELDS = ["risk", "liquidity", "returnPreference"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDimension(
  field: (typeof INTENT_FIELDS)[number],
  value: unknown,
  errors: string[],
): number | undefined {
  if (value === undefined) {
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${field} must be a finite number`);
    return undefined;
  }

  if (!Number.isInteger(value)) {
    errors.push(`${field} must be an integer between ${INTENT_DIMENSION_MIN} and ${INTENT_DIMENSION_MAX}`);
    return undefined;
  }

  if (value < INTENT_DIMENSION_MIN) {
    errors.push(`${field} must be at least ${INTENT_DIMENSION_MIN}`);
    return undefined;
  }

  if (value > INTENT_DIMENSION_MAX) {
    errors.push(`${field} must be at most ${INTENT_DIMENSION_MAX}`);
    return undefined;
  }

  return value;
}

export function validateIntent(input: unknown): IntentValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { valid: false, errors: ["Intent must be a plain object"] };
  }

  const risk = validateDimension("risk", input.risk, errors);
  const liquidity = validateDimension("liquidity", input.liquidity, errors);
  const returnPreference = validateDimension(
    "returnPreference",
    input.returnPreference,
    errors,
  );

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    intent: {
      risk: risk as number,
      liquidity: liquidity as number,
      returnPreference: returnPreference as number,
    },
  };
}

export function assertValidIntent(input: unknown): UserIntent {
  const result = validateIntent(input);

  if (!result.valid) {
    throw new IntentValidationError(result.errors);
  }

  return result.intent;
}
