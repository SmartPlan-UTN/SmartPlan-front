import { Container, PendingScreen } from "@/components/layout";

export default function HomePage() {
  return (
    <Container>
      <PendingScreen
        title="Contale qué querés"
        description="El hero con el campo de lenguaje natural, las sugerencias y los planes destacados."
        references="CU17, CU20 · PAN 07"
      />
    </Container>
  );
}
