import { BRAND } from '@/lib/brand';

export type LegalSlug =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'dpa'
  | 'subprocessors'
  | 'acceptable-use';

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}

export const LEGAL_DRAFT_NOTICE =
  'Draft for lawyer review. This document describes the behaviour implemented in this repository, but it is not legal advice and must be reviewed by qualified counsel before launch.';

const CONTACT = `Questions: ${BRAND.supportEmail}.`;

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'privacy',
    title: 'Privacy policy',
    summary: 'What the product collects, why it collects it, and how long it keeps it.',
    updated: '2026-11-06',
    sections: [
      {
        heading: 'Who we are',
        body: [
          `${BRAND.legalEntity} operates ${BRAND.name}, a revenue analytics service for website owners.`,
          CONTACT,
        ],
      },
      {
        heading: 'Account data',
        body: [
          'We store the email address you sign up with, a password hash (bcrypt), workspace and membership records, website settings, billing subscription state, invoices issued by the billing provider, audit records, and hashed session, invitation, verification, and reset tokens.',
          'We never store plaintext passwords, plaintext session tokens, or plaintext provider credentials. Provider credentials connected by a customer for analytics are encrypted at rest.',
        ],
      },
      {
        heading: 'Analytics data',
        body: [
          'The tracker records pageviews, session identifiers, referrers, UTM parameters, device and browser categories, approximate country, performance metrics, and payment events that the customer chooses to connect.',
          'Events and session replay payloads are scoped to one website. Session replay masks input values by default and can require explicit consent from the host page.',
          'IP addresses are used to derive a rotating visitor identifier and for abuse protection. The raw IP is not used to build advertising profiles.',
        ],
      },
      {
        heading: 'Why we process it',
        body: [
          'To provide the analytics and revenue attribution the customer requested, to authenticate users, to enforce plan limits, to prevent abuse, to issue invoices, and to send transactional email such as verification, reset, invitation, and usage notices.',
          'We do not sell analytics data, use it for advertising, or train AI models on customer event data.',
        ],
      },
      {
        heading: 'Retention',
        body: [
          'Analytics retention follows the paid plan: 90 days on Starter and 180 days on Pro. Session replay has its own shorter retention window and is removed when a plan does not include replay.',
          'Account, billing, invoice, usage, and audit records are kept while the account is active and for as long as needed to meet legal and accounting obligations. Deleting an account soft-deletes owned workspaces and revokes sessions; a tenant-scoped retention job removes analytics payloads.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can export account data from Settings → Security, correct profile data from Settings → Account, and delete your account from Settings → Security.',
          'A website owner can ask us to delete a workspace or an individual website. Analytics payload deletion is performed by the retention job so it is auditable and cannot be triggered accidentally by a request handler.',
        ],
      },
      {
        heading: 'Subprocessors and transfers',
        body: [
          'The current subprocessor categories are listed at /legal/subprocessors. The production list must be confirmed before launch.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of service',
    summary: `The commercial terms for a paid ${BRAND.name} subscription.`,
    updated: '2026-11-06',
    sections: [
      {
        heading: 'Plans and billing',
        body: [
          `${BRAND.name} has exactly two paid plans: Starter and Pro. There is no free tier. Prices and limits are shown on the pricing page and are read from the same config the product enforces.`,
          'A new workspace may collect a small, one-time-per-period setup allowance (currently 1,000 events) to verify the tracker before subscribing. After that allowance, billable ingestion pauses until a paid subscription is active. The setup allowance is not a free plan and does not include paid features.',
          'Subscriptions renew automatically until cancelled. Cancelling schedules the subscription to end at the current paid period; access continues until that date. Taxes and payment-provider fees are handled by the billing provider.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'You must have the right to measure the websites you add and the payments you connect. The acceptable-use policy at /legal/acceptable-use is part of these terms.',
        ],
      },
      {
        heading: 'Availability and support',
        body: [
          'We aim to keep the service available but do not promise a specific uptime percentage in this draft. Support is provided by email. A formal service-level commitment, if any, must be added before launch.',
        ],
      },
      {
        heading: 'Data and ownership',
        body: [
          'You keep ownership of your analytics data and connected revenue data. You grant us the limited right to process it to provide the service.',
          'We may suspend an account that abuses the service, violates the acceptable-use policy, or fails to pay. Suspension is logged and does not silently delete data.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'This draft does not set a final liability cap, governing law, or dispute process. Those clauses must be written by counsel for the operating entity before launch.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie and consent policy',
    summary: 'How the product uses cookies and how session replay consent works.',
    updated: '2026-11-06',
    sections: [
      {
        heading: 'Product cookies',
        body: [
          `The signed-in product uses one HttpOnly, SameSite=Lax session cookie named rl_session. It authenticates the session and is not used for advertising or cross-site tracking.`,
          'The marketing site does not add advertising cookies in this repository.',
        ],
      },
      {
        heading: 'Analytics identification',
        body: [
          'The tracker derives a rotating visitor identifier from request data and a server-side salt. The rotation window is configurable (month, week, or day) and defaults to monthly.',
          'The tracker does not create a third-party advertising identifier and does not share identifiers across customer websites.',
        ],
      },
      {
        heading: 'Session replay consent',
        body: [
          'Session replay masks all inputs by default and masks text in strict mode. A host page can require consent with data-consent="required"; the recorder then waits for window.__taliviaSetConsent(true) or a talivia:consent event.',
          'Revoking consent stops the recorder. It does not start a new recording.',
        ],
      },
      {
        heading: 'Customer responsibility',
        body: [
          'Each customer is responsible for the notices and consent required in the jurisdictions where its visitors are located. The consent hooks above are provided so a customer can implement that choice honestly.',
        ],
      },
    ],
  },
  {
    slug: 'dpa',
    title: 'Data processing addendum',
    summary: 'Processor terms for customers who need a DPA.',
    updated: '2026-11-06',
    sections: [
      {
        heading: 'Roles',
        body: [
          'For account and billing data, the customer is the controller and we are the processor. For analytics data about the customer’s visitors, the customer is the controller and we process it on the customer’s documented instructions.',
        ],
      },
      {
        heading: 'Security measures',
        body: [
          'Measures implemented in this repository include tenant-scoped authorization on every tenant read/write, encrypted provider credentials, hashed session and invitation tokens, PostgreSQL-backed rate limits, CSRF origin checks, audit events for sensitive actions, and tenant-scoped retention jobs.',
          'A formal security annex, breach-notification window, and subprocessor change notice period must be completed by counsel before this DPA is offered.',
        ],
      },
      {
        heading: 'Subprocessors',
        body: ['The current subprocessor list is at /legal/subprocessors.'],
      },
      {
        heading: 'Deletion and export',
        body: [
          'The customer can export account data from Settings → Security. Account deletion soft-deletes owned workspaces and revokes sessions; analytics payloads are removed by the retention job. A hard-deletion certificate is not yet implemented.',
        ],
      },
    ],
  },
  {
    slug: 'subprocessors',
    title: 'Subprocessors',
    summary: 'Third-party services that may process data for the hosted product.',
    updated: '2026-11-06',
    sections: [
      {
        heading: 'Current categories',
        body: [
          'Database hosting: Neon PostgreSQL (production), subject to the region chosen by the operator.',
          'Application hosting and edge delivery: the operator’s chosen Next.js host. The repository supports Vercel and a standalone Node deployment.',
          'Transactional email: Resend, only when RESEND_API_KEY is configured.',
          'Platform billing: Dodo Payments, only when platform billing credentials are configured.',
          'Customer-connected analytics providers: Stripe, Dodo Payments, Lemon Squeezy, Polar, and Yolfi, but only for the websites where the customer created a connection.',
          'Error tracking: optional. No provider is enabled by default; ERROR_TRACKING_WEBHOOK enables a customer/operator-controlled endpoint.',
        ],
      },
      {
        heading: 'No hidden providers',
        body: [
          'This list is generated from the integrations implemented in the repository. If a production deployment adds a provider, this page must be updated before launch. Do not treat this draft as a signed subprocessor list.',
        ],
      },
    ],
  },
  {
    slug: 'acceptable-use',
    title: 'Acceptable use policy',
    summary: `What may and may not be measured with ${BRAND.name}.`,
    updated: '2026-11-06',
    sections: [
      {
        heading: 'Allowed',
        body: [
          'Measuring websites and products you own or are authorised to operate, connecting payment accounts you control, and viewing revenue data for those properties.',
        ],
      },
      {
        heading: 'Not allowed',
        body: [
          'Tracking visitors without the notices or consent required in their jurisdiction; collecting payment card data directly; measuring sites you do not control; attempting to access another tenant’s data; evading plan limits or metering; sending automated traffic to inflate event counts; using the service to build advertising profiles; or reselling access without a written agreement.',
        ],
      },
      {
        heading: 'Enforcement',
        body: [
          'We may throttle or suspend a workspace that threatens the service or violates this policy. Suspension is recorded in the audit log. We do not silently delete customer data as a first response.',
        ],
      },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find(document => document.slug === slug);
}
