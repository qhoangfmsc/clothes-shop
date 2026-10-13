import {
  SHIPPING_ICONS,
  SHIPPING_METHOD_IDS,
  type ShippingIcon,
  type ShippingInfo,
  type ShippingMethodId,
} from "@/src/types/shipping";

/* Form model of the SHIPPING_CONFIG site config. The BE rejects unknown fields at every level,
   so `serializeShippingForm` writes exactly the stored shape. */

/* The set of methods is fixed: admins edit them, never add or remove one */

export interface ShippingMethodForm {
  id: ShippingMethodId;
  name: string;
  description: string;
  estimatedDays: string;
  /** Kept as text while typing; validated and converted on save */
  price: string;
  icon: ShippingIcon;
}

export interface ReturnPolicyForm {
  /** Return window in days, kept as text while typing */
  days: string;
  description: string;
  /** One condition per line */
  conditions: string;
}

export interface ShippingConfigForm {
  /** Empty = no free shipping (`null`) */
  threshold: string;
  methods: ShippingMethodForm[];
  /** `null` = not known: it is left out and the BE keeps/fills its own default */
  returnPolicy: ReturnPolicyForm | null;
}

export const SHIPPING_LIMITS = {
  name: 100,
  description: 255,
  estimatedDays: 100,
  money: 99_999_999,
  returnDaysMax: 365,
  returnDescription: 500,
  returnConditions: 10,
  returnCondition: 255,
} as const;

const isMethodId = (value: unknown): value is ShippingMethodId =>
  SHIPPING_METHOD_IDS.some((id) => id === value);
const isIcon = (value: unknown): value is ShippingIcon => SHIPPING_ICONS.some((icon) => icon === value);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const money = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? String(value) : "");

function returnPolicyFrom(raw: unknown): ReturnPolicyForm | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { days, description, conditions } = raw as { days?: unknown; description?: unknown; conditions?: unknown };
  return {
    days: typeof days === "number" && Number.isFinite(days) ? String(days) : "",
    description: text(description),
    conditions: Array.isArray(conditions) ? conditions.filter((c): c is string => typeof c === "string").join("\n") : "",
  };
}

/** Builds the form from a stored/served config; null when the shape is not usable */
function fromObject(raw: unknown): ShippingConfigForm | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { freeShippingThreshold, methods } = raw as { freeShippingThreshold?: unknown; methods?: unknown };
  if (!Array.isArray(methods)) return null;

  const form: ShippingMethodForm[] = [];
  for (const id of SHIPPING_METHOD_IDS) {
    const found = methods.find((m): m is Record<string, unknown> => typeof m === "object" && m !== null && m.id === id);
    if (!found || !isIcon(found.icon)) return null;
    form.push({
      id,
      name: text(found.name),
      description: text(found.description),
      estimatedDays: text(found.estimatedDays),
      price: money(found.price),
      icon: found.icon,
    });
  }
  return { threshold: money(freeShippingThreshold), methods: form, returnPolicy: returnPolicyFrom((raw as { returnPolicy?: unknown }).returnPolicy) };
}

/** The saved `value` string (a JSON string), or null when it is missing or broken */
export function parseShippingValue(value: string | undefined): ShippingConfigForm | null {
  if (!value) return null;
  try {
    return fromObject(JSON.parse(value));
  } catch {
    return null;
  }
}

/** The config customers see now (`GET /api/shipping`) — what the form starts from when nothing is saved yet */
export function shippingInfoToForm(info: ShippingInfo | null): ShippingConfigForm | null {
  if (!info) return null;
  return fromObject({
    freeShippingThreshold: info.freeShippingThreshold,
    methods: info.methods,
    returnPolicy: info.returnPolicy,
  });
}

export type ShippingFieldError =
  | { kind: "required" }
  | { kind: "tooLong"; max: number }
  | { kind: "number" }
  | { kind: "positive" }
  | { kind: "tooBig" }
  | { kind: "range"; max: number }
  | { kind: "tooMany"; max: number };

/** Errors by field path: `threshold`, `returnPolicy.<days|description|conditions>`, or `<methodId>.<name|description|estimatedDays|price>` */
export type ShippingFormErrors = Record<string, ShippingFieldError>;

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

function checkMoney(value: string, { allowZero }: { allowZero: boolean }): ShippingFieldError | null {
  if (!MONEY_PATTERN.test(value)) return { kind: "number" };
  const amount = Number(value);
  if (amount > SHIPPING_LIMITS.money) return { kind: "tooBig" };
  if (!allowZero && amount <= 0) return { kind: "positive" };
  return null;
}

function checkText(value: string, max: number, { required }: { required: boolean }): ShippingFieldError | null {
  const trimmed = value.trim();
  if (required && !trimmed) return { kind: "required" };
  if (trimmed.length > max) return { kind: "tooLong", max };
  return null;
}

/** Same rules as the BE, so the admin sees the problem before the request */
export function validateShippingForm(form: ShippingConfigForm): ShippingFormErrors {
  const errors: ShippingFormErrors = {};
  const set = (path: string, error: ShippingFieldError | null) => {
    if (error) errors[path] = error;
  };

  if (form.threshold.trim()) set("threshold", checkMoney(form.threshold.trim(), { allowZero: false }));
  for (const m of form.methods) {
    set(`${m.id}.name`, checkText(m.name, SHIPPING_LIMITS.name, { required: true }));
    set(`${m.id}.description`, checkText(m.description, SHIPPING_LIMITS.description, { required: false }));
    set(`${m.id}.estimatedDays`, checkText(m.estimatedDays, SHIPPING_LIMITS.estimatedDays, { required: true }));
    set(`${m.id}.price`, checkMoney(m.price.trim(), { allowZero: true }));
  }
  if (form.returnPolicy) {
    const { days, description, conditions } = form.returnPolicy;
    if (!/^\d+$/.test(days.trim())) set("returnPolicy.days", { kind: "number" });
    else if (Number(days) < 1 || Number(days) > SHIPPING_LIMITS.returnDaysMax) set("returnPolicy.days", { kind: "range", max: SHIPPING_LIMITS.returnDaysMax });
    set("returnPolicy.description", checkText(description, SHIPPING_LIMITS.returnDescription, { required: false }));
    const lines = splitConditions(conditions);
    if (lines.length > SHIPPING_LIMITS.returnConditions) set("returnPolicy.conditions", { kind: "tooMany", max: SHIPPING_LIMITS.returnConditions });
    else if (lines.some((line) => line.length > SHIPPING_LIMITS.returnCondition)) set("returnPolicy.conditions", { kind: "tooLong", max: SHIPPING_LIMITS.returnCondition });
  }
  return errors;
}

const splitConditions = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** The string for `PUT /api/admin/site-config/SHIPPING_CONFIG` (`{ value }`) — call only on a valid form */
export function serializeShippingForm(form: ShippingConfigForm): string {
  return JSON.stringify({
    freeShippingThreshold: form.threshold.trim() ? Number(form.threshold) : null,
    methods: form.methods.map((m) => ({
      id: m.id,
      name: m.name.trim(),
      description: m.description.trim(),
      estimatedDays: m.estimatedDays.trim(),
      price: Number(m.price),
      icon: m.icon,
    })),
    ...(form.returnPolicy
      ? {
          returnPolicy: {
            days: Number(form.returnPolicy.days),
            description: form.returnPolicy.description.trim(),
            conditions: splitConditions(form.returnPolicy.conditions),
          },
        }
      : {}),
  });
}
