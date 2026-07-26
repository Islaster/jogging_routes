import express from "express";
import { buildDeps } from "./deps";
import { createPlanHandler } from "./planHandler";
import rateLimit from "express-rate-limit";

const app = express();
app.set("trust proxy", 1);
app.use("/api/plan", rateLimit({ windowMs: 10 * 60 * 1000, limit: 20 }));
app.use(express.json());

const deps = buildDeps();

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.post("/api/plan", createPlanHandler(deps));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`planner listening on :${port}`));
