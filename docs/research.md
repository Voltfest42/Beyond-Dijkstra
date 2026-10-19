# Research brief: shortest paths beyond Dijkstra

*Compiled 19 Oct 2026 as reference material for this project. Every result below was checked against the paper's own abstract. Links are in [Sources](#sources).*

## TL;DR

Dijkstra's algorithm (1956) has two built-in limits. Both were broken between 2022 and 2025, and those two breakthroughs are what the task asks about.

| | The limit | The breakthrough |
|---|---|---|
| **A** | **Negative edges.** Dijkstra gives wrong answers when some edges have negative weight. The safe fallback, Bellman–Ford, is far slower. | **2022:** Bernstein, Nanongkai and Wulff-Nilsen handle negative integer weights in *near-linear* time, almost as fast as Dijkstra. Best Paper, FOCS 2022. |
| **B** | **The sorting barrier.** Dijkstra finishes vertices in order of distance, so it can never be faster than sorting them (about n log n). | **2025:** Duan, Mao, Mao, Shu and Yin compute the distances *without* sorting them all, in O(m log^(2/3) n) time. This is the first algorithm to beat Dijkstra on sparse directed graphs. Best Paper, STOC 2025. |

**The twist (2024):** Haeupler, Hladík, Rozhoň, Tarjan and Tětek proved that Dijkstra *is* the best possible algorithm **if you need the vertices in distance order** (Best Paper, FOCS 2024). The 2025 algorithm wins by not producing that order.

**Reality check:** these are theory results. The best published implementation of the 2025 algorithm is still 3–4× *slower* than Dijkstra on real graphs of up to 10 million vertices. The negative-weight line looks more practical: an engineered implementation beats the classic method by up to almost 100× on hard inputs.

**Since then (2026, beyond the brief):** both stories kept moving. The sorting-barrier bound dropped again, to O(m √(log n · log log n)) (ICALP 2026). A July 2026 preprint titled *"Bellman-Ford in Almost-Linear Time"* claims almost-linear time for negative **real** weights. Both are worth a short epilogue slide.

---

## 1. Background in two minutes

- **Graph:** *n* vertices (nodes) and *m* edges. Each edge has a weight (length, cost or time). *Directed* means the edges are one-way.
- **Single-source shortest paths (SSSP):** from one start vertex *s*, find the shortest distance to every other vertex. All the papers here solve this problem.
- **Relaxing an edge u→v:** "if going through *u* gives a shorter route to *v*, update *v*'s distance." Every algorithm here is a clever *schedule* of relaxations.
- **O-notation:** how the work grows with the size of the graph. O(m) means each edge is touched a constant number of times. That is the dream, because you have to read the graph at least once. "Near-linear" means O(m × a few log factors). "Almost-linear", written m^(1+o(1)), is slightly worse than near-linear.
- **A feel for the numbers:** for a million vertices, log₂ n ≈ 20 and log^(2/3) n ≈ 7.4, while O(mn) is a *million* times m.

| | Dijkstra (1956, published 1959) | Bellman–Ford (1955–58) |
|---|---|---|
| Idea | Greedy: always finalize the closest unfinished vertex | Brute force: relax *every* edge, and repeat that n−1 times |
| Time | O(m + n log n) with a Fibonacci heap (1984) | O(mn) |
| Negative edges | ❌ wrong answers | ✅ works, and detects negative cycles |
| Finishes vertices… | in sorted order of distance | in no particular order |

> **Intro hook:** Dijkstra designed the algorithm in about twenty minutes, without pencil and paper, on a café terrace in Amsterdam in 1956. He needed a demo for the new ARMAC computer, so he used a map of 64 Dutch cities. (Frana & Misa, *An Interview with Edsger W. Dijkstra*, CACM 2010.)

---

## 2. Storyline A: negative edges

### 2.1 Why would an edge be negative?

- **Money:** fees versus rewards. In currency exchange, where each edge weight is −log(rate), a negative cycle is an arbitrage loop.
- **Energy:** an electric car *gains* charge going downhill (regenerative braking).
- **Games:** a route costs stamina but passes a healing spring, or a quest path *earns* gold. A **negative cycle** is an infinite-farming exploit.
- **Under the hood:** negative-weight SSSP is a building block for min-cost flow and for scheduling with constraints like "A starts at least 3 min after B".

With a negative cycle, "shortest" stops making sense, because you can loop forever and keep getting cheaper. Algorithms must **detect and report** negative cycles.

### 2.2 Why Dijkstra breaks

Dijkstra finalizes a vertex as soon as it is the closest unfinished one, on the assumption that nothing found later can make it cheaper. A negative edge found later can.

*Mini example (demo material):* edges s→a (2), s→b (5), b→a (−4), a→c (1). Dijkstra finalizes **a = 2** and **c = 3**. The true distances are **a = 1** (s→b→a = 5 − 4) and **c = 2**.

### 2.3 Bellman–Ford: correct but slow

Relax all m edges, n−1 times. After round *i*, every vertex whose shortest path uses at most *i* edges has the right distance. If anything still improves in round *n*, there is a negative cycle. This costs O(mn). For arbitrary *real* weights, nobody beat it for about 65 years, until Fineman in 2024.

### 2.4 The key tool: potentials (also called prices)

Give every vertex a number φ(v), and rewrite each edge weight as

```
w'(u→v) = w(u→v) + φ(u) − φ(v)
```

Along any path from s to t, the middle terms cancel. So **every s→t path changes by the same amount**, φ(s) − φ(t). The shortest path stays the shortest, and cycles don't change at all. If you can find a φ that makes **every edge non-negative**, plain Dijkstra works. This is Johnson's trick (1977).

> **Game-dev hook: this is A\*.** A\* is exactly Dijkstra on edges reweighted by the heuristic *h* (take φ = −h). A *consistent* heuristic is precisely one that makes every reweighted edge non-negative.

**The catch:** the perfect potential is the true distance, φ(v) = dist(s, v). That is the thing we're trying to compute, so we have a chicken-and-egg problem. The breakthroughs are about finding *good-enough* potentials cheaply.

### 2.5 The state of the art before 2022

- **Scaling algorithms** by Gabow–Tarjan (1989) and Goldberg (1995) ran in about O(m √n log W) for integer weights ≥ −W. For "combinatorial" algorithms (plain graph techniques), that stood for more than 30 years.
- **2020:** improvements using continuous optimization (interior-point methods). These were powerful, but very complex.

### 2.6 The 2022 breakthrough: Bernstein–Nanongkai–Wulff-Nilsen (BNW)

**Result:** O(m log⁸ n · log W) for integer weights ≥ −W. The algorithm is randomized, and it finds a negative cycle if one exists. It shared the FOCS 2022 Best Paper award with Chen–Kyng–Liu–Peng–Probst Gutenberg–Sachdeva's almost-linear min-cost-flow algorithm. Min-cost flow includes negative-weight SSSP, so that algorithm also solves it, but it relies on heavy continuous-optimization machinery. BNW's surprise is that it needs only **elementary combinatorial tools**: decompositions, Dijkstra, Bellman–Ford and potentials.

**How it works, in plain terms:**

1. **The hybrid engine (ElimNeg).** Alternate a *Dijkstra pass* over the non-negative edges with *one Bellman–Ford pass* over the negative edges, until nothing changes. This takes about η + 1 rounds, where η is the largest number of negative edges on any shortest path. So it is fast when shortest paths contain few negative edges. **The whole algorithm is a way to make η small.**
2. **Scaling.** Handle the size of the weights one bit at a time. First find a potential that makes every edge ≥ −B/2, then one that makes every edge ≥ −B/4, and so on, for about log W rounds. Each round is one call to **ScaleDown**.
3. **ScaleDown** is the recursive heart. It has four phases:
   - **Phase 0: cluster (low-diameter decomposition, LDD).** Randomly carve the graph into tight clusters, where every vertex in a cluster is close to every other, while cutting only a few edges. This works by growing "balls" with *random* radii, so any given edge is unlikely to be cut.
   - **Phase 1: recurse inside the clusters.** Inside a tight cluster, a shortest path *can't* use many negative edges. If it did, you could walk back to the start cheaply and get a negative cycle. So the inner problem is easier (η halves), and recursion handles it.
   - **Phase 2: fix the edges between clusters.** The clusters form a DAG (no cycles between them), so one sweep in topological order fixes those edges with a potential.
   - **Phase 3: clean up.** Only the cut edges can still be negative. Because the cuts were random, few of them lie on any shortest path, so ElimNeg finishes cheaply.
4. **Finish.** Once every edge is non-negative under the combined potential, run ordinary Dijkstra.

### 2.7 Follow-ups

**Integer weights**
- **Bringmann–Cassis–Fischer, FOCS 2023, "…Now Faster!":** O(m log² n · log(nW) · log log n), almost six log factors faster.
- **Li–Mowry–Rao, SODA 2026:** O((m + n log log n) · log(nW) · log n · log log n), using a faster directed LDD.
- **In practice:** Cassis–Karrenbauer–Nusser–Rinaldi (2025) engineered the BCF algorithm. On the hardest instance type, it is up to almost 100× faster than the classic Goldberg–Radzik method. *This line of work shows real practical promise.*

**Real-valued weights.** This variant is harder, because the running time may not depend on how big the numbers are (no log W).
- **Fineman, STOC 2024:** Õ(m n^(8/9)), the first asymptotic improvement over Bellman–Ford's O(mn) for real weights.
- **Huang–Jin–Quanrud:** Õ(m n^(4/5)) at SODA 2025, then Õ(m n^(3/4) + m^(4/5) n) at SODA 2026.
- **Li–Li–Rao–Zhang** (preprint, Nov 2025): O(n^2.5 log^4.5 n), using "shortcutting". **Khanna–Song** (preprint, Feb 2026): n^(2+o(1)), almost linear for dense graphs.
- **Hair–G. Li–J. Li–Zhang, "Bellman-Ford in Almost-Linear Time"** (preprint, July 2026): m^(1+o(1)). If it holds up, the real-weight case is essentially settled too. It is a preprint, so present it as a claim.

(Õ means "ignoring polylog factors".)

---

## 3. Storyline B: the sorting barrier

### 3.1 Dijkstra is secretly a sorting algorithm

Dijkstra finalizes vertices in increasing order of distance. To sort a list of numbers, build a star graph: a source with one edge to each leaf, weighted by the numbers to sort. Dijkstra outputs them **sorted**. Comparison-based sorting needs about n log n comparisons, so any algorithm that outputs vertices in distance order needs about n log n time. This is the **sorting barrier**. Dijkstra with a Fibonacci heap (Fredman–Tarjan, 1984) runs in O(m + n log n), right at the barrier.

**Fine print** (people may ask): the barrier is about the **comparison-addition model**, where weights are arbitrary real numbers and the algorithm may only add and compare them. With *integer* weights and bit tricks, the barrier was beaten long ago: Thorup 1999 (undirected, linear time) and Thorup 2003/04 (directed, O(m + n log log n)). The open question was general real weights.

### 3.2 2023: the first crack, for undirected graphs

**Duan–Mao–Shu–Yin, FOCS 2023:** O(m √(log n · log log n)), randomized, for **undirected** real-weighted graphs.

### 3.3 2024: the twist. Dijkstra is "universally optimal"

**Haeupler–Hladík–Rozhoň–Tarjan–Tětek, FOCS 2024 Best Paper.** They give Dijkstra a new heap with a *working-set property*: items inserted recently are cheap to extract. With that heap, Dijkstra is optimal **on every individual graph** (for worst-case weights), not just on the worst graph overall. The problem it is optimal for is **distance ordering**: listing the vertices in order of distance. Quanta covered it as "Computer Scientists Establish the Best Way to Traverse a Graph" (Oct 2024). A simpler proof followed in 2025 (van der Hoog–Rotenberg–Rutschmann, ESA 2025).

**Consequence:** if you *need* the sorted order, you can't beat Dijkstra. To go faster, you must compute distances **without fully sorting them**.

### 3.4 The 2025 breakthrough: Duan–Mao–Mao–Shu–Yin, "Breaking the Sorting Barrier"

**Result:** a deterministic O(m log^(2/3) n) algorithm for **directed** graphs with real non-negative weights. It is the first algorithm to beat Dijkstra's O(m + n log n) on sparse graphs. Best Paper, STOC 2025.

**How it works, in plain terms:**

- **Dijkstra's bottleneck is its frontier**, the priority queue of discovered-but-unfinished vertices. The frontier can hold a large share of the graph, and keeping it sorted costs about log n per vertex.
- **Idea 1: shrink the frontier with a little Bellman–Ford (FindPivots).** From the current frontier *S*, run just *k* rounds of Bellman–Ford. Every vertex whose shortest path from the frontier has fewer than *k* edges is now finished, with no sorting at all. Next, look at the shortest-path trees hanging off the frontier vertices. Only the roots of *big* trees (≥ k vertices) need to stay in the sorted structure. These roots are the **pivots**. Each pivot "pays for" at least k finished vertices, so at most about 1 in k vertices ever needs sorting.
- **Idea 2: divide and conquer by distance (BMSSP, "Bounded Multi-Source Shortest Paths").** Instead of one global queue, split the distance range into bands and solve each band recursively. A special block-based data structure hands out the next batch of the smallest frontier vertices (*Pull*) without fully sorting the rest. It can also take new items at the front in bulk (*BatchPrepend*). The recursion is about log^(1/3) n levels deep, and the bottom level is a tiny Dijkstra that stops after k + 1 vertices.
- **Tuning:** k = ⌊log^(1/3) n⌋ and t = ⌊log^(2/3) n⌋. Each level of recursion works on batches about 2^t times smaller. The costs balance out to O(m log^(2/3) n).
- **Analogy:** Dijkstra keeps every waiting customer in one perfectly sorted line. The new algorithm only sorts the group *leaders* (pivots), serves each leader's followers with a quick sweep, and handles the line in batches.

> **Demo caveat:** with the paper's formulas, k is just 1–2 for any graph that fits on a screen, so nothing interesting happens. The demo should let you set k and t by hand, labelled as "demo parameters".

### 3.5 Reality check

**Castro–Clementino–de Freitas** (arXiv 2511.03007, 2025–26) built a careful C++ implementation and tested it on random graphs, grids and US road networks of up to 10 million vertices. It behaves as the theory predicts, but **Dijkstra stays 3–4× faster in every test**. They estimate that the worst-case version would only win on graphs with vastly more than **10^67 vertices**. This is a landmark for *theory*, not a replacement in practice. In practical routing (map apps, games), preprocessing such as contraction hierarchies and goal-directed search such as A\* matter far more.

### 3.6 Epilogue (2026)

- **Duan–Mao–Shu–Yin, ICALP 2026:** O(m √(log n) + √(mn log n log log n)), which is O(m √(log n · log log n)) on sparse directed graphs.
- **Kadria–Roditty** (preprint, Sept 2026): another small improvement for undirected graphs.

---

## 4. Timeline

**Bold** rows are the core of the task.

| Year | What | Who | Venue | Running time |
|---|---|---|---|---|
| 1955–58 | Bellman–Ford | Shimbel; Ford; Moore; Bellman | — | O(mn), negative weights OK |
| 1956/59 | Dijkstra's algorithm | Dijkstra | Numer. Math. 1959 | O(n²) originally |
| 1977 | Reweighting with potentials | Johnson | JACM | — |
| 1984 | Fibonacci heaps | Fredman, Tarjan | FOCS '84 / JACM '87 | Dijkstra in O(m + n log n) |
| 1989–95 | Scaling algorithms | Gabow–Tarjan; Goldberg | SICOMP | O(m √n log W) |
| 1999 | Linear time for undirected integer weights | Thorup | JACM | O(m) |
| **2022** | **Negative weights, near-linear time** | **Bernstein, Nanongkai, Wulff-Nilsen** | **FOCS '22 Best Paper** | **O(m log⁸ n log W)** |
| 2022 | Max-flow and min-cost flow, almost-linear time | Chen, Kyng, Liu, Peng, Probst Gutenberg, Sachdeva | FOCS '22 Best Paper | m^(1+o(1)) |
| 2023 | Negative weights, "Now Faster!" | Bringmann, Cassis, Fischer | FOCS '23 | O(m log² n log(nW) log log n) |
| 2023 | Sorting barrier broken, undirected | Duan, Mao, Shu, Yin | FOCS '23 | O(m √(log n log log n)) |
| 2024 | First to beat Bellman–Ford for real weights | Fineman | STOC '24 | Õ(m n^(8/9)) |
| **2024** | **Dijkstra is universally optimal (for distance ordering)** | **Haeupler, Hladík, Rozhoň, Tarjan, Tětek** | **FOCS '24 Best Paper** | — |
| 2025 | Real weights, faster | Huang, Jin, Quanrud | SODA '25 | Õ(m n^(4/5)) |
| **2025** | **Sorting barrier broken, directed** | **Duan, Mao, Mao, Shu, Yin** | **STOC '25 Best Paper** | **O(m log^(2/3) n)** |
| 2025 | Engineering the BCF algorithm | Cassis, Karrenbauer, Nusser, Rinaldi | arXiv | up to almost 100× faster than Goldberg–Radzik |
| 2025–26 | Benchmarking the 2025 algorithm | Castro, Clementino, de Freitas | arXiv | Dijkstra still 3–4× faster |
| 2026 | Faster directed SSSP | Duan, Mao, Shu, Yin | ICALP '26 | O(m √(log n log log n)) on sparse graphs |
| 2026 | Negative integer weights, faster LDD | Li, Mowry, Rao | SODA '26 | O((m + n log log n) log(nW) log n log log n) |
| 2026 | Real weights, faster | Huang, Jin, Quanrud | SODA '26 | Õ(m n^(3/4) + m^(4/5) n) |
| 2026 | "Bellman-Ford in Almost-Linear Time" | Hair, G. Li, J. Li, Zhang | arXiv preprint | m^(1+o(1)) |

---

## 5. Glossary

- **Vertex (node), edge, weight:** the points, the connections between them, and the cost of a connection.
- **Directed graph:** a graph whose edges are one-way.
- **SSSP:** single-source shortest paths, the distances from one start vertex to all others.
- **Relax (an edge):** try to improve a distance estimate by going through that edge.
- **Settled / complete:** a vertex whose distance is final.
- **Frontier:** the vertices that have been discovered but not yet settled. In Dijkstra, this is the priority queue.
- **Priority queue / heap:** a data structure that always hands you the smallest item. Dijkstra's speed depends on it.
- **Negative cycle:** a loop with total weight below 0. Shortest paths are then undefined, so an algorithm must report the cycle.
- **Potential / price function (φ):** a number per vertex, used to reweight edges without changing which paths are shortest.
- **η (eta):** the number of negative edges on a shortest path. When η is small, the hybrid algorithm is fast.
- **Low-diameter decomposition (LDD):** cutting a graph into tight clusters while removing few edges.
- **Pivot:** in the 2025 algorithm, a frontier vertex that roots a big shortest-path subtree and so must stay in the sorted structure.
- **Comparison-addition model:** weights are real numbers, and the algorithm may only add and compare them. The sorting barrier is a statement about this model.
- **Randomized / deterministic:** whether the algorithm flips coins. BNW is randomized; the 2025 sorting-barrier algorithm is deterministic.
- **Near-linear / almost-linear:** m × polylog(n), versus m^(1+o(1)).
- **Sparse graph:** a graph where m is close to n, like road networks and game maps. This is where the 2025 result beats Dijkstra.

---

## 6. Questions you might get

- **"So is Dijkstra obsolete?"** No. In practice, Dijkstra (and A\*) still wins. The new results change what is *possible* in theory, and some of the ideas may become practical later.
- **"Will Google Maps get faster?"** Not from this. Map routing answers point-to-point queries with heavy preprocessing (for example, contraction hierarchies), so raw SSSP speed isn't the bottleneck.
- **"Why only sparse graphs?"** On dense graphs (m ≈ n²), Dijkstra's O(m + n log n) is already linear in m. The n log n part only dominates when m is close to n.
- **"Why do a few log factors matter?"** Many researchers believed the sorting barrier was fundamental for Dijkstra-like algorithms. Breaking it changes our understanding, even if it doesn't change today's software.
- **"Does randomness mean wrong answers?"** No. BNW's Las Vegas version always returns correct distances or a negative cycle. The randomness only affects the running time.
- **"What about negative cycles?"** The negative-weight algorithms detect them and can return one as proof.

---

## Sources

**Core papers**
- Bernstein, Nanongkai, Wulff-Nilsen: *Negative-Weight Single-Source Shortest Paths in Near-linear Time* (FOCS 2022). <https://arxiv.org/abs/2203.03456>, and the CACM Research Highlight: <https://cacm.acm.org/research-highlights/negative-weight-single-source-shortest-paths-in-near-linear-time>
- Chen, Kyng, Liu, Peng, Probst Gutenberg, Sachdeva: *Maximum Flow and Minimum-Cost Flow in Almost-Linear Time* (FOCS 2022). <https://arxiv.org/abs/2203.00671>
- FOCS 2022 paper awards: <https://focs2022.eecs.berkeley.edu/awards.html>
- Bringmann, Cassis, Fischer: *Negative-Weight Single-Source Shortest Paths in Near-Linear Time: Now Faster!* (FOCS 2023). <https://arxiv.org/abs/2304.05279>
- Li, Mowry, Rao: *Faster Negative-Weight Shortest Paths and Directed Low-Diameter Decompositions* (SODA 2026). <https://arxiv.org/abs/2510.22721>
- Fineman: *Single-Source Shortest Paths with Negative Real Weights in Õ(mn^(8/9)) Time* (STOC 2024). <https://arxiv.org/abs/2311.02520>
- Huang, Jin, Quanrud: *Faster single-source shortest paths with negative real weights via proper hop distance* (SODA 2025). <https://arxiv.org/abs/2407.04872>
- Huang, Jin, Quanrud: *Faster negative length shortest paths by bootstrapping hop reducers* (SODA 2026). <https://arxiv.org/abs/2506.00428>
- Li, Li, Rao, Zhang: *Shortcutting for Negative-Weight Shortest Paths* (preprint, 2025). <https://arxiv.org/abs/2511.12714>
- Khanna, Song: *An n^(2+o(1)) Time Algorithm for Single-Source Negative Weight Shortest Paths* (preprint, 2026). <https://arxiv.org/abs/2602.16638>
- Hair, G. Li, J. Li, Zhang: *Bellman-Ford in Almost-Linear Time* (preprint, July 2026). <https://arxiv.org/abs/2607.19346>
- Duan, Mao, Shu, Yin: *A Randomized Algorithm for Single-Source Shortest Path on Undirected Real-Weighted Graphs* (FOCS 2023). <https://arxiv.org/abs/2307.04139>
- Haeupler, Hladík, Rozhoň, Tarjan, Tětek: *Universal Optimality of Dijkstra via Beyond-Worst-Case Heaps* (FOCS 2024 Best Paper). <https://arxiv.org/abs/2311.11793>, and the award news: <https://barc.ku.dk/news/jakub-ttek-awarded-best-paper-distinction-at-focs-2024/>
- van der Hoog, Rotenberg, Rutschmann: *Simpler Universally Optimal Dijkstra* (ESA 2025). <https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2025.71>
- Duan, Mao, Mao, Shu, Yin: *Breaking the Sorting Barrier for Directed Single-Source Shortest Paths* (STOC 2025 Best Paper). <https://arxiv.org/abs/2504.17033>, and the award news: <https://www.mpi-inf.mpg.de/news/detail/stoc-best-paper-award-how-to-find-the-shortest-path-faster>
- Duan, Mao, Shu, Yin: *A Faster Directed Single-Source Shortest Path Algorithm* (ICALP 2026). <https://arxiv.org/abs/2602.07868>
- Kadria, Roditty: *A Faster Undirected Single-Source Shortest Path Algorithm* (preprint, 2026). <https://arxiv.org/abs/2609.15247>

**Practice**
- Cassis, Karrenbauer, Nusser, Rinaldi: *Algorithm Engineering of SSSP With Negative Edge Weights* (2025). <https://arxiv.org/abs/2502.11999>
- Castro, Clementino, de Freitas: *Implementation and Brief Experimental Analysis of the Duan et al. (2025) Algorithm for Single-Source Shortest Paths* (2025–26). <https://arxiv.org/abs/2511.03007>

**Popular articles (good for the story)**
- Quanta, Jan 2023: *Finally, a Fast Algorithm for Shortest Paths on Negative Graphs*. <https://www.quantamagazine.org/finally-a-fast-algorithm-for-shortest-paths-on-negative-graphs-20230118/>
- Quanta, Oct 2024: *Computer Scientists Establish the Best Way to Traverse a Graph*. <https://www.quantamagazine.org/computer-scientists-establish-the-best-way-to-traverse-a-graph-20241025/>
- Quanta, Aug 2025: *New Method Is the Fastest Way To Find the Best Routes*. <https://www.quantamagazine.org/new-method-is-the-fastest-way-to-find-the-best-routes-20250806/>
- P. L. Frana, T. J. Misa: *An Interview with Edsger W. Dijkstra*, Communications of the ACM 53(8), 2010 (the café story).
