import { config } from "dotenv";

// Prisma CLI reads `.env` for DATABASE_URL; load the same file here so
// integration tests point at the same database migrations were applied to.
config();
