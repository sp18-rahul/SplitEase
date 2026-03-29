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

async function assertMember(groupId: number, userId: number): Promise<boolean> {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!m;
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

    if (!(await assertMember(groupId, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const groupId = parseInt(id);

    if (!(await assertMember(groupId, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { description, amount, paidById, splits, notes, category, receiptUrl } = await request.json();

    if (!description || !amount || !paidById || !splits) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const splitCreate = splits.map((split: any) => ({ userId: split.userId, amount: split.amount }));

    const buildData = (withExtras: boolean) => ({
      description,
      amount,
      paidById,
      groupId,
      ...(withExtras ? {
        notes: notes || null,
        category: category || null,
        receiptUrl: receiptUrl || null,
      } : {}),
      splits: { create: splitCreate },
    });

    let expense: any;
    try {
      expense = await (prisma.expense as any).create({
        data: buildData(true),
        include: { paidBy: { select: { id: true, name: true } }, splits: true },
      });
    } catch (innerError: any) {
      if (innerError?.message?.includes("Unknown argument")) {
        expense = await prisma.expense.create({
          data: buildData(false) as any,
          include: { paidBy: { select: { id: true, name: true } }, splits: true },
        });
      } else {
        throw innerError;
      }
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 400 });
  }
}
