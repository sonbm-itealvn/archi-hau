import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";

@Entity({ name: "events" })
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: "datetime" })
  start_time!: Date;

  @Column({ type: "datetime" })
  end_time!: Date;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: "longtext" })
  content!: string;

  @Column({ length: 255 })
  location!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at?: Date | null;
}
