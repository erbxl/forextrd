import type { PrismaClient } from "@prisma/client";
import { curriculum, firstLesson } from "../src/modules/academy/content";

export async function seedDatabase(client: PrismaClient) {
  await client.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: { id: "local-student" },
      create: { id: "local-student", name: "Estudiante", weeklyGoal: 3 },
      update: {},
    });
    for (const module of curriculum) {
      const data = { title: module.title, description: module.description, status: module.status };
      await transaction.academyModule.upsert({
        where: { id: module.id }, create: { id: module.id, ...data }, update: data,
      });
    }
    const lesson = {
      title: firstLesson.title,
      moduleId: firstLesson.moduleId,
      durationMinutes: firstLesson.durationMinutes,
      published: true,
    };
    await transaction.lesson.upsert({
      where: { slug: firstLesson.slug }, create: { slug: firstLesson.slug, ...lesson }, update: lesson,
    });
    for (const question of firstLesson.questions) {
      const data = {
        lessonSlug: firstLesson.slug, type: question.type,
        concept: question.concept, definition: JSON.stringify(question),
      };
      await transaction.question.upsert({
        where: { id: `${firstLesson.slug}:${question.id}` },
        create: { id: `${firstLesson.slug}:${question.id}`, ...data }, update: data,
      });
    }
  });
}
