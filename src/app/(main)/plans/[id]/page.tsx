import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlanDetailView } from "@/components/plan";
import { fetchSharedPlan } from "@/lib/plans/sharedPlan";
import { siteOrigin } from "@/lib/plans/siteOrigin";
import { planDetailOrigin } from "@/lib/routes";
import { formatDuration, formatPlanTotal, parsePositiveIntId } from "@/lib/utils";

/**
 * A published plan names itself in the link preview (WhatsApp and others);
 * the card image is `preview-image/route.tsx`, linked on the address the page
 * was opened on so it is right locally, through a tunnel and once deployed.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const planId = parsePositiveIntId((await params).id);
  const plan = planId == null ? null : await fetchSharedPlan(planId);
  if (!plan) return { title: "Plan" };

  const stops = [...plan.details]
    .sort((left, right) => left.order - right.order)
    .map((detail) => detail.activity.name)
    .join(" → ");
  const description = `${stops} · ${formatPlanTotal(plan)} · ${formatDuration(plan.estimatedTotalDuration)}`;
  const origin = await siteOrigin();
  return {
    title: plan.title,
    description,
    openGraph: {
      title: plan.title,
      description,
      type: "website",
      siteName: "smartplan",
      url: `${origin}/plans/${plan.id}`,
      images: [
        {
          url: `${origin}/plans/${plan.id}/preview-image`,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: plan.title,
        },
      ],
    },
  };
}

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { id } = await params;
  const planId = parsePositiveIntId(id);
  if (planId == null) {
    notFound();
  }

  // No `Container` here: the hero goes full-bleed, matching
  // SmartPlanSystemDesign/v2/PlanDetail.jsx. `PlanDetailView` centers the
  // rest of its content itself.
  return <PlanDetailView planId={planId} returnTo={planDetailOrigin((await searchParams).from)} />;
}
