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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, upiId } = body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (upiId !== undefined) {
      updateData.upiId = upiId ? upiId.trim() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    let updatedUser: any;
    try {
      updatedUser = await (prisma.user as any).update({
        where: { id: userId },
        data: updateData,
        select: { id: true, name: true, email: true, upiId: true },
      });
    } catch (innerError: any) {
      if (innerError?.message?.includes("Unknown argument") || innerError?.message?.includes("upiId")) {
        // upiId column not yet migrated, update without it
        const { upiId: _removed, ...safeData } = updateData;
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: safeData,
          select: { id: true, name: true, email: true },
        });
      } else {
        throw innerError;
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getAuthUserId(request, session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user: any;
    try {
      user = await (prisma.user as any).findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true, upiId: true },
      });
    } catch {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
