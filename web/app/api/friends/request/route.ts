import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAuthUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return prisma.user.findUnique({ where: { email: session.user.email } });
  }
  const mobileId = req.headers.get("X-Mobile-User-Id");
  if (mobileId) {
    return prisma.user.findUnique({ where: { id: parseInt(mobileId) } });
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toUserId } = await req.json();

    if (!toUserId || toUserId === currentUser.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Check if request already exists
    const existingRequest = await prisma.friendRequest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: currentUser.id,
          toUserId: toUserId,
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Friend request already exists" },
        { status: 400 }
      );
    }

    // Create friend request
    const friendRequest = await prisma.friendRequest.create({
      data: {
        fromUserId: currentUser.id,
        toUserId: toUserId,
        status: "pending",
      },
    });

    return NextResponse.json(friendRequest);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthUser(req);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingRequests = await prisma.friendRequest.findMany({
      where: {
        toUserId: currentUser.id,
        status: "pending",
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ requests: pendingRequests });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
