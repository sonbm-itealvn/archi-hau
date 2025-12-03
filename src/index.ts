import "reflect-metadata";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { corsOptions } from "./config/cors";
import { AppDataSource } from "./data-source";
import userRoutes from "./routes/user.routes";
import postRoutes from "./routes/post.routes";
import categoryRoutes from "./routes/category.routes";
import tagRoutes from "./routes/tag.routes";
import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";

const PORT = Number(process.env.PORT || 3000);

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Database connection established");

    const app = express();
    app.use(cors(corsOptions));
    app.use(express.json());

    app.get("/health", (_: Request, res: Response) =>
      res.json({ status: "ok" })
    );

    app.use("/auth", authRoutes);
    app.use("/users", userRoutes);
    app.use("/posts", postRoutes);
    app.use("/categories", categoryRoutes);
    app.use("/tags", tagRoutes);
    app.use("/events", eventRoutes);

    app.use(
      (
        err: Error,
        _req: Request,
        res: Response,
        _next: NextFunction
      ): Response => {
        console.error("Unhandled error", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    );

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize application", error);
    process.exit(1);
  }
};

void startServer();
