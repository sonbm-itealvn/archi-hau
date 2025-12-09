import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  RelationId,
} from "typeorm";
import { User } from "./User";

@Entity({ name: "uploads" })
export class Upload {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  public_id!: string;

  @Column({ type: "varchar", length: 1024 })
  url!: string;

  @Column({ type: "varchar", length: 50 })
  resource_type!: string;

  @Column({ type: "int", nullable: true })
  bytes?: number | null;

  @Column({ type: "int", nullable: true })
  width?: number | null;

  @Column({ type: "int", nullable: true })
  height?: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  format?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  folder?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  original_filename?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "uploaded_by_user_id" })
  uploaded_by?: User | null;

  @RelationId((upload: Upload) => upload.uploaded_by)
  uploaded_by_user_id?: number | null;

  @CreateDateColumn()
  created_at!: Date;
}

