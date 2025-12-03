import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column } from "typeorm";
import { Post } from "./Post";
import { Category } from "./Category";

@Entity({ name: "post_categories" })
export class PostCategory {
  @PrimaryColumn()
  post_id!: number;

  @PrimaryColumn()
  category_id!: number;

  @Column({ default: false })
  is_primary!: boolean;

  @ManyToOne(() => Post, (post: Post) => post.postCategories)
  @JoinColumn({ name: "post_id" })
  post!: Post;

  @ManyToOne(() => Category, (cat: Category) => cat.postCategories)
  @JoinColumn({ name: "category_id" })
  category!: Category;
}

