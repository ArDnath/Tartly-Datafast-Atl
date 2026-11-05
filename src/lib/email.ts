import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import debug from 'debug';
import { BRAND } from '@/lib/brand';

const log = debug('revenuelens:email');

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

class LogTransport implements EmailTransport {
  async send(message: EmailMessage) {
    // Development fallback. The email body contains single-use tokens, so it
    // is written to a local outbox file instead of the application log.
    log('Email queued (no provider configured): %o', {
      to: message.to,
      subject: message.subject,
    });

    if (process.env.NODE_ENV === 'production' && process.env.EMAIL_OUTBOX !== 'true') {
      return;
    }

    const directory = path.join(process.cwd(), '.dev-emails');
    const file = path.join(directory, 'outbox.log');

    await mkdir(directory, { recursive: true });
    await appendFile(
      file,
      `${JSON.stringify({ at: new Date().toISOString(), ...message })}\n`,
      'utf8',
    );

    console.info(`[email] ${message.subject} -> ${message.to} (written to .dev-emails/outbox.log)`);
  }
}

class ResendTransport implements EmailTransport {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || BRAND.noReplyEmail,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected the message (${response.status})`);
    }
  }
}

function getTransport(): EmailTransport {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  return apiKey ? new ResendTransport(apiKey) : new LogTransport();
}

export async function sendEmail(message: EmailMessage) {
  await getTransport().send(message);
}

export async function sendWorkspaceInvitationEmail({
  to,
  workspaceName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  await sendEmail({
    to,
    subject: `${inviterName} invited you to ${workspaceName} on ${BRAND.name}`,
    text: [
      `${inviterName} invited you to join the ${workspaceName} workspace as ${role.toLowerCase()}.`,
      '',
      `Accept the invitation: ${inviteUrl}`,
      '',
      `This link expires ${expiresAt.toUTCString()}.`,
      `If you were not expecting this invitation, you can ignore this email.`,
    ].join('\n'),
  });
}

export async function sendEmailVerificationEmail({
  to,
  verifyUrl,
  expiresAt,
}: {
  to: string;
  verifyUrl: string;
  expiresAt: Date;
}) {
  await sendEmail({
    to,
    subject: `Verify your email for ${BRAND.name}`,
    text: [
      `Confirm your email address to finish setting up ${BRAND.name}.`,
      '',
      `Verify email: ${verifyUrl}`,
      '',
      `This link expires ${expiresAt.toUTCString()}.`,
      `If you did not create an account, you can ignore this email.`,
    ].join('\n'),
  });
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresAt,
}: {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  await sendEmail({
    to,
    subject: `Reset your ${BRAND.name} password`,
    text: [
      `Someone requested a password reset for your ${BRAND.name} account.`,
      '',
      `Reset password: ${resetUrl}`,
      '',
      `This link expires ${expiresAt.toUTCString()} and can be used once.`,
      `If you did not request this, no action is needed; your password is unchanged.`,
    ].join('\n'),
  });
}

export interface UsageNoticeEmail {
  to: string;
  workspaceName: string;
  planName: string;
  used: number;
  limit: number;
  percentage: number;
  resetAt: Date;
  billingUrl: string;
  level: 'warning' | 'limit';
}

export async function sendUsageNoticeEmail({
  to,
  workspaceName,
  planName,
  used,
  limit,
  percentage,
  resetAt,
  billingUrl,
  level,
}: UsageNoticeEmail) {
  const isLimit = level === 'limit';
  const subject = isLimit
    ? `${BRAND.name}: event limit reached for ${workspaceName}`
    : `${BRAND.name}: ${percentage}% of your event allowance used`;

  await sendEmail({
    to,
    subject,
    text: [
      isLimit
        ? `${workspaceName} has used its full ${planName} event allowance for this period.`
        : `${workspaceName} has used ${percentage}% of its ${planName} event allowance.`,
      '',
      `Events this period: ${used.toLocaleString('en-US')} of ${limit.toLocaleString('en-US')}.`,
      `Allowance resets: ${resetAt.toUTCString()}.`,
      '',
      isLimit
        ? 'Ingestion pauses after the small grace window. Analytics stays readable, and no data is deleted. Upgrade the plan or wait for the reset to resume collection.'
        : 'Ingestion continues. If traffic keeps growing, review the plan before the limit is reached.',
      '',
      `Plan and usage: ${billingUrl}`,
      '',
      `If this volume is unexpected, check the website domain and your install snippet.`,
    ].join('\n'),
  });
}

export async function sendPaymentFailedEmail({
  to,
  workspaceName,
  planName,
  billingUrl,
}: {
  to: string;
  workspaceName: string;
  planName: string;
  billingUrl: string;
}) {
  await sendEmail({
    to,
    subject: `${BRAND.name}: payment failed for ${workspaceName}`,
    text: [
      `The latest payment for the ${workspaceName} workspace (${planName}) did not succeed.`,
      '',
      `Update the payment method: ${billingUrl}`,
      '',
      'Access continues while the billing provider retries. If payment keeps failing, the subscription may become past due or expire.',
      'This message comes from the platform billing provider. Customer revenue integrations are separate and are not affected.',
    ].join('\n'),
  });
}
