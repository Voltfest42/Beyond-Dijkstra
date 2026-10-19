import type { ReactNode } from 'react';
import { DIJKSTRA_PSEUDOCODE, dijkstra } from '../core/algorithms/dijkstra';
import type { Graph, VertexId } from '../core/graph';
import { DIJKSTRA_INTRO } from '../core/presets';
import type { LegendItem } from '../viz/Figure';
import { RunFigure } from './RunFigure';

interface DijkstraFigureProps {
  number: string;
  title: string;
  tryThis?: ReactNode;
  graph?: Graph;
  source?: VertexId;
  pickSource?: boolean;
  showPseudocode?: boolean;
  showDistanceLine?: boolean;
  /** Mark distances Dijkstra gets wrong (for graphs with negative edges). */
  showTruth?: boolean;
}

const LEGEND: LegendItem[] = ['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked'];

export function DijkstraFigure({
  graph = DIJKSTRA_INTRO,
  showPseudocode = true,
  showTruth = false,
  ...rest
}: DijkstraFigureProps) {
  return (
    <RunFigure
      {...rest}
      graph={graph}
      algorithm={dijkstra}
      pseudocode={showPseudocode ? DIJKSTRA_PSEUDOCODE : undefined}
      showQueue={showPseudocode}
      showTruth={showTruth}
      legend={showTruth ? [...LEGEND, 'negative'] : LEGEND}
    />
  );
}
