import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getAuthUserId(request: NextRequest, session: any): number | null {
  if (session?.user?.id) return parseInt(session.user.id as string);
  const mobileId = request.headers.get("X-Mobile-User-Id");
  if (mobileId) return parseInt(mobileId);
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const groupId = parseInt(id);

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const group = await (prisma.group as any).findUnique({
      where: { id: groupId },
      include: {
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        members: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const currency = group.currency || "INR";

    // Build CSV rows
    const rows: string[] = [];

    // Header
    rows.push(`Group: ${group.name}`);
    rows.push(`Currency: ${currency}`);
    rows.push(`Exported: ${new Date().toLocaleDateString("en-IN")}`);
    rows.push("");

    // Expenses section
    rows.push("EXPENSES");
    rows.push(["Date", "Description", "Category", "Amount", "Paid By", "Notes", "Splits"].join(","));

    for (const e of group.expenses) {
      const splits = e.splits
        .map((s: any) => `${s.user.name}:${s.amount.toFixed(2)}`)
        .join(" | ");
      rows.push([
        new Date(e.createdAt).toLocaleDateString("en-IN"),
        `"${e.description.replace(/"/g, '""')}"`,
        e.category || "other",
        e.amount.toFixed(2),
        e.paidBy.name,
        `"${(e.notes || "").replace(/"/g, '""')}"`,
        `"${splits}"`,
      ].join(","));
    }

    rows.push("");

    // Settlements section
    rows.push("SETTLEMENTS");
    rows.push(["Date", "From", "To", "Amount"].join(","));

    for (const s of group.settlements) {
      rows.push([
        new Date(s.createdAt).toLocaleDateString("en-IN"),
        s.fromUser.name,
        s.toUser.name,
        s.amount.toFixed(2),
      ].join(","));
    }

    rows.push("");

    // Summary section
    rows.push("SUMMARY");
    const totalSpent = group.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalSettled = group.settlements.reduce((sum: number, s: any) => sum + s.amount, 0);
    rows.push(`Total Expenses,${totalSpent.toFixed(2)}`);
    rows.push(`Total Settled,${totalSettled.toFixed(2)}`);
    rows.push(`Members,${group.members.map((m: any) => m.user.name).join(" | ")}`);

    const csv = rows.join("\n");
    const filename = `${group.name.replace(/[^a-z0-9]/gi, "_")}_expenses.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
