import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  RelationId,
} from "typeorm";
import { PostCategory } from "./PostCategory";
import { CategoryGroup } from "./CategoryGroup";

@Entity({ name: "categories" })
export class Category {
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

  @ManyToOne(() => Category, (cat: Category) => cat.children, {
    nullable: true,
  })
  @JoinColumn({ name: "parent_id" })
  parent?: Category | null;

  @RelationId((category: Category) => category.parent)
  parent_id?: number | null;

  @OneToMany(() => Category, (cat: Category) => cat.parent)
  children!: Category[];

  @ManyToOne(() => CategoryGroup, (group: CategoryGroup) => group.categories, {
    nullable: true,
  })
  @JoinColumn({ name: "category_group_id" })
  categoryGroup?: CategoryGroup | null;

  @RelationId((category: Category) => category.categoryGroup)
  category_group_id?: number | null;

  @OneToMany(() => PostCategory, (pc: PostCategory) => pc.category)
  postCategories!: PostCategory[];

  @DeleteDateColumn({ nullable: true })
  deleted_at?: Date | null;
}
