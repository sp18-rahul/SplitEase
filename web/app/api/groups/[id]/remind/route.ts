import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const groupId = parseInt(id);
    const { fromUserId, toUserId, amount } = await request.json();

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json(
        { error: "fromUserId, toUserId and amount are required" },
        { status: 400 }
      );
    }

    // Verify the current user is the "toUser" (the one who is owed)
    if (parseInt(session.user.id) !== toUserId) {
      return NextResponse.json(
        { error: "Only the person owed can send a reminder" },
        { status: 403 }
      );
    }

    // Fetch group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true, currency: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Fetch both users
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: fromUserId },
        select: { name: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: toUserId },
        select: { name: true },
      }),
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send reminder email
    await sendReminderEmail({
      to: fromUser.email,
      toName: fromUser.name,
      fromName: toUser.name,
      amount,
      currency: group.currency || "INR",
      groupName: group.name,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reminder email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminder" },
      { status: 500 }
    );
  }
}
