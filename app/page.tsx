import { redirect } from "next/navigation";
import { dashboardForRole, getSessionUser } from "@/lib/auth";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? dashboardForRole(user.role) : "/login");
}
