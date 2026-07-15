import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import sessionRouter from "./routes/session";
import evaluateRoute from "./routes/evaluate";
import questionsRoute from "./routes/questions";
import * as transcribeModule from "./routes/transcribe";
import { prisma } from "./db";

const transcribeRouter = transcribeModule.default;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  // origin: '*'
  origin: process.env.FRONTEND_URL || "https://prepbot-interview-simulator.vercel.app"
}));

app.get("/health", async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
    });
  } catch {
    res.status(500).json({
      status: "error",
    });
  }
});

app.use(bodyParser.json({ limit: "10mb" }));


app.use("/api/evaluate", evaluateRoute);
app.use("/api/questions", questionsRoute);
app.use("/api/transcribe", transcribeRouter); 
app.use("/api/session", sessionRouter);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
