import { Grouphtitems } from 'src/group_ht_items/group_ht_items.entity';
import { User } from 'src/users/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'group_ht' })
@Index('IDX_group_ht_userId', ['userId'])
export class Groupht {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50 })
  description: string;

  @Column('varchar', { length: 200 })
  details: string;

  @Column('tinyint', { default: () => 0 })
  annulled: boolean;

  @Column('int', { nullable: true, default: null })
  userId: number | null;

  @ManyToOne(() => User, (user) => user.groupht, { nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  @OneToMany(() => Grouphtitems, (grouphtitems) => grouphtitems.groupht)
  grouphtitems: Grouphtitems[];
}
