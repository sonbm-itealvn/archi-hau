import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { Category } from "./Category";

@Entity({ name: "categories_groups" })
export class CategoryGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 150, unique: true })
  slug!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ default: 0 })
  display_order!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn({ nullable: true })
  deleted_at?: Date | null;

  @OneToMany(() => Category, (category: Category) => category.categoryGroup)
  categories!: Category[];
}

