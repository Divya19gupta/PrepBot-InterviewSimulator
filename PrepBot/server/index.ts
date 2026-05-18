// index.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import sessionRouter from "./routes/session";
import evaluateRoute from "./routes/evaluate";
import questionsRoute from "./routes/questions";
import * as transcribeModule from "./routes/transcribe";

const transcribeRouter = transcribeModule.default;// ✅ default import

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || "https://prepbot-interview-simulator.vercel.app"
}));
// app.use(cors({
//   origin: '*'
// })); 
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ DEBUG LOG to verify type
console.log("✅ transcribeRouter is:", typeof transcribeRouter);

app.use("/api/evaluate", evaluateRoute);
app.use("/api/questions", questionsRoute);
app.use("/api/transcribe", transcribeRouter); // ✅ must be object, not function
app.use("/api/session", sessionRouter);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
