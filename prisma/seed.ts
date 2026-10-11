import { db } from "../src/lib/db";
import { seedDatabase } from "./seed-data";

seedDatabase(db)
  .then(() => console.info("Catálogo inicial preparado. El progreso existente se conserva."))
  .catch(() => {
    console.error("No se pudo preparar el catálogo. Comprueba DATABASE_URL y las migraciones.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
