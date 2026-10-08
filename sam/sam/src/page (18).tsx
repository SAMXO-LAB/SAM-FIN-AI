import type { Metadata } from "next";
import { PeopleView } from "@/features/people/PeopleView";
export const metadata: Metadata = { title: "Money Borrowed" };
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  return <PeopleView direction="borrowed" filter={(await searchParams).f ?? "open"} />;
}
