"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { generatedPlansRoute, ROUTES } from "@/lib/routes";
import { parsePositiveIntId } from "@/lib/utils";

import { GeneratedPlansPanel } from "./GeneratedPlansPanel";
import { MyPlansPanel } from "./MyPlansPanel";
import styles from "./MyPlansPanel.module.css";

export function MyPlansWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const generated = params.get("tab") === "generated";
  const parsedPage = parsePositiveIntId(params.get("page") ?? "1");
  const page =
    parsedPage !== null && Number.isSafeInteger(parsedPage) ? parsedPage : 1;

  return (
    <>
      <nav className={styles.tabs} aria-label="Tipos de planes">
        <Link
          href={ROUTES.plans}
          className={styles.tab}
          aria-current={!generated ? "page" : undefined}
        >
          Creados por mí
        </Link>
        <Link
          href={generatedPlansRoute()}
          className={styles.tab}
          aria-current={generated ? "page" : undefined}
        >
          Generados para mí
        </Link>
      </nav>
      {generated ? (
        <GeneratedPlansPanel
          key={page}
          page={page}
          onPageChange={(next) =>
            router.push(generatedPlansRoute(next), { scroll: false })
          }
        />
      ) : (
        <MyPlansPanel />
      )}
    </>
  );
}
