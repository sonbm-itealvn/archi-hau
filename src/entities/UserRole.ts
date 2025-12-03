// src/entities/UserRole.ts
import { Entity, ManyToOne, PrimaryColumn, JoinColumn } from "typeorm";
import { User } from "./User";
import { Role } from "./Role";

@Entity({ name: "user_roles" })
export class UserRole {
  @PrimaryColumn()
  user_id!: number;

  @PrimaryColumn()
  role_id!: number;

  @ManyToOne(() => User, (user: User) => user.userRoles)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Role, (role: Role) => role.userRoles)
  @JoinColumn({ name: "role_id" })
  role!: Role;
}
