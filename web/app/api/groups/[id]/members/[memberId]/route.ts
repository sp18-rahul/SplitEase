import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const groupId = parseInt(id);
    const memId = parseInt(memberId);

    // Check if member exists and belongs to this group
    const member = await prisma.groupMember.findUnique({
      where: { id: memId },
    });

    if (!member || member.groupId !== groupId) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Check if member has outstanding balances (either owed or owes)
    // Get all expenses involving this member
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { splits: true },
    });

    let memberBalance = 0;
    for (const expense of expenses) {
      if (expense.paidById === member.userId) {
        memberBalance += expense.amount;
      }
      const split = expense.splits.find(s => s.userId === member.userId);
      if (split) {
        memberBalance -= split.amount;
      }
    }

    if (memberBalance !== 0) {
      return NextResponse.json(
        { error: "Cannot remove member with outstanding balance. Settle up first!" },
        { status: 400 }
      );
    }

    // Delete member
    await prisma.groupMember.delete({
      where: { id: memId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
