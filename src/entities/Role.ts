// src/entities/Role.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { UserRole } from "./UserRole";

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  name!: string; // manager, editor...

  @Column({ length: 100 })
  display_name!: string;

  @Column({ nullable: true, length: 255 })
  description?: string;

  @OneToMany(() => UserRole, (ur: UserRole) => ur.role)
  userRoles!: UserRole[];
}
