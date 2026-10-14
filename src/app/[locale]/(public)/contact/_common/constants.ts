/* ═══════════════════════════════════════════════════════════
   CONTACT MODULE CONSTANTS
   ═══════════════════════════════════════════════════════════ */

import type { Measurements, MeasurementKey, OrderRequestValues } from "./types";

export const MEASUREMENT_KEYS: MeasurementKey[] = ["height", "bust", "waist", "hips"];

const EMPTY_MEASUREMENTS: Measurements = { height: "", bust: "", waist: "", hips: "" };

export const EMPTY_ORDER_REQUEST: OrderRequestValues = {
  note: "",
  quantity: 1,
  measurements: EMPTY_MEASUREMENTS,
  weight: "",
  neededBy: "",
  fullName: "",
  phone: "",
};

export const MAX_NOTE_LENGTH = 1000;
export const MAX_QUANTITY = 10;
export const MIN_PHONE_DIGITS = 8;
export const MAX_PHONE_DIGITS = 15;
