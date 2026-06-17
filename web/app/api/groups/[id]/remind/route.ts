import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

function getAuthUserId(request: NextRequest, session: any): number | null {
  if (session?.user?.id) return parseInt(session.user.id as string);
  const mobileId = request.headers.get("X-Mobile-User-Id");
  console.log("Mobile auth check - Header value:", mobileId, "Headers:", Array.from(request.headers.entries()));
  if (mobileId) {
    const parsed = parseInt(mobileId);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔔 REMIND ENDPOINT - Incoming request");
    console.log("Headers:", {
      contentType: request.headers.get("Content-Type"),
      mobileUserId: request.headers.get("X-Mobile-User-Id"),
      allHeaders: Array.from(request.headers.entries()),
    });

    const session = await getServerSession(authOptions);
    console.log("Session:", session?.user?.id ? "✅ Has session" : "❌ No session");

    const userId = getAuthUserId(request, session);
    console.log("Extracted userId:", userId);

    if (!userId) {
      console.log("❌ No userId found - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated as:", userId);

    const { id } = await params;
    const groupId = Number(id);
    const { fromUserId, toUserId, amount } = await request.json();

    // Ensure all required fields are present and valid
    if (!fromUserId || !toUserId || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "fromUserId, toUserId and amount are required" },
        { status: 400 }
      );
    }

    const fromUserIdNum = Number(fromUserId);
    const toUserIdNum = Number(toUserId);
    const amountNum = Number(amount);

    // Verify the current user is the "toUser" (the one who is owed)
    if (userId !== toUserIdNum) {
      console.error("Reminder auth check failed:", { userId, toUserId: toUserIdNum, provided: toUserId });
      return NextResponse.json(
        { error: "Only the person owed can send a reminder" },
        { status: 403 }
      );
    }

    // Verify user is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      console.error("User not member of group:", { groupId, userId });
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
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
        where: { id: fromUserIdNum },
        select: { name: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: toUserIdNum },
        select: { name: true },
      }),
    ]);

    if (!fromUser || !toUser) {
      console.error("User not found:", { fromUserIdNum, toUserIdNum });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send reminder email
    await sendReminderEmail({
      to: fromUser.email,
      toName: fromUser.name,
      fromName: toUser.name,
      amount: amountNum,
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
