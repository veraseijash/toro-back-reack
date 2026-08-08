import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './message.entity';
import { MessageService } from './message.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  handleConnection(client: Socket) {
    const userId = Number(client.handshake.auth?.userId);

    if (Number.isInteger(userId) && userId > 0) {
      client.join(this.getUserRoom(userId));
    }

    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() payload: CreateMessageDto,
  ): Promise<Message> {
    const senderUserId = Number(payload?.senderUserId);
    const recipientUserId = Number(payload?.recipientUserId);
    const content = payload?.content?.trim();

    if (
      !Number.isInteger(senderUserId) ||
      senderUserId <= 0 ||
      !Number.isInteger(recipientUserId) ||
      recipientUserId < 0 ||
      !content
    ) {
      throw new WsException(
        'El mensaje requiere senderUserId, recipientUserId y content válidos',
      );
    }

    const savedMessage = await this.messageService.create({
      senderUserId,
      recipientUserId,
      content,
    });

    if (recipientUserId === 0) {
      this.server.emit('newMessage', savedMessage);
    } else {
      this.server
        .to(this.getUserRoom(recipientUserId))
        .emit('newMessage', savedMessage);
    }

    return savedMessage;
  }

  private getUserRoom(userId: number): string {
    return `user:${userId}`;
  }
}
