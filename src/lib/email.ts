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
    // Development fallback. Never print secrets; invitation links are
    // single-use and short-lived, but still only log them outside production.
    log('Email queued (no provider configured): %o', {
      to: message.to,
      subject: message.subject,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[email] ${message.subject} -> ${message.to}\n${message.text}`);
    }
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
