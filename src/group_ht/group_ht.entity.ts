import { Grouphtitems } from 'src/group_ht_items/group_ht_items.entity';
import { User } from 'src/users/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'group_ht' })
export class Groupht {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50 })
  description: string;

  @Column('varchar', { length: 200 })
  details: string;

  @Column('tinyint', { default: () => 0 })
  annulled: boolean;

  @Column('int', { default: () => 0 })
  userId: number;

  @OneToOne(() => User, (user) => user.groupht)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  @OneToMany(() => Grouphtitems, (grouphtitems) => grouphtitems.groupht)
  grouphtitems: Grouphtitems[];
}
