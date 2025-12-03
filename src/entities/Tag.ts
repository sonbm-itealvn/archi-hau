import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { PostTag } from "./PostTag";

@Entity({ name: "tags" })
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, unique: true })
  slug!: string;

  @OneToMany(() => PostTag, (pt: PostTag) => pt.tag)
  postTags!: PostTag[];
}
