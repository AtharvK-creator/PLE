import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EnvConfig } from '../../config/env.validation';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig>) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get('SMTP_HOST', { infer: true });
    const port = this.configService.get('SMTP_PORT', { infer: true });
    const user = this.configService.get('SMTP_USER', { infer: true });
    const pass = this.configService.get('SMTP_PASS', { infer: true });

    if (!host || !user || !pass) {
      this.logger.warn('SMTP settings are incomplete. Emails will not be sent.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: Number(port) === 465, // true for 465, false for other ports (like 587)
      auth: {
        user,
        pass,
      },
    });
  }

  private getMailFrom(): string {
    return this.configService.get('MAIL_FROM', { infer: true }) || 'PLE Support <noreply@example.com>';
  }

  async sendPasswordResetOtp(email: string, name: string, otp: string): Promise<void> {
    const formattedName = name || 'Student';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      padding: 32px;
      border-radius: 8px;
      border: 1px solid #e4e4e7;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #09090b;
      margin-top: 0;
      margin-bottom: 24px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 16px;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #3f3f46;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .otp-container {
      background-color: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 16px 24px;
      margin: 24px 0;
      text-align: center;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 4px;
      color: #2563eb;
      margin: 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e4e4e7;
      font-size: 14px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Password Reset Request</h2>
    <p>Hello ${formattedName},</p>
    <p>Your verification code is:</p>
    <div class="otp-container">
      <h1>${otp}</h1>
    </div>
    <p>This code expires in 10 minutes.</p>
    <p>If you did not request this, ignore this email.</p>
    <div class="footer">
      <p>PLE Support Team</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendMail({
      to: email,
      subject: 'PLE Password Reset Code',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const formattedName = name || 'Student';
    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true }) || 'http://localhost:3005';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      padding: 32px;
      border-radius: 8px;
      border: 1px solid #e4e4e7;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #09090b;
      margin-top: 0;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 16px;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #3f3f46;
    }
    .button-container {
      margin: 24px 0;
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e4e4e7;
      font-size: 14px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Welcome to PLE!</h2>
    <p>Hello ${formattedName},</p>
    <p>We are excited to have you join PLE (Personalized Learning Environment). Your account has been successfully created.</p>
    <div class="button-container">
      <a href="${frontendUrl}/auth/login" class="button">Log In to Your Dashboard</a>
    </div>
    <div class="footer">
      <p>PLE Support Team</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendMail({
      to: email,
      subject: 'Welcome to PLE!',
      html,
    });
  }

  async sendPasswordChangedNotification(
    email: string,
    name: string,
    details?: { time: string; browser: string; ip: string },
  ): Promise<void> {
    const formattedName = name || 'Student';
    const changeTime = details?.time || new Date().toLocaleString();
    const browser = details?.browser || 'Unknown Browser';
    const ip = details?.ip || 'Unknown IP';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      padding: 32px;
      border-radius: 8px;
      border: 1px solid #e4e4e7;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #09090b;
      margin-top: 0;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 16px;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #3f3f46;
    }
    .details {
      background-color: #f4f4f5;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
      font-size: 14px;
    }
    .details-row {
      margin-bottom: 8px;
    }
    .details-label {
      font-weight: 600;
      color: #71717a;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e4e4e7;
      font-size: 14px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your PLE Password Was Changed</h2>
    <p>Hello ${formattedName},</p>
    <p>This is a confirmation that the password for your PLE account has been changed.</p>
    <div class="details">
      <div class="details-row"><span class="details-label">Time of change:</span> ${changeTime}</div>
      <div class="details-row"><span class="details-label">Browser:</span> ${browser}</div>
      <div class="details-row"><span class="details-label">IP Address:</span> ${ip}</div>
    </div>
    <p>If you did not make this change, please contact our support team immediately.</p>
    <div class="footer">
      <p>PLE Support Team</p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendMail({
      to: email,
      subject: 'Your PLE Password Was Changed',
      html,
    });
  }

  private async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Transporter not initialized. E-mail not sent to ${options.to}. Subject: ${options.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.getMailFrom(),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`E-mail sent successfully to ${options.to}. Subject: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send e-mail to ${options.to}:`, error);
    }
  }
}
