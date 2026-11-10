'use client';

import { useMemo, useRef, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import {
  type ChartColors,
  ComposedTrendChart,
  LineTrendChart,
  SankeyFlowChart,
} from '@/components/charts/echarts';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  EditPencil,
  Filter,
  HalfMoon,
  MoreHoriz,
  NavArrowDown,
  Pause,
  Play,
  SunLight,
  ViewGrid,
  Xmark,
} from '@/components/icons';
import { BRAND } from '@/lib/brand';
import { getChartLabels, getComparisonSeries, getDemoSankey } from '../demo/chart-data';
import {
  type BreakdownCard,
  type BreakdownTab,
  type DemoFilter,
  formatMetric,
  GRANULARITY_OPTIONS,
  type Granularity,
  getChartSeries,
  getRange,
  type Kpi,
  MAIN_TABS,
  MORE_TABS,
  RANGE_OPTIONS,
  type RangeKey,
  type ReplayRow,
  type Row,
  rowTotal,
  type TableTab,
  VIEWS,
  type ViewConfig,
  type ViewId,
} from '../demo/workspace-data';
import styles from './HeroPreview.module.css';

const PROJECTS = [
  { id: 'tartly.in', label: 'tartly.in', meta: 'Production website', factor: 1 },
  { id: 'docs.tartly.in', label: 'docs.tartly.in', meta: 'Documentation', factor: 0.42 },
  { id: 'store.tartly.in', label: 'store.tartly.in', meta: 'Storefront', factor: 0.18 },
] as const;

type ProjectId = (typeof PROJECTS)[number]['id'];
type Theme = 'dark' | 'light';

const DEMO_BAR_COLORS: Record<Theme, string[]> = {
  light: ['#2f6fd6', '#8b5cf6', '#0ea5a4', '#d97706', '#db2777', '#4f46e5'],
  dark: ['#6f9fff', '#a78bfa', '#2dd4bf', '#fbbf24', '#f472b6', '#818cf8'],
};

const DEMO_CHART_COLORS: Record<Theme, ChartColors> = {
  light: {
    text: '#1c1b18',
    muted: '#6f6a61',
    grid: 'rgba(23, 23, 23, 0.06)',
    surface: '#fffdf8',
    border: '#d2c8b7',
    accent: '#2f6fd6',
    accentAlt: '#0f8a5f',
    positive: '#0f8a5f',
    negative: '#c2434f',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  dark: {
    text: '#f4f4f5',
    muted: '#a1a1aa',
    grid: 'rgba(255, 255, 255, 0.055)',
    surface: '#1d1d1d',
    border: 'rgba(255, 255, 255, 0.16)',
    accent: '#6f9fff',
    accentAlt: '#4ade80',
    positive: '#4ade80',
    negative: '#fb7185',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
};

function kpiValue(kpi: Kpi, factor: number, conv?: number) {
  if (kpi.live) {
    return formatMetric(kpi.value, 'number');
  }

  if (kpi.scale === false) {
    if (kpi.label === 'Conversion' && conv != null) {
      return `${conv.toFixed(1)}%`;
    }
    return `${formatMetric(kpi.value, kpi.format)}${kpi.suffix ?? ''}`;
  }

  return `${formatMetric(kpi.value * factor, kpi.format)}${kpi.suffix ?? ''}`;
}

function resample(values: number[], target: number): number[] {
  if (values.length <= target) {
    return values;
  }

  const size = values.length / target;
  return Array.from({ length: target }, (_, index) => {
    const start = Math.floor(index * size);
    const end = Math.max(start + 1, Math.floor((index + 1) * size));
    return values.slice(start, end).reduce((sum, value) => sum + value, 0);
  });
}

function KpiStrip({ kpis, factor, conv }: { kpis: Kpi[]; factor: number; conv?: number }) {
  return (
    <div className={styles.kpis}>
      {kpis.map(kpi => (
        <div key={kpi.label} className={styles.kpi}>
          <span className={styles.kpiLabel}>
            {kpi.live && <span className={styles.liveDot} aria-hidden="true" />}
            {kpi.label}
          </span>
          <span className={styles.kpiValue}>{kpiValue(kpi, factor, conv)}</span>
          {kpi.live ? (
            <span className={styles.liveText}>live now</span>
          ) : kpi.delta ? (
            <span className={kpi.tone === 'down' ? styles.deltaDown : styles.deltaUp}>
              {kpi.delta}
            </span>
          ) : (
            <span className={styles.deltaMuted}>&nbsp;</span>
          )}
        </div>
      ))}
    </div>
  );
}

function BreakdownCardView({
  card,
  activeTab,
  activeRow,
  onTab,
  onRow,
}: {
  card: BreakdownCard;
  activeTab: string;
  activeRow: string | null;
  onTab: (tabId: string) => void;
  onRow: (row: Row, tab: BreakdownTab) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tab = card.tabs.find(item => item.id === activeTab) ?? card.tabs[0];
  const total = rowTotal(tab.rows);
  const visibleRows = expanded ? tab.rows : tab.rows.slice(0, 6);
  const unitLabel =
    tab.unit === 'revenue' ? 'Revenue' : tab.unit === 'events' ? 'Events' : 'Visitors';

  return (
    <section className={styles.card} aria-label={`${tab.label} breakdown`}>
      <div className={styles.cardHead}>
        <div className={styles.cardTabs} role="group" aria-label={`${tab.label} dimensions`}>
          {card.tabs.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.chipTab}
              data-active={item.id === tab.id}
              aria-pressed={item.id === tab.id}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.cardMeta}>
          <span className={styles.metaLabel}>{unitLabel}</span>
          <button
            type="button"
            className={styles.iconButtonSmall}
            aria-label={expanded ? 'Show fewer rows' : 'Show all rows'}
            aria-pressed={expanded}
            onClick={() => setExpanded(value => !value)}
          >
            <MoreHoriz width={13} height={13} />
          </button>
        </div>
      </div>

      <div className={styles.rows}>
        {visibleRows.map(row => {
          const width = Math.max(3, (row.value / Math.max(total, 1)) * 100);
          const active = activeRow === row.label;
          return (
            <button
              key={row.label}
              type="button"
              className={styles.row}
              data-active={active}
              aria-pressed={active}
              onClick={() => onRow(row, tab)}
            >
              <span className={styles.rowFill} style={{ width: `${width}%` }} aria-hidden="true" />
              <span className={styles.rowLabel}>
                {row.flag && (
                  <span className={styles.flag} aria-hidden="true">
                    {row.flag}
                  </span>
                )}
                {row.label}
              </span>
              <span className={styles.rowValue}>
                {row.display ?? row.value.toLocaleString('en-US')}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DataTable({
  tabs,
  activeTab,
  onTab,
}: {
  tabs: TableTab[];
  activeTab: string;
  onTab: (tabId: string) => void;
}) {
  const tab = tabs.find(item => item.id === activeTab) ?? tabs[0];

  return (
    <section className={styles.card} aria-label="Visitor details">
      <div className={styles.tableTabs} role="group" aria-label="Data table sections">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            className={styles.chipTab}
            data-active={item.id === tab.id}
            aria-pressed={item.id === tab.id}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.iconButtonSmall}
          aria-label="Table options"
          title="Table options"
        >
          <MoreHoriz width={13} height={13} />
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {tab.columns.map((column, index) => (
                <th key={column} className={index === 0 ? styles.firstColumn : undefined}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((row, rowIndex) => (
              <tr key={`${tab.id}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${tab.id}-${rowIndex}-${cellIndex}`}
                    className={cellIndex === 0 ? styles.firstColumn : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FunnelPanel({
  tabs,
  activeTab,
  onTab,
}: {
  tabs: { id: string; label: string; steps: { label: string; value: number }[] }[];
  activeTab: string;
  onTab: (tabId: string) => void;
}) {
  const tab = tabs.find(item => item.id === activeTab) ?? tabs[0];
  const start = tab.steps[0]?.value ?? 1;

  return (
    <section className={styles.card} aria-label={`${tab.label} steps`}>
      <div className={styles.cardHead}>
        <div className={styles.cardTabs} role="group" aria-label="Funnel selection">
          {tabs.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.chipTab}
              data-active={item.id === tab.id}
              aria-pressed={item.id === tab.id}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className={styles.metaLabel}>Conversion</span>
      </div>

      <div className={styles.funnel}>
        {tab.steps.map((step, index) => {
          const percent = (step.value / start) * 100;
          const previous = index === 0 ? step.value : tab.steps[index - 1].value;
          const dropoff = index === 0 ? 0 : ((previous - step.value) / Math.max(previous, 1)) * 100;
          return (
            <div key={step.label} className={styles.funnelStep}>
              <div className={styles.funnelTop}>
                <span className={styles.funnelIndex}>{index + 1}</span>
                <span className={styles.funnelLabel}>{step.label}</span>
                <span className={styles.funnelValue}>{step.value.toLocaleString('en-US')}</span>
                <span className={styles.funnelPercent}>{percent.toFixed(1)}%</span>
              </div>
              <div className={styles.funnelTrack}>
                <span style={{ width: `${Math.max(percent, 2)}%` }} />
              </div>
              {index > 0 && <span className={styles.dropoff}>−{dropoff.toFixed(1)}% drop-off</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReplayPanel({
  replays,
  selected,
  playing,
  onSelect,
  onTogglePlay,
}: {
  replays: ReplayRow[];
  selected: ReplayRow;
  playing: boolean;
  onSelect: (replay: ReplayRow) => void;
  onTogglePlay: () => void;
}) {
  return (
    <>
      <section className={styles.playerCard} aria-label="Selected session replay">
        <div className={styles.playerScreen} data-playing={playing}>
          <div className={styles.fakeShell}>
            <div className={styles.fakeChrome}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.fakeBody}>
              <div className={styles.fakeSidebar}>
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className={styles.fakeMain}>
                <div className={styles.fakeMetricRow}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.fakeChart}>
                  {[42, 58, 36, 74, 62, 86, 70, 92, 78, 64, 88, 96].map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className={styles.fakeLines}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.playButton}
            aria-label={playing ? 'Pause replay' : 'Play replay'}
            aria-pressed={playing}
            onClick={onTogglePlay}
          >
            {playing ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
          </button>
          <span className={styles.playerBadge}>
            <span aria-hidden="true">{selected.flag}</span>
            {selected.country}
          </span>
          <div className={styles.progressTrack} aria-hidden="true">
            <span data-playing={playing} />
          </div>
        </div>

        <div className={styles.playerInfo}>
          <div>
            <span className={styles.eyebrow}>Session replay</span>
            <h3>{selected.visitor}</h3>
            <p>
              {selected.browser} · {selected.os} · {selected.device}
            </p>
          </div>
          <dl className={styles.replayMeta}>
            <div>
              <dt>Duration</dt>
              <dd>{selected.duration}</dd>
            </div>
            <div>
              <dt>Pages</dt>
              <dd>{selected.pages}</dd>
            </div>
            <div>
              <dt>Events</dt>
              <dd>{selected.pages * 3 + 2}</dd>
            </div>
            <div>
              <dt>Captured</dt>
              <dd>{selected.activity}</dd>
            </div>
          </dl>
          {selected.issues ? (
            <span className={styles.issueBadge}>{selected.issues} detected</span>
          ) : (
            <span className={styles.cleanBadge}>
              <Check width={11} height={11} /> No issues
            </span>
          )}
          <div className={styles.timeline} aria-hidden="true">
            {[12, 26, 41, 58, 72, 86].map(value => (
              <span key={value} style={{ left: `${value}%` }} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-label="Session replay list">
        <div className={styles.replayListHead}>
          <span>Visitor</span>
          <span>Browser</span>
          <span>Duration</span>
          <span>Pages</span>
          <span>Activity</span>
        </div>
        <div className={styles.replayList}>
          {replays.map(replay => (
            <button
              key={replay.id}
              type="button"
              className={styles.replayRow}
              data-active={replay.id === selected.id}
              aria-pressed={replay.id === selected.id}
              onClick={() => onSelect(replay)}
            >
              <span className={styles.replayVisitor}>
                <span className={styles.miniPlay} aria-hidden="true">
                  <Play width={10} height={10} />
                </span>
                <span>
                  <b>{replay.visitor}</b>
                  <small>
                    <span aria-hidden="true">{replay.flag}</span> {replay.country}
                  </small>
                </span>
              </span>
              <span className={styles.replayCell}>
                {replay.browser} · {replay.os}
                <small>{replay.device}</small>
              </span>
              <span className={styles.replayCell}>{replay.duration}</span>
              <span className={styles.replayCell}>{replay.pages}</span>
              <span className={styles.replayCell}>
                {replay.activity}
                {replay.issues && <small className={styles.replayIssue}>{replay.issues}</small>}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function RetentionPanel({
  headings,
  cohorts,
}: {
  headings: string[];
  cohorts: { label: string; visitors: string; values: number[] }[];
}) {
  return (
    <section className={styles.card} aria-label="Weekly retention cohorts">
      <div className={styles.cardHead}>
        <div>
          <span className={styles.eyebrow}>Retention</span>
          <h3 className={styles.panelTitle}>Weekly cohorts</h3>
        </div>
        <span className={styles.metaLabel}>Active visitors</span>
      </div>
      <div className={styles.retentionWrap}>
        <table className={styles.retentionTable}>
          <thead>
            <tr>
              {headings.map(heading => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map(cohort => (
              <tr key={cohort.label}>
                <th scope="row">{cohort.label}</th>
                <td>{cohort.visitors}</td>
                {headings.slice(2).map((heading, index) => {
                  const value = cohort.values[index];
                  if (value == null) {
                    return (
                      <td key={heading} className={styles.emptyCell}>
                        —
                      </td>
                    );
                  }
                  return (
                    <td
                      key={heading}
                      className={styles.cohortCell}
                      style={{ background: `rgba(91, 141, 239, ${0.06 + (value / 100) * 0.5})` }}
                    >
                      {value}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ViewBody({
  view,
  config,
  range,
  granularity,
  factor,
  siteFactor,
  filter,
  cardTabs,
  onCardTab,
  onRow,
  tableTab,
  onTableTab,
  chartColors,
  barColors,
}: {
  view: ViewId;
  config: ViewConfig;
  range: RangeKey;
  granularity: Granularity;
  factor: number;
  siteFactor: number;
  filter: DemoFilter | null;
  chartColors: ChartColors;
  barColors: string[];
  cardTabs: Record<string, string>;
  onCardTab: (cardId: string, tabId: string) => void;
  onRow: (tab: BreakdownTab, row: Row) => void;
  tableTab: string;
  onTableTab: (tabId: string) => void;
}) {
  const rangeOption = getRange(range);
  const [selectedReplay, setSelectedReplay] = useState<ReplayRow>(
    config.replays?.[0] ?? ({} as ReplayRow),
  );
  const [playing, setPlaying] = useState(false);

  const scale = rangeOption.factor * siteFactor * factor;
  const chart = config.chart;
  const chartSeries = useMemo(() => {
    if (!chart) {
      return [];
    }
    const raw = getChartSeries(view, range, chart.total, siteFactor * factor);
    if (granularity === 'Week') {
      return resample(raw, raw.length > 16 ? 7 : 5);
    }
    if (granularity === 'Hour' && raw.length > 24) {
      return resample(raw, 24);
    }
    return raw;
  }, [chart, factor, granularity, range, siteFactor, view]);

  const chartLabels = useMemo(
    () => getChartLabels(range, granularity, chartSeries.length),
    [chartSeries.length, granularity, range],
  );
  const comparisonSeries = useMemo(() => getComparisonSeries(chartSeries), [chartSeries]);
  const composedRows = useMemo(
    () =>
      chartSeries.map((value, index) => ({
        label: chartLabels[index] ?? '',
        bar: value,
        line: comparisonSeries[index] ?? 0,
      })),
    [chartLabels, chartSeries, comparisonSeries],
  );
  const sankey = useMemo(
    () => getDemoSankey(rangeOption.factor, siteFactor * factor),
    [factor, rangeOption.factor, siteFactor],
  );
  const metricLabel =
    chart?.metric === 'revenue' ? 'Revenue' : chart?.metric === 'visitors' ? 'Visitors' : 'Events';
  const formatChartValue = useMemo(
    () => (value: number) => formatMetric(value, chart?.format ?? 'number'),
    [chart?.format],
  );

  return (
    <>
      <div className={styles.kpiPanel}>
        <KpiStrip kpis={config.kpis} factor={scale} conv={filter?.conv} />
        {chart && (
          <div className={styles.chartBlock}>
            <div className={styles.chartHead}>
              <div className={styles.chartTitleGroup}>
                <span className={styles.chartTitle}>{chart.title}</span>
                <span className={styles.chartTotal}>
                  {formatMetric(chart.total * scale, chart.format)}
                </span>
              </div>
            </div>
            <div className={styles.echart}>
              <ComposedTrendChart
                rows={composedRows}
                barLabel={metricLabel}
                lineLabel="Previous period"
                barColors={barColors}
                barColor={chartColors.accent}
                lineColor={chartColors.accentAlt}
                colors={chartColors}
                formatBar={formatChartValue}
                formatLine={formatChartValue}
                lineAxis="left"
                height={184}
                ariaLabel={`${chart.title} as a mixed bar and line chart. ${metricLabel} total ${formatMetric(
                  chart.total * scale,
                  chart.format,
                )} across ${chartSeries.length} points.`}
              />
            </div>
          </div>
        )}
      </div>

      {chart && (
        <div className={styles.chartGrid}>
          <section className={styles.card} aria-label="Current and previous period">
            <div className={styles.cardHead}>
              <div>
                <span className={styles.eyebrow}>Comparison</span>
                <h3 className={styles.panelTitle}>{chart.title}</h3>
              </div>
              <span className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendDot} aria-hidden="true" />
                  {metricLabel}
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendDotAlt} aria-hidden="true" />
                  Previous
                </span>
              </span>
            </div>
            <div className={styles.echartPanel}>
              <LineTrendChart
                labels={chartLabels}
                series={[
                  {
                    key: 'current',
                    label: metricLabel,
                    color: chartColors.accent,
                    data: chartSeries,
                    area: true,
                  },
                  {
                    key: 'previous',
                    label: 'Previous period',
                    color: chartColors.accentAlt,
                    data: comparisonSeries,
                    area: false,
                    dashed: true,
                  },
                ]}
                colors={chartColors}
                formatValue={formatChartValue}
                height={214}
                ariaLabel={`${chart.title} as a smooth line with the previous period dashed.`}
              />
            </div>
          </section>

          <section className={styles.card} aria-label="Acquisition to conversion flow">
            <div className={styles.cardHead}>
              <div>
                <span className={styles.eyebrow}>Flow</span>
                <h3 className={styles.panelTitle}>Acquisition to purchase</h3>
              </div>
              <span className={styles.metaLabel}>Visitors</span>
            </div>
            <div className={styles.echartPanel}>
              <SankeyFlowChart
                nodes={sankey.nodes}
                links={sankey.links}
                colors={chartColors}
                formatValue={value => formatMetric(value, 'number')}
                labelPadding={96}
                height={214}
                ariaLabel="Visitor flow from acquisition channels through the landing page and product page to purchase or bounce."
              />
            </div>
          </section>
        </div>
      )}

      {view === 'funnels' && config.funnels && (
        <FunnelPanel
          tabs={config.funnels}
          activeTab={cardTabs.funnel ?? config.funnels[0].id}
          onTab={tabId => onCardTab('funnel', tabId)}
        />
      )}

      {view === 'replays' && config.replays && (
        <ReplayPanel
          replays={config.replays}
          selected={selectedReplay}
          playing={playing}
          onSelect={replay => {
            setSelectedReplay(replay);
            setPlaying(true);
          }}
          onTogglePlay={() => setPlaying(value => !value)}
        />
      )}

      {config.breakdowns && config.breakdowns.length > 0 && (
        <div className={styles.breakdownGrid}>
          {config.breakdowns.map(card => (
            <BreakdownCardView
              key={card.id}
              card={card}
              activeTab={cardTabs[card.id] ?? card.tabs[0].id}
              activeRow={filter?.label ?? null}
              onTab={tabId => onCardTab(card.id, tabId)}
              onRow={(row, tab) => onRow(tab, row)}
            />
          ))}
        </div>
      )}

      {view === 'retention' && config.retention && (
        <RetentionPanel headings={config.retention.headings} cohorts={config.retention.cohorts} />
      )}

      {config.table && (
        <DataTable tabs={config.table.tabs} activeTab={tableTab} onTab={onTableTab} />
      )}
    </>
  );
}

export function HeroPreview() {
  const [theme, setTheme] = useState<Theme>('light');
  const [view, setView] = useState<ViewId>('overview');
  const [range, setRange] = useState<RangeKey>('30d');
  const [granularity, setGranularity] = useState<Granularity>('Day');
  const [project, setProject] = useState<ProjectId>('tartly.in');
  const [filters, setFilters] = useState<Partial<Record<ViewId, DemoFilter>>>({});
  const [cardTabs, setCardTabs] = useState<Record<string, string>>({});
  const [tableTabs, setTableTabs] = useState<Partial<Record<ViewId, string>>>({});
  const [hasScrolled, setHasScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const projectRef = useRef<HTMLDetailsElement>(null);

  const config = VIEWS[view];
  const filter = filters[view] ?? null;
  const siteFactor = PROJECTS.find(item => item.id === project)?.factor ?? 1;
  const rangeOption = getRange(range);
  const factor = filter?.factor ?? 1;
  const moreView = MORE_TABS.some(tab => tab.id === view);

  const selectView = (nextView: ViewId) => {
    setView(nextView);
    setHasScrolled(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    if (moreRef.current) {
      moreRef.current.open = false;
    }
  };

  const chooseProject = (nextProject: ProjectId) => {
    setProject(nextProject);
    setFilters({});
    if (projectRef.current) {
      projectRef.current.open = false;
    }
  };

  const handleRow = (tab: BreakdownTab, row: Row) => {
    const total = rowTotal(tab.rows);
    const nextFilter: DemoFilter = {
      label: row.label,
      factor: Math.max(0.03, Math.min(1, row.value / Math.max(total, 1))),
      conv: row.conv,
    };
    setFilters(current => ({
      ...current,
      [view]: current[view]?.label === row.label ? undefined : nextFilter,
    }));
  };

  const activeTableTab = tableTabs[view] ?? config.table?.tabs[0]?.id ?? '';

  return (
    <figure
      className={styles.frame}
      data-theme={theme}
      aria-label={`Interactive ${BRAND.name} product preview`}
    >
      <div className={styles.app}>
        <div className={styles.scrollShell}>
          <div
            className={styles.scrollArea}
            ref={scrollRef}
            data-lenis-prevent
            tabIndex={0}
            aria-label="Scrollable dashboard preview"
            onScroll={event => {
              if (!hasScrolled && event.currentTarget.scrollTop > 8) {
                setHasScrolled(true);
              }
            }}
          >
            <header className={styles.topbar}>
              <div className={styles.brand}>
                <BrandMark size={22} alt="" />
                <span>{BRAND.name}</span>
              </div>
              <div className={styles.topActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
                >
                  {theme === 'dark' ? (
                    <SunLight width={15} height={15} />
                  ) : (
                    <HalfMoon width={15} height={15} />
                  )}
                </button>
                <span className={styles.avatar} aria-hidden="true">
                  T
                </span>
                <span className={styles.userName}>{BRAND.name}</span>
              </div>
            </header>

            <div className={styles.toolbar}>
              <details className={styles.projectSelect} ref={projectRef}>
                <summary className={styles.projectButton}>
                  <span className={styles.projectIcon} aria-hidden="true">
                    <ViewGrid width={13} height={13} />
                  </span>
                  <span className={styles.projectName}>{project}</span>
                  <NavArrowDown width={12} height={12} aria-hidden="true" />
                </summary>
                <div className={styles.projectMenu} role="group" aria-label="Websites">
                  {PROJECTS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.projectOption}
                      aria-pressed={item.id === project}
                      onClick={() => chooseProject(item.id)}
                    >
                      <span>
                        <b>{item.label}</b>
                        <small>{item.meta}</small>
                      </span>
                      {item.id === project && <Check width={13} height={13} />}
                    </button>
                  ))}
                </div>
              </details>

              <div className={styles.toolbarIcons}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Edit website"
                  title="Edit website"
                >
                  <EditPencil width={14} height={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Filters"
                  title="Filters"
                >
                  <Filter width={14} height={14} />
                </button>
                <span className={styles.toolbarDivider} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Previous period"
                  title="Previous period"
                >
                  <ArrowLeft width={14} height={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Next period"
                  title="Next period"
                >
                  <ArrowRight width={14} height={14} />
                </button>
              </div>

              <div className={styles.toolbarSelects}>
                <label className={styles.select}>
                  <Calendar width={13} height={13} aria-hidden="true" />
                  <select
                    aria-label="Date range"
                    value={range}
                    onChange={event => setRange(event.target.value as RangeKey)}
                  >
                    {RANGE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <NavArrowDown width={11} height={11} aria-hidden="true" />
                </label>
                <label className={styles.select}>
                  <select
                    aria-label="Granularity"
                    value={granularity}
                    onChange={event => setGranularity(event.target.value as Granularity)}
                  >
                    {GRANULARITY_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <NavArrowDown width={11} height={11} aria-hidden="true" />
                </label>
              </div>
            </div>

            <nav className={styles.nav} aria-label="Dashboard sections">
              <div className={styles.navTabs} role="group">
                {MAIN_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={styles.navTab}
                    data-active={view === tab.id}
                    aria-pressed={view === tab.id}
                    onClick={() => selectView(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
                <details className={styles.more} ref={moreRef}>
                  <summary className={styles.navTab} data-active={moreView}>
                    More
                    <NavArrowDown width={11} height={11} aria-hidden="true" />
                  </summary>
                  <div
                    className={styles.moreMenu}
                    role="group"
                    aria-label="More dashboard sections"
                  >
                    {MORE_TABS.map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={styles.moreOption}
                        data-active={view === tab.id}
                        onClick={() => selectView(tab.id)}
                      >
                        {tab.label}
                        {view === tab.id && <Check width={12} height={12} />}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
              <span className={styles.navHint}>
                {rangeOption.label} · {project}
              </span>
            </nav>

            <div className={styles.content}>
              {filter && (
                <div className={styles.filterBar} role="status">
                  <span>
                    Filtered by <b>{filter.label}</b>
                  </span>
                  <button
                    type="button"
                    className={styles.clearFilter}
                    aria-label={`Clear ${filter.label} filter`}
                    onClick={() =>
                      setFilters(current => ({
                        ...current,
                        [view]: undefined,
                      }))
                    }
                  >
                    <Xmark width={12} height={12} />
                  </button>
                </div>
              )}

              <ViewBody
                key={view}
                view={view}
                config={config}
                range={range}
                granularity={granularity}
                factor={factor}
                siteFactor={siteFactor}
                filter={filter}
                cardTabs={cardTabs}
                onCardTab={(cardId, tabId) =>
                  setCardTabs(current => ({ ...current, [cardId]: tabId }))
                }
                onRow={handleRow}
                tableTab={activeTableTab}
                onTableTab={tabId => setTableTabs(current => ({ ...current, [view]: tabId }))}
                chartColors={DEMO_CHART_COLORS[theme]}
                barColors={DEMO_BAR_COLORS[theme]}
              />
            </div>
          </div>

          {!hasScrolled && (
            <div className={styles.scrollHint} aria-hidden="true">
              Scroll to explore
              <span>↓</span>
            </div>
          )}
        </div>
      </div>

      <figcaption className={styles.caption}>Illustrative preview · {BRAND.name}</figcaption>
    </figure>
  );
}
