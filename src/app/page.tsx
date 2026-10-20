export const instant = false;

import { redirect } from "next/navigation";
import { homeFor, requireSession } from "@/lib/dal";

export default async function Home() {
  const session = await requireSession();
  redirect(homeFor(session.role));
}
