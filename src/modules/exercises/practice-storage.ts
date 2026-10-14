import { generatePractice, gradePractice, nextPracticeDifficulty, type PracticeDifficulty, type PracticeFamily } from "./practice";
import { getDatabase, initializeDatabase } from "@/modules/storage/db";
import type { StoredPracticeAttempt } from "@/modules/storage/types";

export async function savePracticeAttempt(
  submission: { family: PracticeFamily; seed: number; difficulty: PracticeDifficulty; response: number },
  client = getDatabase(),
  now = new Date(),
): Promise<StoredPracticeAttempt> {
  const exercise = generatePractice(submission.family, submission.seed, submission.difficulty);
  const correct = gradePractice(exercise, submission.response);
  if (!Number.isFinite(now.getTime())) throw new Error("La fecha del intento no es válida.");
  await initializeDatabase(client, now);
  return client.transaction("rw", client.practiceAttempts, async () => {
    const history = await client.practiceAttempts.where("family").equals(submission.family).toArray();
    if (nextPracticeDifficulty(history, submission.family) !== submission.difficulty) {
      throw new Error("Tu dificultad cambió en otra pestaña. Genera un nuevo ejercicio para continuar.");
    }
    const attempt: StoredPracticeAttempt = {
      id: crypto.randomUUID(), family: submission.family, seed: submission.seed, generatorVersion: 1,
      sequence: Math.max(0, ...history.map(item => item.sequence)) + 1,
      difficulty: submission.difficulty, response: submission.response, correct, createdAt: now.toISOString(),
    };
    await client.practiceAttempts.add(attempt);
    return attempt;
  });
}

export async function getPracticeHistory(client = getDatabase()): Promise<StoredPracticeAttempt[]> {
  return client.practiceAttempts.toArray();
}
