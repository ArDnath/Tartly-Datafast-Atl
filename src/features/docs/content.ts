/**
 * Public documentation content. Keep provider facts tied to the behaviour that
 * exists in this repository. Dynamic status pages, dashboards, and SDKs are
 * linked, not copied.
 */
import { BRAND } from '@/lib/brand';

export interface DocsGuide {
  slug: string;
  title: string;
  summary: string;
  recommendedFor: string;
  connectSteps: string[];
  attribution: string;
  officialLinks: { label: string; url: string }[];
  warning?: string;
}

export const DOCS_HOME = {
  title: 'Documentation',
  summary:
    'Connect a site, install the tracker, and connect the payment provider that already handles your revenue. These guides describe the integrations this product actually ships.',
};

export const REVENUE_GUIDES: DocsGuide[] = [
  {
    slug: 'stripe',
    title: 'Stripe',
    summary: 'Read-only reporting from Stripe Checkout, Payment Intents, and subscriptions.',
    recommendedFor: 'Most SaaS checkouts using Stripe Checkout, Payment Links, or Billing.',
    connectSteps: [
      `Create a restricted Stripe key with the permissions ${BRAND.name} requests. Do not use the full secret key.`,
      `Paste the restricted key on the website settings page. ${BRAND.name} validates it and creates a signed webhook.`,
      `${BRAND.name} imports recent checkout, invoice, payment, refund, and subscription events for the website.`,
    ],
    attribution:
      'Checkout Sessions and Payment Intents use the session identifier in metadata. Payment Links can be matched directly from the tracked click or through the return URL. Subscriptions inherit metadata from the original checkout and invoices.',
    officialLinks: [
      {
        label: 'Create a restricted key in Stripe',
        url: `https://dashboard.stripe.com/apikeys/create?name=${encodeURIComponent(BRAND.name)}`,
      },
      { label: 'Stripe API reference', url: 'https://docs.stripe.com/api' },
    ],
    warning:
      'The metadata key is talivia_session_id for compatibility with existing integrations. Treat it as an opaque identifier, not as branding.',
  },
  {
    slug: 'dodo-payments',
    title: 'Dodo Payments',
    summary: 'Payments, refunds, and subscriptions from Dodo Payments.',
    recommendedFor: 'Products already selling through Dodo Payments.',
    connectSteps: [
      `Create a Dodo API key for the environment you want to connect and enable write access so ${BRAND.name} can manage its webhook.`,
      `Paste the key on the website settings page. ${BRAND.name} validates the account, creates the environment-specific webhook, and imports recent history.`,
      'Keep the connection active. Refunds and disputes are reconciled from later webhook events.',
    ],
    attribution:
      `Payment Links clicked on a tracked page are matched automatically. Checkout Sessions, Overlay Checkout, and Inline Checkout need the ${BRAND.name} session identifier in payment metadata.`,
    officialLinks: [
      { label: 'Create a Dodo API key', url: 'https://app.dodopayments.com/developer/api-keys' },
      { label: 'Dodo Payments documentation', url: 'https://docs.dodopayments.com' },
    ],
    warning:
      'Use the metadata key talivia_session_id for compatibility with existing integrations.',
  },
  {
    slug: 'lemonsqueezy',
    title: 'Lemon Squeezy',
    summary: 'Orders, subscriptions, and refunds from a Lemon Squeezy store.',
    recommendedFor: 'Digital products and licenses sold through Lemon Squeezy.',
    connectSteps: [
      'Find your Store ID in Lemon Squeezy.',
      'Create an API key and paste both values on the website settings page.',
      `${BRAND.name} validates the store, stores the key securely, and creates the signed revenue webhook.`,
    ],
    attribution:
      `Pass the ${BRAND.name} session identifier in the checkout custom data. Orders and subscription invoices keep that custom data so renewals stay attributed.`,
    officialLinks: [
      { label: 'Find your Lemon Squeezy store', url: 'https://app.lemonsqueezy.com/settings/stores' },
      { label: 'Create a Lemon Squeezy API key', url: 'https://app.lemonsqueezy.com/settings/api' },
      { label: 'Lemon Squeezy API docs', url: 'https://docs.lemonsqueezy.com' },
    ],
    warning:
      'Use the custom-data key talivia_session_id for compatibility with existing integrations.',
  },
  {
    slug: 'polar',
    title: 'Polar',
    summary: 'Orders, subscriptions, and refunds from a Polar organization.',
    recommendedFor: 'Products using Polar Checkout, Checkout Links, or Embedded Checkout.',
    connectSteps: [
      'Create a Polar Organization Access Token with Checkout Read, Orders Read, Organization Read, Products Read, Subscription Read, and Webhook Write.',
      `Paste the token on the website settings page. ${BRAND.name} detects the organization and environment, validates permissions, creates a signed webhook, and imports recent history.`,
      'Keep the token scoped to the organization whose revenue you want to measure.',
    ],
    attribution:
      `Pass the ${BRAND.name} session identifier in order or checkout metadata. Checkout Links can also be matched through their return URL.`,
    officialLinks: [
      { label: 'Open the Polar dashboard', url: 'https://polar.sh/dashboard' },
      { label: 'Polar documentation', url: 'https://docs.polar.sh' },
    ],
    warning:
      'Use the metadata key talivia_session_id, or reference_id where the flow requires it, for compatibility with existing integrations.',
  },
  {
    slug: 'yolfi',
    title: 'Yolfi',
    summary: 'Payments and subscriptions from a Yolfi organization.',
    recommendedFor: 'Products using Yolfi paylinks or subscriptions.',
    connectSteps: [
      'Copy an organization API key from Yolfi.',
      `Paste the key on the website settings page. ${BRAND.name} creates the analytics webhook and stores its signing secret.`,
      'Add the website and session metadata when creating Yolfi payments so revenue can be matched to the original visit.',
    ],
    attribution:
      'Yolfi events are matched to the website that owns the connection. Include the session context in payment metadata when your integration supports it.',
    officialLinks: [
      { label: 'Open Yolfi', url: 'https://app.yolfi.com' },
    ],
  },
  {
    slug: 'manual',
    title: 'Manual payment API',
    summary: 'Send confirmed revenue from any backend with a website API key.',
    recommendedFor: 'Custom payment systems that do not have a native provider integration.',
    connectSteps: [
      'Create a server-side API key on the website settings page. Keep it on the backend.',
      'Send a POST request to /api/payments/manual with the website, transaction, amount, and currency.',
      'Include sessionId when you know the analytics session that produced the payment.',
    ],
    attribution:
      'The sessionId field links a payment to the visit that produced it. Without it, the payment is still recorded but cannot be attributed to a channel or journey.',
    officialLinks: [],
  },
];

export function getRevenueGuide(slug: string) {
  return REVENUE_GUIDES.find(guide => guide.slug === slug);
}
