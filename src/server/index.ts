import express from "express";
import rateLimit from "express-rate-limit";
import { buildDeps } from "./deps";
import { createPlanHandler } from "./planHandler";
import { fetchRoadElements } from "../services/overpass";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

app.use("/api/plan", rateLimit({ windowMs: 10 * 60 * 1000, limit: 20 }));

const deps = buildDeps();

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.post("/api/plan", createPlanHandler(deps));
// src/server/index.ts
app.post("/api/warm", async (req, res) => {
  res.json({ ok: true }); // answer immediately
  const lat = Number(req.body?.lat),
    lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const start = {
    lat: Math.round(lat * 2000) / 2000,
    lng: Math.round(lng * 2000) / 2000,
  };
  try {
    await fetchRoadElements(start, 800);
  } catch {
    /* warm-up is best-effort */
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`planner listening on :${port}`));
