import type { Metadata } from "next";

import { CreatePlanForm } from "@/components/plan";
import { Container } from "@/components/layout";

export const metadata: Metadata = {
  title: "Crear Plan",
};

export default function CreatePlanPage() {
  return (
    <Container>
      <CreatePlanForm />
    </Container>
  );
}
