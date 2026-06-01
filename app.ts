import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url?.split("?")[0] }, "request");
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
