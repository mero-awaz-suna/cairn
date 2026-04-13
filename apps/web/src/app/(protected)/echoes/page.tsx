import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EchoesClient } from "./client";

export default async function EchoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("is_approved", true)
    .order("helped_count", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-warm-cream pb-24">
      <EchoesClient memories={memories || []} />
      <BottomNav />
    </div>
  );
}
