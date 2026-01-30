import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase";

const ALLOWED_STATUS = new Set(["approved", "declined"]);

export async function POST(request: Request) {
  const { isAdmin, session } = await requireAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { id?: number; status?: string }
    | null;
  if (!payload?.id || !payload?.status) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (!ALLOWED_STATUS.has(payload.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
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

  const { error: updateError } = await supabase
    .from("overwatch_reports")
    .update({
      status: payload.status,
      resolved_at: new Date().toISOString(),
      resolved_by: session?.steamId ?? null,
    })
    .eq("id", report.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const targetLabel = report.target_persona_name || report.target_steam_id;
  const message =
    payload.status === "approved"
      ? `Report for ${targetLabel} is approved.`
      : `Report for ${targetLabel} is declined.`;

  await supabase.from("pgrep_notifications").insert({
    recipient_steam_id: report.reporter_steam_id,
    message,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

