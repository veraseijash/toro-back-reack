import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './message.entity';
import { User } from '../users/users.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async create(message: CreateMessageDto): Promise<Message> {
    const savedMessage = await this.messageRepository.save(
      this.messageRepository.create(message),
    );

    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: { recipient: true },
      select: {
        id: true,
        senderUserId: true,
        recipientUserId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
        recipient: {
          id: true,
          name: true,
          user_name: true,
          url_photo: true,
        },
      },
    });
  }

  findUnreadByUserId(userId: number): Promise<Message[]> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndMapOne(
        'message.sender',
        User,
        'sender',
        'sender.id = message.senderUserId',
      )
      .leftJoinAndSelect('message.recipient', 'recipient')
      .select([
        'message.id',
        'message.senderUserId',
        'message.recipientUserId',
        'message.content',
        'message.isRead',
        'message.readAt',
        'message.createdAt',
        'sender.id',
        'sender.name',
        'sender.user_name',
        'sender.url_photo',
        'recipient.id',
        'recipient.name',
        'recipient.user_name',
        'recipient.url_photo',
      ])
      .where('message.isRead = :isRead', { isRead: false })
      .andWhere(
        '(message.recipientUserId = :userId OR message.recipientUserId = 0)',
        { userId },
      )
      .orderBy('message.createdAt', 'ASC')
      .getMany();
  }

  countUnreadByRecipientUserId(recipientUserId: number): Promise<number> {
    return this.messageRepository.count({
      where: [
        { recipientUserId, isRead: false },
        { recipientUserId: 0, isRead: false },
      ],
    });
  }

  async markAsRead(id: number): Promise<Message> {
    const message = await this.messageRepository.findOne({ where: { id } });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      return this.messageRepository.save(message);
    }

    return message;
  }
}
