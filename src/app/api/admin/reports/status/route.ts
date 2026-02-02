import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase";
import { verifyCsrf } from "@/lib/csrf";
import { sanitizeText } from "@/lib/utils";
import { z } from "zod";

const ALLOWED_STATUS = new Set(["approved", "declined", "pending"]);
const payloadSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["approved", "declined", "pending"]),
});

export async function POST(request: Request) {
  const { isAdmin, session } = await requireAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const payload = parsed.data;

  if (!ALLOWED_STATUS.has(payload.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 500 }
    );
  }

  const { data: report, error: reportError } = await supabase
    .from("overwatch_reports")
    .select(
      "id, target_steam_id, target_persona_name, reporter_steam_id, reporter_persona_name"
    )
    .eq("id", payload.id)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json(
      { error: reportError?.message ?? "Report not found." },
      { status: 404 }
    );
  }

  const resolvedAt =
    payload.status === "pending" ? null : new Date().toISOString();
  const resolvedBy = payload.status === "pending" ? null : session?.steamId ?? null;

  const { error: updateError } = await supabase
    .from("overwatch_reports")
    .update({
      status: payload.status,
      resolved_at: resolvedAt,
      resolved_by: resolvedBy,
    })
    .eq("id", report.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (payload.status !== "pending") {
    const targetLabel = sanitizeText(
      report.target_persona_name || report.target_steam_id
    );
    const message =
      payload.status === "approved"
        ? `Report for ${targetLabel} is approved.`
        : `Report for ${targetLabel} is declined.`;

    await supabase.from("pgrep_notifications").insert({
      recipient_steam_id: report.reporter_steam_id,
      message,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

