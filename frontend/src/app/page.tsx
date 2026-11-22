import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HomeRouter } from "@/components/home-router";
import { getSiteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: { canonical: getSiteUrl() },
  };
}

export default function HomePage() {
  return <HomeRouter />;
}
