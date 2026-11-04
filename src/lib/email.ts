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

    console.info(
      `[email] ${message.subject} -> ${message.to} (written to .dev-emails/outbox.log)`,
    );
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
