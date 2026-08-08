import {
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

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number): Promise<Message> {
    return this.messageService.markAsRead(id);
  }
}
