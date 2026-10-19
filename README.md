# Beyond Dijkstra

An interactive story about the 2022–2025 breakthroughs around Dijkstra's shortest-path algorithm: handling **negative edges** in near-linear time, and **beating the sorting barrier** on directed graphs. Every idea comes with a live, step-through demo.

**Live site:** https://d2phdikb7jctfx.cloudfront.net

- [docs/research.md](docs/research.md): the research behind the story, with sources
- [docs/plan.md](docs/plan.md): the project plan, the stages and the architecture

## Development

Requires Node 20.19 or later (developed on Node 24).

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
npm test           # unit + property tests
npm run lint
npm run build      # type-check and build to dist/
```

## Layout

```
src/core/      algorithms and data structures (pure TypeScript, no UI)
src/viz/       reusable visual pieces: graph view, step player, panels, distance line
src/figures/   the interactive figures used in the chapters
src/site/      site shell: routing, sidebar, pages, glossary, reading progress
src/content/   chapter text (MDX)
tests/         unit and property tests (every algorithm vs. an independent reference)
infra/         AWS CDK app: private S3 bucket + CloudFront
docs/          research notes and plan
```

## Deploying

The site is static. It is served from a private S3 bucket through CloudFront (Origin Access Control), defined in `infra/` with AWS CDK.

```bash
npm install --prefix infra   # once
npm run deploy               # build, upload, invalidate the CloudFront cache
```

`npm run deploy` uses the active AWS CLI profile. To remove everything, run `npm --prefix infra run destroy`.
