import { NextRequest, NextResponse } from "next/server";
import { companyById } from "@/lib/companies";
import { fetchCompanyJobs } from "@/lib/adapters";

// One request = one company. The browser fans out across companies, so each call stays short and
// a slow or broken career site can never take the whole dashboard down.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  // Only ids from the registry are accepted – this route cannot be used as an open proxy.
  const company = companyById(id);
  if (!company) return NextResponse.json({ id, error: "Unknown source" }, { status: 404 });

  try {
    const jobs = await fetchCompanyJobs(company);
    return NextResponse.json(
      { id, fetchedAt: new Date().toISOString(), jobs },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=7200" } }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ id, error }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
