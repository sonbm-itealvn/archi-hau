import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { Post } from "./Post";
import { Tag } from "./Tag";

@Entity({ name: "post_tags" })
export class PostTag {
  @PrimaryColumn()
  post_id!: number;

  @PrimaryColumn()
  tag_id!: number;

  @ManyToOne(() => Post, (post: Post) => post.postTags)
  @JoinColumn({ name: "post_id" })
  post!: Post;

  @ManyToOne(() => Tag, (tag: Tag) => tag.postTags)
  @JoinColumn({ name: "tag_id" })
  tag!: Tag;
}
