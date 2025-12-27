// Email Provider Interface
// This abstraction allows easy switching between providers (Brevo, SES, Resend)

export interface EmailRecipient {
  email: string;
  name?: string;
  contactId?: number;
  leadId?: number;
}

export interface SendEmailOptions {
  to: EmailRecipient;
  from: {
    email: string;
    name: string;
  };
  subject: string;
  htmlContent: string;
  previewText?: string;
  campaignId: number;
  unsubscribeUrl: string;
  customHeaders?: Record<string, string>;
  tags?: string[];
}

export interface BatchSendResult {
  success: boolean;
  messageId?: string;
  email: string;
  error?: string;
}

export interface WebhookEvent {
  event: string;
  email: string;
  messageId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IEmailProvider {
  // Get provider name for identification
  getName(): string;

  // Send a batch of emails
  sendBatch(emails: SendEmailOptions[]): Promise<BatchSendResult[]>;

  // Send a single email
  sendEmail(email: SendEmailOptions): Promise<BatchSendResult>;

  // Parse webhook payload from provider
  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null;

  // Verify webhook signature (security)
  verifyWebhookSignature(payload: any, signature: string): boolean;

  // Get daily send limit
  getDailyLimit(): number;

  // Get recommended batch size
  getBatchSize(): number;
}
