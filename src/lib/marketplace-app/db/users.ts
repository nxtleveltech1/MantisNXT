import { users } from "@/db/marketplace";
import { db } from "@/lib/marketplace-app/db";
import { eq } from "drizzle-orm";

export async function getUserByClerkId(clerkId: string) {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function createUser(userData: {
  clerkId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  role?: "SELLER" | "BUYER" | "ADMIN";
}) {
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: userData.clerkId,
      email: userData.email,
      displayName: userData.displayName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      imageUrl: userData.imageUrl,
      role: userData.role || "BUYER",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return newUser;
}

export async function updateUser(clerkId: string, updates: {
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}) {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkId))
    .returning();
  return updatedUser;
}

