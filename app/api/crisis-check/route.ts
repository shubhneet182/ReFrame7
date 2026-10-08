import { NextResponse } from "next/server";
import { checkCrisis } from "@/lib/crisis";
import { jsonError, readBody, textField } from "@/lib/route-helpers";
import type { ApiError, CrisisCheckResponse } from "@/types";

export async function POST(
  request: Request,
): Promise<NextResponse<CrisisCheckResponse | ApiError>> {
  const body = await readBody(request);
  const text = textField(body?.text);
  if (text === null) return jsonError("text is required", 400);

  return NextResponse.json(checkCrisis(text));
}
