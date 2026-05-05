import { NextResponse } from "next/server";
import { tickOnce } from "@/lib/jobs/runner";

export async function GET() {
  const r = await tickOnce();
  return NextResponse.json(r);
}
