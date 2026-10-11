import { PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as unknown as { academyDatabase?: PrismaClient };

export const db = globalDatabase.academyDatabase ?? new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./dev.db" } },
});

if (process.env.NODE_ENV !== "production") globalDatabase.academyDatabase = db;

// Replace this resolver with an authenticated identity before exposing the app
// to a network. The local edition deliberately has a single persistent user.
export function resolveLocalUser(client: PrismaClient = db) {
  return client.user.upsert({
    where: { id: "local-student" },
    create: { id: "local-student", name: "Estudiante", weeklyGoal: 3 },
    update: {},
  });
}
