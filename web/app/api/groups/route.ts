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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const creatorId = getAuthUserId(request, session);
    if (!creatorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, memberIds, currency, emoji } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const rawIds: number[] = (memberIds || []).map((id: number) => Number(id));
    const uniqueMemberIds: number[] = [...new Set(rawIds)].filter(
      (id: number) => id !== creatorId
    );

    const memberCreate = [
      { userId: creatorId },
      ...uniqueMemberIds.map((id: number) => ({ userId: id })),
    ];

    const includeOpts = {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    };

    let group;
    try {
      group = await (prisma.group as any).create({
        data: { name, currency: currency || "INR", emoji: emoji || "💰", members: { create: memberCreate } },
        include: includeOpts,
      });
    } catch {
      // newer columns may not exist yet — fall back
      group = await prisma.group.create({
        data: { name, members: { create: memberCreate } },
        include: includeOpts,
      });
    }

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
