"use client";

import { PlanComposer } from "./PlanComposer";

export interface CreatePlanFormProps {
  initialActivityId?: number;
  returnToActivity?: boolean;
}

/** Compatibility entry point: creation and editing share PlanComposer. */
export function CreatePlanForm(props: CreatePlanFormProps) {
  return <PlanComposer mode="create" {...props} />;
}
