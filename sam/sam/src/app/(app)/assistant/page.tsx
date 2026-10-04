import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { PageHead } from "@/components/ui/Page";
import { aiConfigured } from "@/lib/assistant/config";
import { AssistantChat } from "./AssistantChat";

export const metadata: Metadata = { title: "Ask Sam" };

export default async function AssistantPage() {
  const profile = await getProfile();
  const raw = (profile?.full_name || "there").trim().split(" ")[0];
  const first = raw.charAt(0).toUpperCase() + raw.slice(1);
  return (
    <>
      <PageHead eyebrow="Your money assistant" title="Ask Sam" sub="Plain-language answers about your accounts, spending, loans and goals." />
      <AssistantChat firstName={first} configured={aiConfigured()} />
    </>
  );
}
