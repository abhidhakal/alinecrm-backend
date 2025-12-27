import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEmailProvider,
  SendEmailOptions,
  BatchSendResult,
  WebhookEvent,
} from './email-provider.interface';

/**
 * Brevo (formerly Sendinblue) Email Provider Implementation
 * Uses Brevo's transactional email API for sending
 */
@Injectable()
export class BrevoProvider implements IEmailProvider {
  private readonly logger = new Logger(BrevoProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.brevo.com/v3';
  private readonly dailyLimit = 300; // Brevo free tier limit
  private readonly batchSize = 100;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not configured');
    }
  }

  getName(): string {
    return 'brevo';
  }

  getDailyLimit(): number {
    return this.dailyLimit;
  }

  getBatchSize(): number {
    return this.batchSize;
  }

  async sendBatch(emails: SendEmailOptions[]): Promise<BatchSendResult[]> {
    const results: BatchSendResult[] = [];

    // Send emails sequentially to avoid rate limiting
    // Brevo transactional API doesn't have a true batch endpoint
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push(result);

        // Small delay to respect rate limits
        await this.delay(50);
      } catch (error) {
        results.push({
          success: false,
          email: email.to.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async sendEmail(options: SendEmailOptions): Promise<BatchSendResult> {
    try {
      // Add unsubscribe link to HTML content
      const htmlWithUnsubscribe = this.injectUnsubscribeLink(
        options.htmlContent,
        options.unsubscribeUrl,
      );

      const payload = {
        sender: {
          name: options.from.name,
          email: options.from.email,
        },
        to: [
          {
            email: options.to.email,
            name: options.to.name || options.to.email,
          },
        ],
        subject: options.subject,
        htmlContent: htmlWithUnsubscribe,
        headers: {
          'X-Campaign-Id': String(options.campaignId),
          'List-Unsubscribe': `<${options.unsubscribeUrl}>`,
          ...options.customHeaders,
        },
        tags: options.tags || [`campaign-${options.campaignId}`],
      };

      const response = await fetch(`${this.apiUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.messageId,
        email: options.to.email,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to.email}: ${error}`,
      );
      return {
        success: false,
        email: options.to.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  parseWebhook(
    payload: any,
    headers: Record<string, string>,
  ): WebhookEvent | null {
    try {
      // Brevo webhook format
      // https://developers.brevo.com/docs/how-to-use-webhooks

      const event = payload.event;
      const email = payload.email;
      const messageId = payload['message-id'];
      const timestamp = payload.date
        ? new Date(payload.date)
        : new Date();

      // Map Brevo events to our internal event types
      const eventTypeMap: Record<string, string> = {
        sent: 'sent',
        delivered: 'delivered',
        opened: 'open',
        click: 'click',
        hard_bounce: 'hard_bounce',
        soft_bounce: 'soft_bounce',
        spam: 'spam',
        unsubscribed: 'unsubscribe',
        blocked: 'error',
        deferred: 'soft_bounce',
        error: 'error',
      };

      const mappedEvent = eventTypeMap[event?.toLowerCase()] || event;

      return {
        event: mappedEvent,
        email,
        messageId,
        timestamp,
        metadata: {
          originalEvent: event,
          ip: payload.ip,
          link: payload.link,
          tag: payload.tag,
          ...payload,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse Brevo webhook: ${error}`);
      return null;
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Brevo doesn't use signature verification by default
    // You can set up IP whitelisting or custom header validation
    // For now, we'll accept all webhooks but log a warning

    // TODO: Implement proper verification if Brevo webhook secret is configured
    const webhookSecret = this.configService.get<string>('BREVO_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.warn('BREVO_WEBHOOK_SECRET not configured, skipping verification');
      return true;
    }

    // Brevo allows setting a custom header secret in webhook config
    // The webhook would include this in a header like "X-Webhook-Secret"
    return signature === webhookSecret;
  }

  private injectUnsubscribeLink(html: string, unsubscribeUrl: string): string {
    // Check if unsubscribe section already exists
    if (html.includes('{{unsubscribe_url}}')) {
      return html.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
    }

    // Append unsubscribe footer if not present
    const unsubscribeFooter = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
        <p>You received this email because you are subscribed to our mailing list.</p>
        <p>
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
            Unsubscribe from this list
          </a>
        </p>
      </div>
    `;

    // Try to inject before closing body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${unsubscribeFooter}</body>`);
    }

    // Otherwise append at the end
    return html + unsubscribeFooter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
