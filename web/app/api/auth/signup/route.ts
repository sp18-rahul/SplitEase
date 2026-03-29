import { createUser } from "@/lib/users";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(email, password, name);

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Email already exists") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
