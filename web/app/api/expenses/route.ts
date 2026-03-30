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

// GET: All expenses where the user either paid or has a split
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { paidById: userId },
          { splits: { some: { userId } } },
        ],
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: true,
        group: { select: { id: true, name: true, emoji: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Annotate each expense with this user's share
    const annotated = expenses.map((e) => {
      const myShare = e.splits.find((s) => s.userId === userId)?.amount ?? 0;
      const iPaid = e.paidById === userId;
      // net = what I'm owed if I paid, or what I owe if I didn't
      const net = iPaid ? e.amount - myShare : -myShare;
      return {
        id: e.id,
        description: e.description,
        amount: e.amount,
        category: e.category,
        notes: e.notes,
        receiptUrl: e.receiptUrl,
        createdAt: e.createdAt,
        paidBy: e.paidBy,
        paidById: e.paidById,
        group: e.group,
        myShare,
        iPaid,
        net, // positive = others owe me, negative = I owe others
      };
    });

    // Summary stats
    const totalPaidByMe = annotated
      .filter((e) => e.iPaid)
      .reduce((s, e) => s + e.amount, 0);
    const totalMyShare = annotated.reduce((s, e) => s + e.myShare, 0);
    const netBalance = annotated.reduce((s, e) => s + e.net, 0);

    return NextResponse.json({
      expenses: annotated,
      stats: {
        totalPaidByMe,
        totalMyShare,
        netBalance,
        count: annotated.length,
      },
    });
  } catch (error) {
    console.error("Error fetching personal expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
