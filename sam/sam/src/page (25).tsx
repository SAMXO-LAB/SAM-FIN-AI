import type { Metadata } from "next";
import { PeopleView } from "@/features/people/PeopleView";
export const metadata: Metadata = { title: "Money Lent" };
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  return <PeopleView direction="lent" filter={(await searchParams).f ?? "open"} />;
}
