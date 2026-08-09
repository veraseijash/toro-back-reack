import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
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

  findByUsersAndDays(
    recipientUserId: number,
    senderUserId: number,
    days: number,
  ): Promise<Message[]> {
    if (!Number.isFinite(days) || days < 0) {
      throw new BadRequestException(
        'El número de días debe ser un valor mayor o igual a cero',
      );
    }

    const createdFrom = new Date();
    createdFrom.setTime(createdFrom.getTime() - days * 24 * 60 * 60 * 1000);

    return this.messageRepository.find({
      where: [
        {
          recipientUserId,
          senderUserId,
          createdAt: MoreThanOrEqual(createdFrom),
        },
        {
          recipientUserId: senderUserId,
          senderUserId: recipientUserId,
          createdAt: MoreThanOrEqual(createdFrom),
        },
      ],
      order: { createdAt: 'DESC' },
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

  async updateMessage(id: number, message: UpdateMessageDto): Promise<Message> {
    const messageFound = await this.messageRepository.findOne({
      where: { id },
    });

    if (!messageFound) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    return this.messageRepository.save(Object.assign(messageFound, message));
  }
}
