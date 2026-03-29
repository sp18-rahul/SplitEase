import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Create demo user for testing
const initializeDemoUser = async () => {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: "demo@example.com" },
    });
    if (!existing) {
      const demoPassword = await bcrypt.hash("password123", 10);
      await prisma.user.create({
        data: {
          email: "demo@example.com",
          password: demoPassword,
          name: "Demo User",
        },
      });
    }
  } catch (error) {
    console.error("Failed to initialize demo user:", error);
  }
};

// Initialize on module load
initializeDemoUser().catch(console.error);

export async function createUser(email: string, password: string, name: string) {
  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Email already exists");
    }
    throw error;
  }
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({ where: { email } });
}

export async function verifyPassword(email: string, password: string) {
  try {
    const user = await findUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
    };
  } catch (error) {
    console.error("Error verifying password:", error);
    return null;
  }
}
