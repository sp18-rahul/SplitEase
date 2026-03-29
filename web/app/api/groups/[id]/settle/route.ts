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

    // Verify caller is a member of this group
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { fromUserId, toUserId, amount } = await request.json();

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify both parties are in the group
    const [fromMember, toMember] = await Promise.all([
      prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: fromUserId } } }),
      prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: toUserId } } }),
    ]);

    if (!fromMember) return NextResponse.json({ error: "Payer not in group" }, { status: 400 });
    if (!toMember) return NextResponse.json({ error: "Recipient not in group" }, { status: 400 });

    const settlement = await prisma.settlement.create({
      data: { groupId, fromUserId, toUserId, amount },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error: any) {
    console.error("Error creating settlement:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
