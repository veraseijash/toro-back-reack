import { User } from '../users/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  senderUserId: number;

  // Se completa mediante un JOIN manual; no es una relación TypeORM.
  sender?: Pick<User, 'id' | 'name' | 'user_name' | 'url_photo'>;

  @Column('int')
  recipientUserId: number;

  @ManyToOne(() => User, (user) => user.receivedMessages, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'recipientUserId' })
  recipient: User | null;

  @Column('text')
  content: string;

  @Column('boolean', { default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
