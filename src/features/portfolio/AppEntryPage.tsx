'use client';
import { Button, Column, Grid, Icon, Row, Text } from '@talivia/react-zen';
import { isAfter } from 'date-fns';
import { useId } from 'react';
import { Favicon } from '@/components/common/Favicon';
import Link from '@/components/common/Link';
import { PageBody } from '@/components/common/PageBody';
import {
  useDateRange,
  useLocale,
  useMessages,
  useNavigation,
  useUrlState,
} from '@/components/hooks';
import { NavArrowRight as ChevronRight, Edit, Internet as Globe2 } from '@/components/icons';
import { DateFilter } from '@/components/input/DateFilter';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { useWebsiteOverviewQuery } from '@/features/portfolio/hooks/useWebsiteOverviewQuery';
import { DEFAULT_CURRENCY, ROLES } from '@/lib/constants';
import { getDateRangeValue } from '@/lib/date';
import { formatCurrency, formatLongCurrency, formatLongNumber } from '@/lib/format';
import { WebsiteAddButton } from '../websites/WebsiteAddButton';
import { WebsiteFirstRunPanel } from '../websites/WebsiteFirstRunPanel';
import { PortfolioCharts } from './PortfolioCharts';

const CHART_WIDTH = 420;
const CHART_HEIGHT = 132;
const CHART_TOP = 12;
const CHART_BOTTOM = CHART_HEIGHT;
const REVENUE_COLOR = '#2dbf72';
const TRAFFIC_COLOR = '#3b82ff';
const OVERVIEW_AXIS_COLOR = 'var(--talivia-card-border)';
const OVERVIEW_CARD_INFO_HEIGHT = 68;
const OVERVIEW_BAR_EDGE_GAP = 10;
const APP_DATE_FILTER_VALUES = ['0day', '24hour', '0week', '7day', '0month', '30day'];
const REVENUE_HEIGHT_RATIO = 0.5;

interface WebsiteOverview {
  id: string;
  name: string;
  domain?: string | null;
  access?: {
    canUpdate?: boolean;
  };
  metrics: {
    pageviews: number;
    visitors: number;
    visits: number;
    payments: number;
    revenue: number;
    currency?: string | null;
  };
  chart?: {
    date: string;
    visitors: number;
    revenue: number;
    payments: number;
  }[];
}

function formatDateLabel(date: string) {
  const parsedDate = new Date(date.includes(' ') ? date.replace(' ', 'T') : date);

  if (Number.isFinite(parsedDate.getTime())) {
    const hasTime = /[ T]\d{2}:\d{2}/.test(date) || /[ T]\d{2}$/.test(date);

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      ...(hasTime ? { hour: 'numeric' } : {}),
    }).format(parsedDate);
  }

  const parts = date.split('-');

  if (parts.length < 3) {
    return date;
  }

  return `${parts[1]}/${parts[2]}`;
}

function getLinePath(points: { x: number; y: number }[]) {
  return points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
}

function getSmoothLinePath(points: { x: number; y: number }[]) {
  if (points.length < 3) {
    return getLinePath(points);
  }

  const smoothing = 0.18;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] || next;
    const minY = Math.min(current.y, next.y);
    const maxY = Math.max(current.y, next.y);
    const controlOneY = clamp(current.y + (next.y - previous.y) * smoothing, minY, maxY);
    const controlTwoY = clamp(next.y - (afterNext.y - current.y) * smoothing, minY, maxY);

    commands.push(
      [
        'C',
        current.x + (next.x - previous.x) * smoothing,
        controlOneY,
        next.x - (afterNext.x - current.x) * smoothing,
        controlTwoY,
        next.x,
        next.y,
      ].join(' '),
    );
  }

  return commands.join(' ');
}

function getAreaPath(points: { x: number; y: number }[], baseline: number) {
  if (!points.length) {
    return '';
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${getSmoothLinePath(points)} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;
}

function getTopRoundedRectPath({
  x,
  y,
  width,
  height,
  radius,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}) {
  const r = Math.min(radius, width / 2, height);
  const bottom = y + height;
  const right = x + width;

  if (r <= 0) {
    return `M ${x} ${bottom} L ${x} ${y} L ${right} ${y} L ${right} ${bottom} Z`;
  }

  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${right - r} ${y}`,
    `Q ${right} ${y} ${right} ${y + r}`,
    `L ${right} ${bottom}`,
    'Z',
  ].join(' ');
}

function WebsiteMiniChart({
  chart = [],
  currency,
}: {
  chart?: WebsiteOverview['chart'];
  currency: string;
}) {
  const { locale } = useLocale();
  const areaGradientId = `website-card-area-${useId().replace(/:/g, '')}`;
  const points = chart?.length
    ? chart
    : Array.from({ length: 14 }, (_, index) => ({
        date: String(index),
        visitors: 0,
        revenue: 0,
        payments: 0,
      }));
  const maxVisitors = Math.max(...points.map(point => point.visitors), 0);
  const maxRevenue = Math.max(...points.map(point => point.revenue), 0);
  const hasVisitorTrend = maxVisitors > 0;
  const xStep = points.length > 1 ? CHART_WIDTH / (points.length - 1) : CHART_WIDTH;
  const baseline = CHART_BOTTOM;
  const linePoints = points.map((point, index) => {
    const value = maxVisitors ? point.visitors / maxVisitors : 0;

    return {
      x: index * xStep,
      y: hasVisitorTrend ? baseline - value * (baseline - CHART_TOP) : baseline,
    };
  });
  const barWidth = Math.max(5, CHART_WIDTH / points.length / 2.4);
  const barEdgeInset = barWidth / 2 + OVERVIEW_BAR_EDGE_GAP;
  const barStep = points.length > 1 ? (CHART_WIDTH - barEdgeInset * 2) / (points.length - 1) : 0;
  const revenueScaleHeight = (baseline - CHART_TOP) * REVENUE_HEIGHT_RATIO;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Visitors and revenue trend"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient
          id={areaGradientId}
          x1="0"
          x2="0"
          y1={CHART_TOP}
          y2={baseline}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4589ff" stopOpacity="0.28" />
          <stop offset="42%" stopColor="#2a5dba" stopOpacity="0.21" />
          <stop offset="100%" stopColor="#122a4d" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      {hasVisitorTrend && (
        <line x1="0" x2={CHART_WIDTH} y1={baseline} y2={baseline} stroke={OVERVIEW_AXIS_COLOR} />
      )}
      {hasVisitorTrend && (
        <path d={getAreaPath(linePoints, baseline)} fill={`url(#${areaGradientId})`} />
      )}
      <path
        d={getSmoothLinePath(linePoints)}
        fill="none"
        stroke={TRAFFIC_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>{`${formatLongNumber(maxVisitors)} peak visitors`}</title>
      </path>
      {linePoints.map((point, index) => (
        <circle key={points[index].date} cx={point.x} cy={point.y} r="6" fill="transparent">
          <title>{`${formatDateLabel(points[index].date)}: ${formatLongNumber(
            points[index].visitors,
          )} visitors`}</title>
        </circle>
      ))}
      {points.map((point, index) => {
        const x =
          points.length > 1
            ? barEdgeInset + index * barStep - barWidth / 2
            : (CHART_WIDTH - barWidth) / 2;
        const value = maxRevenue ? point.revenue / maxRevenue : 0;
        const height = value ? Math.max(4, value * revenueScaleHeight) : 0;

        return (
          <path
            key={point.date}
            d={getTopRoundedRectPath({
              x,
              y: baseline - height,
              width: barWidth,
              height,
              radius: 3,
            })}
            fill={REVENUE_COLOR}
            opacity={height ? 1 : 0}
          >
            <title>
              {`${formatDateLabel(point.date)}: ${point.payments} sales, ${formatLongCurrency(
                point.revenue,
                currency,
                locale,
              )}`}
            </title>
          </path>
        );
      })}
    </svg>
  );
}

function WebsiteCard({ website }: { website: WebsiteOverview }) {
  const { renderUrl } = useNavigation();
  const { locale } = useLocale();
  const { t, labels } = useMessages();
  const { id, name, domain, metrics } = website;
  const canOpenSettings = !!website.access?.canUpdate;
  const currency = metrics.currency || DEFAULT_CURRENCY;

  return (
    <div className="website-overview-card" style={{ position: 'relative', height: '100%' }}>
      <Link
        href={renderUrl(`/app/${id}`, false)}
        style={{
          color: 'inherit',
          display: 'block',
          height: '100%',
          textDecoration: 'none',
        }}
      >
        <Column className="portfolio-site-card" gap="0">
          <Column
            gap="1"
            style={{
              height: OVERVIEW_CARD_INFO_HEIGHT,
              padding: '14px 16px 8px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Row
              alignItems="center"
              gap="2"
              minWidth="0"
              style={{ paddingRight: canOpenSettings ? 34 : 0 }}
            >
              {domain ? (
                <Favicon
                  domain={domain}
                  style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                />
              ) : (
                <Icon color="muted" size="sm">
                  <Globe2 />
                </Icon>
              )}
              <Text size="lg" weight="bold" truncate title={name}>
                {name}
              </Text>
            </Row>

            <Row alignItems="baseline" gap="4" minWidth="0" style={{ whiteSpace: 'nowrap' }}>
              <Text size="xl" weight="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatLongCurrency(metrics.revenue, currency, locale)}
              </Text>
              <Text size="sm" color="muted">
                {formatLongNumber(metrics.visitors)} {t(labels.visitors).toLocaleLowerCase(locale)}
              </Text>
            </Row>
          </Column>

          <div
            aria-hidden="true"
            style={{
              flex: 1,
              minHeight: 96,
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <WebsiteMiniChart chart={website.chart} currency={currency} />
          </div>
        </Column>
      </Link>

      {canOpenSettings && (
        <Link
          aria-label={`${t(labels.settings)}: ${name}`}
          className="website-card-settings-link"
          href={renderUrl(`/app/${id}/settings`, false)}
          title={t(labels.settings)}
        >
          <Edit />
        </Link>
      )}
    </div>
  );
}

export function AppEntryPage() {
  const { user } = useLoginQuery();
  const {
    patch,
    query: { offset = 0 },
  } = useUrlState();
  const { dateRange, isAllTime, isCustomRange } = useDateRange();
  const { getErrorMessage, t, labels } = useMessages();
  const { data, isLoading, error } = useWebsiteOverviewQuery();
  const isInitialLoading = isLoading && !data;
  const websites = (data?.data || []) as WebsiteOverview[];
  const { locale } = useLocale();
  const showActions = user?.role !== ROLES.viewOnly;
  const showDateStepButtons = !isAllTime && !isCustomRange;
  const disableForward = isAfter(dateRange.endDate, new Date());
  const dateValue = Number(offset)
    ? getDateRangeValue(dateRange.startDate, dateRange.endDate)
    : dateRange.value;

  const totalRevenue = websites.reduce(
    (sum, website) => sum + Number(website.metrics.revenue || 0),
    0,
  );
  const totalVisitors = websites.reduce(
    (sum, website) => sum + Number(website.metrics.visitors || 0),
    0,
  );
  const currencies = new Set(websites.map(website => website.metrics.currency || DEFAULT_CURRENCY));
  const singleCurrency = currencies.size <= 1;
  const portfolioCurrency = [...currencies][0] || DEFAULT_CURRENCY;
  const hasSites = websites.length > 0;

  const handleDateChange = (date: string) => {
    patch({ date, offset: undefined, unit: undefined, page: undefined });
  };

  const handleDateIncrement = (increment: number) => {
    patch({ offset: Number(offset) + increment });
  };

  const summary = hasSites
    ? [
        `${websites.length} ${websites.length === 1 ? 'website' : 'websites'}`,
        singleCurrency ? formatCurrency(totalRevenue, portfolioCurrency, locale) : 'Mixed currency',
        `${formatLongNumber(totalVisitors)} ${t(labels.visitors).toLocaleLowerCase(locale)}`,
      ].join(' · ')
    : 'Connect your first site to start measuring revenue.';

  return (
    <PageBody isLoading={isInitialLoading} error={getErrorMessage(error)}>
      <Column gap="5" paddingTop="2">
        <Row
          className="portfolio-toolbar"
          alignItems="flex-end"
          justifyContent="space-between"
          gap="3"
          wrap="wrap"
        >
          <Column gap="1" minWidth="0">
            <Text size="xl" weight="bold">
              Websites
            </Text>
            <Text size="sm" color="muted">
              {summary}
            </Text>
          </Column>

          <Row alignItems="center" gap="2" wrap="wrap">
            {showDateStepButtons && (
              <Button
                className="talivia-control"
                onPress={() => handleDateIncrement(-1)}
                variant="outline"
                aria-label="Previous period"
              >
                <Icon rotate={180}>
                  <ChevronRight />
                </Icon>
              </Button>
            )}
            <DateFilter
              className="min-w-[180px]"
              value={dateValue}
              onChange={handleDateChange}
              allowedValues={APP_DATE_FILTER_VALUES}
              renderDate={Number(offset) !== 0}
              buttonProps={{ className: 'talivia-control' }}
            />
            {showDateStepButtons && (
              <Button
                className="talivia-control"
                onPress={() => handleDateIncrement(1)}
                variant="outline"
                isDisabled={disableForward}
                aria-label="Next period"
              >
                <Icon>
                  <ChevronRight />
                </Icon>
              </Button>
            )}
            {showActions && <WebsiteAddButton />}
          </Row>
        </Row>

        {/* Mixed-currency portfolios are left to the per-site cards; summing
            different currencies into one chart would be misleading. */}
        {hasSites && singleCurrency && (
          <PortfolioCharts sites={websites} currency={portfolioCurrency} />
        )}

        {websites.length === 0 && showActions ? (
          <WebsiteFirstRunPanel />
        ) : websites.length === 0 ? (
          <Row alignItems="center" justifyContent="center" style={{ minHeight: 220 }}>
            <Text color="muted">No websites in this workspace yet.</Text>
          </Row>
        ) : (
          <Grid
            columns={{
              base: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            }}
            gap="4"
          >
            {websites.map(website => (
              <WebsiteCard key={website.id} website={website} />
            ))}
          </Grid>
        )}
      </Column>
    </PageBody>
  );
}
