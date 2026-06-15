import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWelcomeInviteEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, name, password, groupName, inviterName } = await req.json();

    if (!to || !name || !password || !groupName || !inviterName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sendWelcomeInviteEmail({
      to,
      name,
      password,
      groupName,
      inviterName,
    });

    return NextResponse.json({ success: true, message: "Email sent" });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
