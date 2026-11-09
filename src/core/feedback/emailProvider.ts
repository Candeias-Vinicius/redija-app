import { Resend } from 'resend';
import type { EmailProvider, SendEmailRequest, SendEmailResult } from './types';

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async send(email: SendEmailRequest): Promise<SendEmailResult> {
    const { data, error } = await this.resend.emails.send({
      from: email.from,
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    if (error) {
      return { error: error.message || 'Falha ao despachar e-mail via Resend.' };
    }

    return { id: data?.id };
  }
}
