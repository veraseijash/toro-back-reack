export class UpdateMessageDto {
  senderUserId?: number;
  recipientUserId?: number;
  content?: string;
  isRead?: boolean;
  readAt?: Date;
}
