#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase 2 follow-up — legacy team / team_user / website_member drop rehearsal.
 *
 * The application no longer writes `team`, `team_user`, or `website_member`.
 * Workspace membership is the only member surface (see docs/PHASES.md, the
 * "One membership surface" changelog entry). `website_member` remains a
 * read-only fallback for websites created before the workspace migration, so
 * the tables may only be dropped once a copy of real data proves:
 *
 *   1. no website has a NULL `workspace_id`,
 *   2. every legacy `website_member` row is already covered by a membership on
 *      the owning workspace for the same user (or the website is deleted),
 *   3. every foreign key that references the three tables is known, so the
 *      final migration can drop the constraints explicitly instead of using
 *      CASCADE.
 *
 * Usage:
 *     pnpm legacy:precheck            # report counts; go/no-go verdict
 *     pnpm legacy:precheck --apply    # re-check, then empty the three tables
 *                                     # and detach the remaining FK references
 *
 * Run it against a COPY of real data first (a Neon restore branch or a local
 * restore of the production dump), never directly on production. `--apply`
 * refuses to run unless every precondition passes. The script never prints a
 * user credential: covered/uncovered rows are identified by IDs and role names
 * only, capped to a small sample.
 */
import 'dotenv/config';
import chalk from 'chalk';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const SAMPLE_LIMIT = 10;

const apply = process.argv.includes('--apply');

/** Tables whose rows may still carry a foreign key into the three legacy tables. */
const DETACH_MODELS = ['website', 'link', 'pixel', 'board', 'apiKey', 'auditEvent'] as const;

function resolveUrl() {
  const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL.');
  }
  return raw;
}

function success(message: string) {
  console.log(chalk.greenBright(`✓ ${message}`));
}

function warn(message: string) {
  console.log(chalk.yellowBright(`! ${message}`));
}

function error(message: string) {
  console.log(chalk.redBright(`✗ ${message}`));
}

async function countUndefinedTeamIds(prisma: PrismaClient) {
  const rows: Array<{ model: string; count: number }> = [];
  for (const model of DETACH_MODELS) {
    const result = await (prisma as any)[model].count({ where: { teamId: { not: null } } });
    rows.push({ model, count: result });
  }
  return rows;
}

async function main() {
  const url = new URL(resolveUrl());
  const adapter = new PrismaPg(
    { connectionString: url.toString() },
    { schema: url.searchParams.get('schema') },
  );
  const prisma = new PrismaClient({ adapter });

  try {
    const teamCount = await prisma.team.count();
    const teamUserCount = await prisma.teamUser.count();
    const websiteMemberCount = await prisma.websiteMember.count();

    console.log(`team rows:           ${teamCount}`);
    console.log(`team_user rows:      ${teamUserCount}`);
    console.log(`website_member rows: ${websiteMemberCount}`);

    let ok = true;

    // Precondition 1: every website belongs to a workspace.
    const orphanTotal = await prisma.website.count({ where: { workspaceId: null } });
    if (orphanTotal === 0) {
      success('every website has a workspace_id (no orphans)');
    } else {
      warn(`websites without a workspace_id: ${orphanTotal}`);
      const orphans = await prisma.website.findMany({
        where: { workspaceId: null },
        select: { id: true, name: true, domain: true, deletedAt: true, userId: true },
        take: SAMPLE_LIMIT,
      });
      for (const website of orphans) {
        console.log(
          `  orphan website ${website.id} "${website.name}" (${website.domain ?? 'no domain'})` +
            ` deleted=${Boolean(website.deletedAt)} owner_user=${website.userId}`,
        );
      }
      ok = false;
    }

    // Precondition 2: every legacy per-website member with a solved user is
    // covered by a workspace membership on the owning workspace, or the
    // website is deleted.
    const members = await prisma.websiteMember.findMany({
      where: {
        AND: [{ website: { workspaceId: { not: null } } }, { user: { isNot: null } }],
      },
      select: {
        id: true,
        role: true,
        userId: true,
        website: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
            workspaceId: true,
          },
        },
      },
    });

    const workspaceIds = [
      ...new Set(members.map(m => m.website.workspaceId).filter((id): id is string => Boolean(id))),
    ];
    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { workspaceId: true, userId: true },
    });
    const covered = new Set(memberships.map(m => `${m.workspaceId}:${m.userId}`));
    const uncovered = members.filter(
      m => !m.website.deletedAt && !covered.has(`${m.website.workspaceId}:${m.userId}`),
    );

    if (uncovered.length === 0) {
      success(
        members.length === 0
          ? 'no reconcilable legacy website_member rows'
          : `all ${members.length} reconcilable legacy membership rows are covered by workspace memberships (or their websites are deleted)`,
      );
    } else {
      warn(`legacy membership rows NOT covered by workspace membership: ${uncovered.length}`);
      for (const m of uncovered.slice(0, SAMPLE_LIMIT)) {
        console.log(
          `  website_member ${m.id} user=${m.userId} website="${m.website.name}"` +
            ` workspace=${m.website.workspaceId} role=${m.role}`,
        );
      }
      ok = false;
    }

    // Precondition 3: every FK referencing the legacy tables must be known so
    // the final migration can drop the constraints explicitly.
    const fks = await prisma.$queryRaw<
      Array<{
        constraint_name: string;
        from_table: string;
        from_column: string;
        to_table: string;
      }>
    >`
      SELECT
        tc.conname AS constraint_name,
        src.relname AS from_table,
        a.attname AS from_column,
        dst.relname AS to_table
      FROM pg_constraint tc
        JOIN pg_class src ON src.oid = tc.conrelid
        JOIN pg_class dst ON dst.oid = tc.confrelid
        JOIN LATERAL unnest(tc.conkey) WITH ORDINALITY ak(attnum, ord) ON TRUE
        JOIN pg_attribute a
          ON a.attrelid = tc.conrelid AND a.attnum = ak.attnum
      WHERE tc.contype = 'f'
        AND dst.relname IN ('team', 'team_user', 'website_member')
      ORDER BY dst.relname, src.relname
    `;

    if (fks.length === 0) {
      success('no foreign key references the legacy tables');
    } else {
      console.log(`foreign keys referencing the legacy tables (${fks.length}):`);
      for (const fk of fks.slice(0, 30)) {
        console.log(
          `  ${fk.constraint_name}: ${fk.from_table}.${fk.from_column} -> ${fk.to_table}`,
        );
      }
    }

    const uneededReferences = await countUndefinedTeamIds(prisma);
    let detached = 0;
    for (const row of uneededReferences) {
      if (row.count > 0) {
        console.log(`  ${row.model} rows still referencing team: ${row.count}`);
        detached += row.count;
      }
    }
    if (detached === 0) {
      success('no rows in referencing tables still carry a team_id');
    } else {
      warn(
        `${detached} rows across referencing tables still carry team_id; --apply will detach them`,
      );
    }

    if (!ok) {
      error('preconditions failed; do NOT run with --apply against this copy');
      process.exit(1);
    }

    if (teamCount + teamUserCount + websiteMemberCount === 0) {
      success('legacy tables are already empty');
    }

    if (!apply) {
      console.log(
        chalk.cyanBright(
          'Next: rerun with --apply against the rehearsal copy to empty the tables,\n' +
            'then add the final DDL migration (drop constraints + tables) in the deploy.',
        ),
      );
      return;
    }

    // Preconditions hold. Empty the child tables, detach remaining FK
    // references, then remove the team rows — inside one transaction so the
    // rehearsal copy is either modified or not at all.
    await prisma.$transaction(async tx => {
      await tx.websiteMember.deleteMany({});
      await tx.teamUser.deleteMany({});
      for (const model of DETACH_MODELS) {
        await (tx as any)[model].updateMany({
          where: { teamId: { not: null } },
          data: { teamId: null },
        });
      }
      await tx.team.deleteMany({});
    });

    success('emptied website_member, team_user; detached team references; deleted team rows');
    console.log(
      chalk.cyanBright(
        'Final step for the real migration: add a DDL migration that drops the\n' +
          'referencing constraints (list printed above), the three tables, and the\n' +
          'matching prisma models (see docs/PHASES.md item 7).',
      ),
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch(e => {
  error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
