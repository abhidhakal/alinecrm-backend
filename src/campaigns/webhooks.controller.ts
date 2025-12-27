import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CampaignsService } from './campaigns.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly campaignsService: CampaignsService) { }

  /**
   * Handle Brevo webhook events
   * Endpoint: POST /webhooks/brevo
   */
  @Post('brevo')
  @HttpCode(HttpStatus.OK)
  async handleBrevoWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.campaignsService.handleWebhook(payload, headers);
  }
}

@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private readonly campaignsService: CampaignsService) { }

  /**
   * Handle unsubscribe link clicks
   * Endpoint: GET /unsubscribe/:token
   */
  @Get(':token')
  async handleUnsubscribe(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const ipAddress =
      (request.headers['x-forwarded-for'] as string) ||
      request.socket.remoteAddress ||
      '';
    const userAgent = request.headers['user-agent'] || '';

    const result = await this.campaignsService.handleUnsubscribeToken(
      token,
      ipAddress,
      userAgent,
    );

    if (result.success) {
      // Return a simple HTML page confirming unsubscription
      response.type('html').send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribed</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 16px;
              padding: 48px;
              max-width: 480px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            }
            .icon {
              width: 80px;
              height: 80px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
            }
            .icon svg {
              width: 40px;
              height: 40px;
              color: white;
            }
            h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 12px;
            }
            p {
              color: #6b7280;
              font-size: 16px;
              line-height: 1.6;
            }
            .email {
              color: #374151;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1>Unsubscribed Successfully</h1>
            <p>
              You have been unsubscribed from our mailing list.
              <br><br>
              <span class="email">${result.email || ''}</span>
              <br><br>
              You will no longer receive marketing emails from us.
            </p>
          </div>
        </body>
        </html>
      `);
    } else {
      response.status(HttpStatus.BAD_REQUEST).type('html').send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f3f4f6;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 16px;
              padding: 48px;
              max-width: 480px;
              text-align: center;
              box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
            }
            h1 { color: #ef4444; margin-bottom: 12px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Invalid Link</h1>
            <p>This unsubscribe link is invalid or has expired.</p>
          </div>
        </body>
        </html>
      `);
    }
  }
}
