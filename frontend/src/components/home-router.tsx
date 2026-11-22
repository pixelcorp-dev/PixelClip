"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth-client";

const HomeApp = dynamic(() => import("@/components/home-app"), {
  ssr: false,
});

/** The create screen: the app for signed-in users, the sign-in page for everyone else. */
export function HomeRouter() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [isPending, router, session?.user]);

  if (isPending || !session?.user) {
    return null;
  }

  return <HomeApp />;
}
