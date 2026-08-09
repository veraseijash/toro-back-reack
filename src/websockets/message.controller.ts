import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Message } from './message.entity';
import { MessageService } from './message.service';
import { JwtUserGuard } from '../users/jwt-user.guard';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(JwtUserGuard)
  @Get('unread/count/:recipientUserId')
  async countUnreadByRecipientUserId(
    @Param('recipientUserId', ParseIntPipe) recipientUserId: number,
  ): Promise<{ count: number }> {
    const count = await this.messageService.countUnreadByRecipientUserId(
      recipientUserId,
    );

    return { count };
  }

  @UseGuards(JwtUserGuard)
  @Get('unread/:userId')
  findUnreadByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<Message[]> {
    return this.messageService.findUnreadByUserId(userId);
  }

  @UseGuards(JwtUserGuard)
  @Get('history/:recipientUserId/:senderUserId/:days')
  findByUsersAndDays(
    @Param('recipientUserId', ParseIntPipe) recipientUserId: number,
    @Param('senderUserId', ParseIntPipe) senderUserId: number,
    @Param('days', ParseIntPipe) days: number,
  ): Promise<Message[]> {
    return this.messageService.findByUsersAndDays(
      recipientUserId,
      senderUserId,
      days,
    );
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number): Promise<Message> {
    return this.messageService.markAsRead(id);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id')
  updateMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() message: UpdateMessageDto,
  ): Promise<Message> {
    return this.messageService.updateMessage(id, message);
  }
}
