# Tartly

面向开发者与独立 SaaS 创始人的收入优先产品分析。连接网站与支付渠道，查看哪些渠道、活动和页面真正带来收入。

Tartly 是基于 MIT 许可的 [Talivia](https://github.com/talivia-group/talivia) 分析引擎构建的托管多租户分支。追踪脚本、数据采集、会话回放、归因和支付集成均保留；工作区、套餐和产品界面面向托管 SaaS 重构。

完整说明请阅读 [English README](./README.md)。

## 套餐

仅有两个套餐，无免费版：

| 套餐    | 月付   | 网站数  |
| ------- | ------ | ------- |
| Starter | $7.99  | 1       |
| Pro     | $14.99 | 最多 20 |

套餐定义位于 `src/lib/plans.ts`。

## 本地开发

要求 Node.js 22 LTS 或 24 LTS、pnpm 10+、PostgreSQL。

```bash
cp .env.example .env
openssl rand -hex 32
```

将生成的值填入 `APP_SECRET`，然后：

```bash
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm dev
```

打开 `http://localhost:3000`，在 `/signup` 创建账户。没有默认账户或默认密码。

```bash
pnpm lint
pnpm test
pnpm build
```

也可以只启动 PostgreSQL：

```bash
docker compose up -d postgres
```

## 文档

- `docs/PHASES.md` — 当前阶段与剩余工作。
- `docs/UI_DESIGN_SYSTEM.md` — 设计语言与源码结构。
- `docs/TENANCY.md` — 工作区隔离规则。
- `docs/PRICING_ECONOMICS.md` — 套餐、成本与毛利模型。
- `docs/ENVIRONMENT.md` — 本地、Neon 与生产环境配置。

## 许可

Tartly 使用 MIT 许可证。原始 Talivia 版权声明保留在 `LICENSE` 中，依赖与资源声明见 `THIRD_PARTY_NOTICES.md`。Tartly 与 Talivia 无关联，也未获得其背书。
