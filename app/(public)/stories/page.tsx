export const runtime = 'edge';
import { Metadata } from "next";
import { Caveat } from "next/font/google";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { UserStory } from "@/types/user-stories";
import Nav from "@/components/marketing/Nav";
import StoryBuilder from "./StoryBuilder";

const chalkFont = Caveat({ subsets: ["latin"], weight: ["700"], variable: "--font-chalk" });

export const metadata: Metadata = {
  title: "Story Builder — PrimaryAI",
  description: "Create user stories for the PrimaryAI platform on behalf of teachers.",
};

export default async function StoriesPage() {
  const supabase = getSupabaseAdminClient();
  let initialStories: UserStory[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("user_stories")
      .select("*")
      .order("created_at", { ascending: false });
    initialStories = (data as UserStory[]) ?? [];
  }

  return (
    <div className={`page-wrap ${chalkFont.variable}`}>
      <Nav />
      <StoryBuilder initialStories={initialStories} />
    </div>
  );
}
