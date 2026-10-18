import { NextResponse } from "next/server";
import { deleteWorkspace } from "@/lib/store";
import { getWorkspace, jsonError, workspaceId } from "@/lib/workspace";

// Export everything we hold about you.
export async function GET() {
  try {
    const s = await getWorkspace();
    return new NextResponse(JSON.stringify(s, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="callback-export.json"' },
    });
  } catch (e) {
    return jsonError(e);
  }
}

// Delete documents, Vault, jobs, applications and logs.
export async function DELETE() {
  try {
    await deleteWorkspace(await workspaceId());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
