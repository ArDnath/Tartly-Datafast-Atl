import prisma from '@/lib/prisma';
import {
  createSqlInList,
  mergePortfolioMrrRows,
  type PortfolioMrrByChannel,
  type PortfolioMrrRow,
} from '@/features/account/lib/website-overview';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];

/**
 * Current MRR grouped by the subscriber's first-touch channel. Attribution
 * falls back to the subscription's earliest attributed payment when the
 * visitor record is missing, so imported subscriptions are still classified.
 */
export async function getPortfolioMrrByChannel(
  websiteIds: string[],
): Promise<PortfolioMrrByChannel> {
  if (!websiteIds.length) {
    return mergePortfolioMrrRows([]);
  }

  const websiteIdList = createSqlInList('mrrWebsiteId', websiteIds, 'uuid');
  const statusList = createSqlInList('mrrStatus', ACTIVE_SUBSCRIPTION_STATUSES);

  const rows = (await prisma.rawQuery(
    `
    select
      coalesce(v.first_source, pa.first_touch_source) as "source",
      coalesce(v.first_medium, pa.first_touch_medium) as "medium",
      coalesce(v.first_referrer_domain, pa.first_touch_referrer_domain) as "referrerDomain",
      sum(s.mrr_amount)::float as "mrr",
      count(*)::int as "subscriptions",
      max(s.currency) as "currency"
    from subscription s
    left join visitor v
      on v.visitor_id = s.visitor_id
    left join lateral (
      select
        pa.first_touch_source,
        pa.first_touch_medium,
        pa.first_touch_referrer_domain
      from payment p
      join payment_attribution pa
        on pa.payment_id = p.payment_id
      where p.website_id = s.website_id
        and p.provider_name = s.provider_name
        and p.provider_subscription_id = s.provider_subscription_id
        and pa.attribution_model = 'first_touch'
      order by p.occurred_at asc
      limit 1
    ) pa on true
    where s.website_id in (${websiteIdList.sql})
      and s.mrr_amount is not null
      and s.mrr_amount > 0
      and s.lifecycle_status in (${statusList.sql})
    group by 1, 2, 3
    `,
    { ...websiteIdList.params, ...statusList.params },
  )) as PortfolioMrrRow[];

  return mergePortfolioMrrRows(rows);
}
