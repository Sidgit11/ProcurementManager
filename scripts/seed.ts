import "dotenv/config";
import { seedPolico } from "../src/lib/seed/polico";

seedPolico()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
