// src/entities/User.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn,
} from "typeorm";
import { UserRole } from "./UserRole";
import { Post } from "./Post";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  username!: string;

  @Column()
  password_hash!: string;

  @Column({ length: 100, nullable: true })
  full_name?: string;

  @Column({ length: 100, unique: true })
  email!: string;

  @Column({ length: 255, nullable: true })
  avatar_url?: string;

  @Column({
    type: "enum",
    enum: ["active", "inactive", "banned"],
    default: "active",
  })
  status!: "active" | "inactive" | "banned";

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => UserRole, (ur: UserRole) => ur.user)
  userRoles!: UserRole[];

  @OneToMany(() => Post, (post: Post) => post.author)
  posts!: Post[];

  @DeleteDateColumn({ nullable: true })
  deleted_at?: Date | null;
}
