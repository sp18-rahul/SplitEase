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
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, expenseId } = await params;
    const groupId = parseInt(id);
    const expId = parseInt(expenseId);

    if (!(await assertMember(groupId, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expId },
      include: { paidBy: { select: { id: true, name: true, email: true } }, splits: true },
    });

    if (!expense || expense.groupId !== groupId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, expenseId } = await params;
    const groupId = parseInt(id);
    const expId = parseInt(expenseId);

    if (!(await assertMember(groupId, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { description, amount, paidById, splits, notes, category, receiptUrl } = await request.json();

    if (!description || !amount || !paidById || !splits) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({ where: { id: expId } });
    if (!expense || expense.groupId !== groupId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expenseSplit.deleteMany({ where: { expenseId: expId } });

    const buildUpdateData = (withExtras: boolean) => ({
      description: description.trim(),
      amount: parseFloat(amount),
      paidById,
      ...(withExtras ? {
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(category !== undefined ? { category: category || null } : {}),
        ...(receiptUrl !== undefined ? { receiptUrl: receiptUrl || null } : {}),
      } : {}),
      splits: {
        create: splits.map((s: any) => ({ userId: s.userId, amount: parseFloat(s.amount) })),
      },
    });

    let updatedExpense: any;
    try {
      updatedExpense = await (prisma.expense as any).update({
        where: { id: expId },
        data: buildUpdateData(true),
        include: { paidBy: { select: { id: true, name: true } }, splits: true },
      });
    } catch (innerError: any) {
      if (innerError?.message?.includes("Unknown argument")) {
        updatedExpense = await prisma.expense.update({
          where: { id: expId },
          data: buildUpdateData(false) as any,
          include: { paidBy: { select: { id: true, name: true } }, splits: true },
        });
      } else {
        throw innerError;
      }
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, expenseId } = await params;
    const groupId = parseInt(id);
    const expId = parseInt(expenseId);

    if (!(await assertMember(groupId, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expense = await prisma.expense.findUnique({ where: { id: expId } });
    if (!expense || expense.groupId !== groupId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expenseSplit.deleteMany({ where: { expenseId: expId } });
    await prisma.expense.delete({ where: { id: expId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
