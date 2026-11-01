import type { Metadata } from "next";

import { HELP_COPY, HelpScreen } from "@/components/help";
import { Container } from "@/components/layout";

export const metadata: Metadata = {
  title: HELP_COPY.metaTitle,
};

/** Public on purpose: someone locked out of their account still needs it. */
export default function HelpPage() {
  return (
    <Container>
      <HelpScreen />
    </Container>
  );
}
