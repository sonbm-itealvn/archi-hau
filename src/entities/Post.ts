// src/entities/Post.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  RelationId,
} from "typeorm";
import { User } from "./User";
import { PostCategory } from "./PostCategory";
import { PostTag } from "./PostTag";

@Entity({ name: "posts" })
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 255, unique: true })
  slug!: string;

  @Column({ type: "text", nullable: true })
  excerpt?: string;

  @Column({ type: "longtext" })
  content!: string;

  @Column({ length: 255, nullable: true })
  thumbnail_url?: string;

  @Column({
    type: "enum",
    enum: ["draft", "pending", "published", "rejected"],
    default: "draft",
  })
  status!: "draft" | "pending" | "published" | "rejected";

  @Column({ default: 0 })
  view_count!: number;

  @ManyToOne(() => User, (user: User) => user.posts)
  @JoinColumn({ name: "author_id" })
  author!: User;

  @RelationId((post: Post) => post.author)
  author_id!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: "datetime", nullable: true })
  published_at?: Date | null;

  @OneToMany(() => PostCategory, (pc: PostCategory) => pc.post)
  postCategories!: PostCategory[];

  @OneToMany(() => PostTag, (pt: PostTag) => pt.post)
  postTags!: PostTag[];
}
