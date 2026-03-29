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

    // Fetch expenses and settlements in parallel
    const [expenses, settlements] = await Promise.all([
      (prisma.expense as any).findMany({
        where: { groupId },
        include: { paidBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Merge into unified activity list
    const activities = [
      ...expenses.map((e: any) => ({
        id: `expense-${e.id}`,
        type: "expense" as const,
        title: e.description,
        subtitle: `${e.paidBy.name} paid`,
        amount: e.amount,
        category: e.category,
        actor: e.paidBy,
        createdAt: e.createdAt,
      })),
      ...settlements.map((s) => ({
        id: `settlement-${s.id}`,
        type: "settlement" as const,
        title: `${s.fromUser.name} paid ${s.toUser.name}`,
        subtitle: "Settlement",
        amount: s.amount,
        category: null,
        actor: s.fromUser,
        createdAt: s.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
