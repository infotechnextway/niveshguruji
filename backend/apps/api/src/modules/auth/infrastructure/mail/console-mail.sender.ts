import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailSender } from './mail.port';

@Injectable()
export class ConsoleMailSender implements MailSender {
  private readonly logger = new Logger('MAIL');

  async send(message: MailMessage): Promise<void> {
    this.logger.warn(`[DEV ONLY] To: ${message.to} | ${message.subject}\n${message.text}`);
  }
}
