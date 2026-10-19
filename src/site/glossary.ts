/** Plain-language definitions shown when a reader hovers or taps a <Term>. */
export const GLOSSARY = {
  graph: 'A set of points (vertices) joined by connections (edges). Road maps, networks and game levels are all graphs.',
  vertex: 'A point in a graph, such as a town on a map or a room in a game level. Also called a node.',
  edge: 'A connection from one vertex to another. Here every edge is one-way and has a weight.',
  weight: 'The cost of using an edge: a distance, a travel time, a price. Usually positive, but not always.',
  directed: 'Edges are one-way: an edge from A to B does not let you go from B to A.',
  sssp: 'Single-source shortest paths: from one start vertex, find the shortest distance to every other vertex.',
  relax:
    'To relax an edge u → v means checking whether going through u gives v a shorter route than the best one known, and if so, remembering it.',
  'tentative-distance': 'The best distance found so far. It may still go down when a better route turns up.',
  settled: 'A vertex whose distance is final: no better route can ever be found.',
  frontier: 'The vertices that have a tentative distance but are not settled yet. In Dijkstra, they wait in the priority queue.',
  'priority-queue':
    'A data structure that always hands back its smallest item quickly. A binary heap does it in about log₂ n steps.',
  'negative-edge': 'An edge with a weight below zero: using it makes the route cheaper, like a refund or a downhill slide.',
  'negative-cycle':
    'A loop whose weights add up to less than zero. Going round it again and again makes a route as cheap as you like, so "shortest" stops making sense.',
  'big-o':
    'A way to say how the work grows with the size of the input, ignoring constant factors. O(m) means "proportional to the number of edges".',
  log: 'log₂ n is how many times you can halve n before reaching 1. For a million it is about 20, so log factors grow very slowly.',
  'comparison-model':
    'A model of computation where an algorithm may only compare and add distances, never inspect their bits. Sorting n numbers in it takes about n log n comparisons.',
} as const;

export type GlossaryId = keyof typeof GLOSSARY;
