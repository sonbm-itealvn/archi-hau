import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Role } from "./entities/Role";
import { UserRole } from "./entities/UserRole";
import { Category } from "./entities/Category";
import { Post } from "./entities/Post";
import { PostCategory } from "./entities/PostCategory";
import { Tag } from "./entities/Tag";
import { PostTag } from "./entities/PostTag";
import { Event } from "./entities/Event";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? "archihau1_archi_hau",
  password: process.env.DB_PASS ?? "Z0C41wIx8imOKhTGcJl9Ulsk",
  database: process.env.DB_NAME ?? "archihau1_archi_hau",
  synchronize: true, // auto sync schema while developing; disable in production
  logging: false,
  entities: [User, Role, UserRole, Category, Post, PostCategory, Tag, PostTag, Event],
  migrations: [],
  subscribers: [],
});
