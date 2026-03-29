import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/lib/users";
import { sendWelcomeInviteEmail, sendGroupAddedEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

/** Generate a readable random password */
function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

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
    const body = await request.json();

    // Accept either { email, name? } (new invite flow) or { userId } (legacy)
    const { email, name: providedName, userId: legacyUserId } = body;

    if (!email && !legacyUserId) {
      return NextResponse.json(
        { error: "Email or userId is required" },
        { status: 400 }
      );
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Get the inviter's name
    const inviter = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { name: true },
    });
    const inviterName = inviter?.name || "Someone";

    let user: { id: number; name: string; email: string } | null = null;
    let isNewUser = false;
    let plainPassword = "";

    if (legacyUserId && !email) {
      // Legacy flow: userId provided directly
      user = await prisma.user.findUnique({
        where: { id: legacyUserId },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else {
      // New invite flow: look up by email
      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, name: true, email: true },
      });

      if (existing) {
        // User already has an account
        user = existing;
        isNewUser = false;
      } else {
        // Create a new account for this person
        const name = providedName?.trim() || email.split("@")[0];
        plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const created = await prisma.user.create({
          data: {
            email: email.trim().toLowerCase(),
            name,
            password: hashedPassword,
          },
          select: { id: true, name: true, email: true },
        });
        user = created;
        isNewUser = true;
      }
    }

    // Check if user is already in group
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User already in group" },
        { status: 400 }
      );
    }

    // Add member to group
    const member = await prisma.groupMember.create({
      data: { groupId, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Send email notification (non-blocking — don't fail the request if email fails)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        if (isNewUser) {
          await sendWelcomeInviteEmail({
            to: user.email,
            name: user.name,
            password: plainPassword,
            groupName: group.name,
            inviterName,
          });
        } else {
          await sendGroupAddedEmail({
            to: user.email,
            name: user.name,
            groupName: group.name,
            inviterName,
          });
        }
      } catch (emailErr) {
        console.error("Email sending failed (non-fatal):", emailErr);
      }
    }

    return NextResponse.json(
      {
        ...member,
        emailSent: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
        isNewUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
