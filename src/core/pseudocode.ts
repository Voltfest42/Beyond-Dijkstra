/** One line of an algorithm's on-screen pseudocode. `id` matches the trace's 'line' events. */
export interface PseudocodeLine {
  id: string;
  text: string;
  indent: number;
}
