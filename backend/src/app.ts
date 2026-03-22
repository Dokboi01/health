import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler } from "./common/middleware/error-handler";
import { notFoundHandler } from "./common/middleware/not-found";
import { env } from "./config/env";
import { apiRouter } from "./routes";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CareAxis API is running.",
  });
});

app.use(env.API_PREFIX, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };

