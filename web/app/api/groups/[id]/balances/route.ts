import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBalances, minimizeTransactions } from "@/lib/utils";

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

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        expenses: { include: { splits: true } },
        settlements: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const expenses = group.expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      paidById: expense.paidById,
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        amount: split.amount,
      })),
    }));

    const balances = calculateBalances(expenses);

    for (const settlement of group.settlements) {
      if (!balances[settlement.fromUserId]) balances[settlement.fromUserId] = 0;
      if (!balances[settlement.toUserId]) balances[settlement.toUserId] = 0;
      balances[settlement.fromUserId] += settlement.amount;
      balances[settlement.toUserId] -= settlement.amount;
    }

    const transactions = minimizeTransactions(balances);

    return NextResponse.json({
      balances,
      transactions,
      members: group.members.map((m) => ({ id: m.user.id, name: m.user.name })),
      settlements: group.settlements,
    });
  } catch (error) {
    console.error("Error calculating balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
