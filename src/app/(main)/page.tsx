import { Container, PendingScreen } from "@/components/layout";

export default function HomePage() {
  return (
    <Container>
      <PendingScreen
        title="Contale qué querés"
        description="El hero con el field de lenguaje natural, las sugerencias y los plans destacados."
        referencias="CU17, CU20 · PAN 07"
      />
    </Container>
  );
}
