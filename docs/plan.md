# Project plan: "Beyond Dijkstra" (working title)

*Updated 19 Oct 2026 after your answers. This is the companion to [research.md](research.md), which has the facts and sources.*

> **The assignment, verbatim:** "Prepare an interactive demo, story and presentation about the recent advances (2022-2025) around the classical Dijkstra algorithm: generalization to negative edges; faster-than-Dijkstra new algorithm."

## Status

**Complete (19 Oct 2026).** All seven stages are done and live at https://d2phdikb7jctfx.cloudfront.net. Stretch goals (compare mode, game-map mode, quizzes, quick tour, custom domain) were not built.

## Decisions so far

| Topic | Decision |
|---|---|
| Audience and use | Assessors explore the app **on their own, in their own time**. There's no live talk, so the app must explain itself. |
| Scope | **The full application**: both deep-dive algorithms, the race and a playground. |
| Deadline | About one week, so around 26 Oct 2026. |
| Stack | TypeScript, React and Vite, with the chapter text written in MDX. Alternatives are compared in §5. |
| Hosting | AWS: a private S3 bucket behind CloudFront, defined in AWS CDK (TypeScript). See §7. |
| 2026 results | One short epilogue section. *(My default. Say if you'd rather leave it out.)* |
| Look | Clean and light, with automatic dark mode. *(My default.)* |

---

## 1. What we're building

A self-guided **interactive article in chapters**, often called an "explorable explanation", hosted on the web. Think of Red Blob Games' well-known A\* pages, but for the 2022–2025 breakthroughs. Assessors open one link, follow the story chapter by chapter, and play with live demos of every algorithm along the way. A **playground** lets them try any algorithm on any graph.

The story:

> *Dijkstra's algorithm has two built-in limits: it can't handle negative edges, and it can't beat sorting. Between 2022 and 2025, researchers broke both.*

**Principles**
- **Self-explanatory.** There's no presenter, so every figure has a caption, a legend and a "Try this" prompt. Technical depth lives in optional "Deep dive" boxes, so readers who skim and readers who want the details are both served.
- **Intuition over proofs.** A formula only goes on screen if it earns its place, and every idea gets a picture.
- **Real algorithms, not canned animations.** The demos run actual implementations, so assessors can poke at them. Where we simplify, the app says so.
- **Honest.** The new algorithms are theory breakthroughs, so we show where they do and don't win.
- **Robust for strangers.** It loads fast, needs no server, works in every modern browser, and can't be broken by unusual input. Every demo has a reset button.

**Out of scope:** proofs, an optimized library, a backend, and accounts.

---

## 2. Site structure

```
Landing page    story hook, chapter map, "how to use the demos", links to Playground and About
├─ Ch 1         Dijkstra, refreshed
├─ Ch 2         Wall 1: negative edges
├─ Ch 3         Wall 2: the sorting barrier
├─ Ch 4         What it all means (+ full timeline)
├─ Playground   any graph × any algorithm
└─ About        what's simplified, sources, credits
```

- **Navigation:** a sidebar table of contents ticks off chapters as they're read (remembered in the browser). Each chapter ends with a "Next chapter →" link, and every section has its own link.
- **Routing:** hash-based URLs such as `/#/negative-edges/potentials`. Every URL is served by the same `index.html`, so CloudFront needs no rewrite rules.
- **Screens:** desktop-first, since assessors will most likely use a laptop. It also works on tablets, and on phones the panels stack under the graph.
- **Load time:** each chapter, the race and the playground load on demand, so the first page appears quickly.

---

## 3. The story: chapters, sections and figures

Each section is a few short paragraphs plus one interactive figure. ★ marks the key figures.

### Landing page
- **Hook:** "Amsterdam, 1956: a 20-minute idea." This is the café story. Shortest paths are now in every map app, router and game.
- **The two walls:** a teaser, plus a chapter map shown as cards.
- **How to use the demos:** the colour legend and the step controls, readable in 30 seconds.

### Chapter 1 · Dijkstra, refreshed
| § | Content | Figure |
|---|---|---|
| 1.1 | How Dijkstra works | ★ Step through Dijkstra on about 8 vertices: settled set, frontier panel, tentative distances, highlighted pseudocode |
| 1.2 | Observation 1: **"once settled, never changes"**, which only holds without negative edges | A callout on the same figure (sets up Ch. 2) |
| 1.3 | Observation 2: **"vertices come out in sorted order"** | A distance line that fills up from left to right (sets up Ch. 3) |

### Chapter 2 · Wall 1: negative edges
| § | Content | Figure |
|---|---|---|
| 2.1 | Why negative weights? Money, energy, and a game map with healing springs. A negative cycle is an infinite-farming exploit. | Small illustrated graphs |
| 2.2 | Dijkstra breaks | ★ The same stepper on a graph with one negative edge. The wrong answer is flagged next to the truth. |
| 2.3 | Bellman–Ford: correct but slow | Round-by-round relaxation, a work counter, and a negative-cycle mode |
| 2.4 | Potentials ("heights"), and why A\* uses the same trick | ★ A drag-the-heights puzzle: make every edge ≥ 0 while the shortest paths stay the same |
| 2.5 | The hybrid engine | Dijkstra passes plus Bellman–Ford passes. The number of rounds equals η. Compares a graph with η = 1 against one with η = 6. |
| 2.6 | The 2022 breakthrough (BNW) | ★ A guided walkthrough on about 25 vertices: scaling → clusters → recurse → fix the DAG → clean up → Dijkstra. You can scrub through the phases and "re-roll the randomness". |
| 2.7 | What happened next | A timeline of results for integer and real weights, including 2026 |
| Deep dive | ScaleDown pseudocode, LDD guarantees, running times | — |

### Chapter 3 · Wall 2: the sorting barrier
| § | Content | Figure |
|---|---|---|
| 3.1 | Dijkstra is a sorting machine | Type in numbers, and a star graph sorts them |
| 3.2 | The 2024 twist: Dijkstra is universally optimal *if you need the order* | Narrative with a small illustration |
| 3.3 | The frontier problem | A chart of queue size over time |
| 3.4 | Shrinking the frontier: FindPivots | ★ k Bellman–Ford rounds, the shortest-path forests, and the pivots |
| 3.5 | Divide and conquer by distance: BMSSP | ★ A distance-band view, the recursion tree, and batches pulled from the partial-sort structure |
| 3.6 | The race: theory vs practice | ★ A live benchmark in a background thread, with our reference results shown for comparison |
| 3.7 | Epilogue: 2026 | Narrative |
| Deep dive | The paper's pseudocode (FindPivots, BaseCase, BMSSP, the data structure), the parameter choices, and where log^(2/3) comes from | — |

### Chapter 4 · What it all means
| § | Content | Figure |
|---|---|---|
| 4.1 | The full 2022–2026 timeline | Clickable timeline |
| 4.2 | Theory vs practice, why A\* still rules in games, and the ideas worth reusing | Narrative |
| 4.3 | Open problems and further reading | Links |

### Playground (now a core feature)
Pick a preset or a random graph, or draw your own: click to add vertices, drag between them to connect, and click an edge to edit its weight. Choose an algorithm, then step through it or play it, and check the result against the ground truth. Graphs can be imported and exported as JSON.

### Stretch goals (only if we're ahead of schedule)
- Compare mode: two algorithms side by side.
- Game-map mode: a grid with one-way slides and healing tiles.
- "Predict the next step" mini-quizzes inside the figures.
- Quick tour: a 5-minute path through just the ★ figures.
- A custom domain.

---

## 4. Interactive building blocks

Each component is built once and reused in every figure.

| Component | What it does |
|---|---|
| **Figure frame** | Title, caption, legend popover, "Try this" prompt and reset button |
| **GraphView** | Draws vertices and edges in SVG, with state colours, distance labels, edge weights and highlights. Supports hand-made layouts and automatic layout. |
| **Step player** | Play/pause, step forward and back, speed, a scrubber and reset, with keyboard shortcuts while the figure has focus |
| **Pseudocode panel** | The algorithm's lines, with the current one highlighted |
| **State panels** | Priority queue or frontier contents, a distance table, pivots, and the recursion stack |
| **Distance line** | A one-dimensional number line with each vertex placed at its distance. It shows sorted versus unsorted at a glance: Dijkstra sweeps it, while BMSSP works band by band. |
| **Counters** | Relaxations, comparisons, queue operations and rounds |
| **Potential editor** | Draggable vertex heights, with edge labels showing w → w′ |
| **Cluster overlay** | Coloured hulls around LDD clusters, with cut edges drawn dashed |
| **Recursion tree** | The BMSSP or ScaleDown call tree, linked to the highlighting in the graph |
| **Race chart** | Time and operation counts against n on a log scale, with the theory curves overlaid |
| **Glossary tooltip** | Hover or tap a term to see its plain-language definition |
| **Deep-dive box** | A collapsible block for the technical details |

**Visual language.** These rules hold everywhere. The palette is colour-blind-safe, and colour is never the only cue.
- Unvisited vertices are grey. Frontier vertices have an amber ring. Settled vertices are solid blue. The current vertex pulses.
- Negative edges are red with a minus label. Shortest-path-tree edges are bold.
- Wrong answers get a red "should be X" badge. Pivots get a star badge.

---

## 5. Tech stack

### Is React + Vite still the right choice for a web-hosted app?

Yes. Hosting doesn't change the answer, because this app is **completely static**: the build is a folder of HTML, JS and CSS files that S3 serves as they are. What matters is how well each option suits an app made mostly of demos.

| Option | Verdict |
|---|---|
| **React + Vite (+ MDX)** | ✅ **Chosen.** It produces the simplest possible output (one `index.html` plus hashed assets) and fits an app with many interactive figures best. You already know it. With MDX, the chapter text lives in Markdown files with the demos dropped in as components, so you can edit the text easily. |
| Astro + React islands | Excellent for text-heavy sites, because pages ship as static HTML and appear fast. Most of this app is demos, though. Astro's "islands" make it awkward for several figures to share one graph, and its sub-pages would need a CloudFront Function for `index.html` rewrites. Not worth it here. |
| SvelteKit (static) | Less boilerplate and nice built-in transitions, but it's new to you and gives no hosting advantage. |
| Next.js (static export) | Designed around servers. Its static export works, but it adds complexity for no benefit. |

### The stack

| Piece | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Build and dev server | Vite |
| UI | React, with chapter content in **MDX** |
| Routing | Hash router (no server rewrites needed) |
| Graphics | SVG for graphs and charts, Canvas only if a large view needs it |
| Styling | CSS modules and CSS variables (light/dark themes, colour-blind-safe palette) |
| Heavy work | A Web Worker for the race |
| Tests | Vitest and fast-check for property tests against the ground truth, plus Playwright smoke tests that open every page and run every demo |
| Infrastructure | AWS CDK in TypeScript |

Your machine already has Node 24, npm 11, git and AWS CLI v2. CDK will be a project dependency, so nothing needs a global install.

---

## 6. Architecture

The algorithms know nothing about the UI. Each one takes an optional `emit` callback and reports what it does as **trace events**. A figure records the events once and then replays them, which makes stepping *backwards* easy. Without the callback, the same code runs at full speed for the race.

```ts
// core/trace.ts (sketch)
type TraceEvent =
  | { kind: 'relax'; edge: EdgeId; newDist: number; improved: boolean }
  | { kind: 'settle'; v: VertexId; dist: number }
  | { kind: 'queue'; op: 'push' | 'pop' | 'decrease'; v: VertexId; key: number }
  | { kind: 'line'; id: string }                 // highlight a pseudocode line
  | { kind: 'phase'; label: string }             // caption: "Round 3", "Phase 2: fix DAG edges"
  | { kind: 'potential'; v: VertexId; value: number }
  | { kind: 'clusters'; clusters: VertexId[][]; cut: EdgeId[] }
  | { kind: 'pivots'; pivots: VertexId[]; forest: EdgeId[] }
  | { kind: 'call'; fn: string; level: number; bound: number; sources: VertexId[] }
  | { kind: 'return'; fn: string; level: number; newBound: number; completed: VertexId[] };

// core/algorithms/dijkstra.ts
export function dijkstra(g: Graph, s: VertexId, emit?: (e: TraceEvent) => void): SsspResult
```

```
/                         the web app (Vite)
  src/
    core/                 pure TypeScript, no UI, fully unit-tested
      graph.ts  generators.ts  trace.ts
      algorithms/
        dijkstra.ts  bellmanFord.ts  johnson.ts  hybrid.ts
        bnw/              ldd.ts  scaleDown.ts  fixDag.ts  index.ts
        bmssp/            findPivots.ts  baseCase.ts  blockList.ts  index.ts
    viz/                  GraphView, Player, PseudocodePanel, DistanceLine, panels, charts
    content/              chapters as MDX (prose + figure components)
    site/                 layout, sidebar, router, glossary, landing and About pages
    bench/                race worker + UI
    playground/           editor + runner
  tests/                  unit and property tests;  e2e/  Playwright smoke tests
infra/                    AWS CDK app (S3 + CloudFront), with its own package.json
docs/                     research.md, plan.md
```

---

## 7. Hosting on AWS

```
Visitor ──HTTPS──▶ CloudFront   (edge cache, HTTPS, compression, security headers)
                        │ Origin Access Control (signed requests)
                        ▼
                  S3 bucket     (private, all public access blocked)
```

- **S3 bucket:** private and encrypted, with all public access blocked. Only CloudFront can read it, through **Origin Access Control (OAC)**, which is AWS's current recommended setup.
- **CloudFront:**
  - HTTPS only, with HTTP redirected to HTTPS.
  - HTTP/2 and HTTP/3, plus compression.
  - `index.html` as the default root object.
  - AWS's managed security-headers policy.
  - Price class 100 (edge locations in Europe and North America). It's the cheapest option, and visitors elsewhere are still served, just from further away.
- **Caching:** Vite gives built files hashed names like `assets/index-3f9a1c.js`. Those are cached for a year, since their names change whenever their content changes. `index.html` is never cached, so every deploy shows up straight away, and the deploy also clears CloudFront's cache.
- **Deploying:** a single `npm run deploy` builds the app and runs `cdk deploy`. That uploads the build, sets the cache headers, clears the cache, and prints the site's URL (`https://dxxxx.cloudfront.net`).
- **One-time setup:** `cdk bootstrap` for your `default` profile in `us-east-1`, which creates CDK's small toolkit stack in the account. I'll ask before running it, and before the first deploy.
- **Custom domain (optional):** with a domain in Route 53, this means an ACM certificate (which must be in us-east-1, your region already) and an alias record. That's about 15 lines of CDK.
- **Cost:** effectively $0. The CloudFront free tier covers 1 TB a month, and the site is a few MB.
- **Teardown:** after the assessment, `cdk destroy` removes everything.
- **No CI pipeline** for a one-week project. A GitHub Actions deploy could be added later if you want one.

---

## 8. Faithfulness: what's exact and what's simplified

| Algorithm | Plan |
|---|---|
| Dijkstra, Bellman–Ford, Johnson, the hybrid (ElimNeg) | Exact, textbook-faithful implementations. |
| BMSSP (2025) | Follows the paper's three procedures (FindPivots, BaseCase, BMSSP) and its data structure's operations (Insert, BatchPrepend, Pull). Ties are broken the way the paper does. The internals are simpler: sorting replaces linear-time median selection, and a plain sorted structure replaces the balanced tree. The behaviour is the same, with slightly worse constants. The demo parameters k and t are adjustable. The constant-degree transformation is off by default because it clutters the picture, and a side note explains it. |
| BNW (2022) | Keeps the real structure: scaling → ScaleDown (LDD → recurse → fix the DAG → ElimNeg) → Dijkstra. Constants are tuned down so it does something interesting on 20–40 vertices. Negative cycles are detected and shown. The LDD is a simplified random ball-carving that keeps the key property: tight clusters and few cut edges. |

Every simplified figure gets a short **"What's simplified here?"** note. Every algorithm is tested against Bellman–Ford or Dijkstra on thousands of random graphs, including graphs with negative cycles.

---

## 9. Stages

The work is split into seven stages. The deadline is about a week away, but the aim is to finish sooner, so stages aren't tied to calendar days. Each stage ends with a commit (named "Stage N: …") and a working, deployed site, so there's always something to show. Hosting goes live in Stage 1, which gets the AWS risk out of the way early.

| Stage | Focus | Done when |
|---|---|---|
| 1 | **Foundations.** Project scaffold (Vite, React, TypeScript, MDX, linting, Vitest) under git. The graph model, trace recording and replay. Dijkstra and Bellman–Ford with property tests. The CDK stack and a first deploy. | A placeholder site is live on its CloudFront URL, and the core tests pass |
| 2 | **Visualization core and site shell.** GraphView, the step player, the pseudocode and state panels, and the distance line. The landing page, chapter layout, sidebar, routing and glossary tooltips. All of **Chapter 1**. | Chapter 1 is complete and live |
| 3 | **Chapter 2, part 1.** Dijkstra failing, Bellman–Ford and negative cycles, the potentials puzzle, Johnson, and the hybrid with η. | Sections 2.1–2.5 are live |
| 4 | **Chapter 2, part 2.** BNW: LDD, ScaleDown, the DAG fix and scaling, with the cluster overlay, the recursion tree and the timeline. | Chapter 2 is complete |
| 5 | **Chapter 3.** The sorting demo, the frontier chart, FindPivots, and BMSSP with its data structure, band view and recursion view, plus tests of the paper's invariants. | Sections 3.1–3.5 are live |
| 6 | **Race, wrap-up and playground.** The benchmark worker, charts and reference results. The epilogue, Chapter 4 and the About page. The playground with its basic editor. | The site is feature-complete and live |
| 7 | **Polish and ship.** An accuracy and copy pass, responsive and cross-browser checks, accessibility, Playwright smoke tests, performance work, and the final deploy. | Done, with some buffer left |

**If a stage overruns:** stages 4 and 5 (BNW and BMSSP) carry the most risk, and each is timeboxed. If one overruns, its walkthrough falls back to a scripted example and the general version waits until after Stage 7. Stretch goals only start once Stage 7's list is done.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| BNW and BMSSP are intricate, so subtle bugs are likely | Build from the papers' pseudocode with line references. Property-test against Bellman–Ford on thousands of random graphs, and check the papers' invariants in tests (for example, \|pivots\| ≤ \|W\|/k). |
| Assessors try unusual inputs | Validate playground input, cap graph sizes, show friendly messages for negative cycles and unreachable vertices, and give every figure a reset |
| The race is slow or freezes on a weak laptop | Run it in a worker with progress and a cancel button, keep the default sizes modest, and show our reference results alongside |
| The paper's parameters do nothing interesting on graphs that fit on a screen | Expose demo parameters, clearly labelled as such |
| Visual overload on medium-sized graphs | Hand-made layouts in the chapters, random graphs only in the race and the playground, and dim everything outside the focus |
| A first-time AWS deploy hits snags | Deploy in Stage 1, before there's anything to lose |
| The one-week timeline | Deploy after every stage, timebox the risky stages, and keep the fallback ready |

---

## 11. Settled details

- **AWS:** the `default` profile in `us-east-1`. CDK needs a one-time `cdk bootstrap` there, which runs with your OK.
- **Domain:** the `*.cloudfront.net` URL. A custom domain can be added later.
- **Git:** commits at the end of each stage, pushed to `git@github.com:Voltfest42/Beyond-Dijkstra.git`.
- **Name:** "Beyond Dijkstra" is still a working title. Say if you'd like something else.
