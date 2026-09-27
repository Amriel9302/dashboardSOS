import { loadDashboardData } from "@/lib/data";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await loadDashboardData();
  return <DashboardClient data={data} />;
}
