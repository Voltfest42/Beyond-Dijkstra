import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { IndexedMinHeap } from '../src/core/heap';

describe('IndexedMinHeap', () => {
  it('behaves like a sorted list under random push / decrease / pop', () => {
    const op = fc.oneof(
      fc.record({ kind: fc.constant('push' as const), v: fc.nat(15), key: fc.integer({ min: -50, max: 50 }) }),
      fc.record({ kind: fc.constant('pop' as const) }),
    );
    fc.assert(
      fc.property(fc.array(op, { maxLength: 80 }), (ops) => {
        const heap = new IndexedMinHeap(16);
        const model = new Map<number, number>();
        for (const o of ops) {
          if (o.kind === 'push') {
            heap.pushOrDecrease(o.v, o.key);
            if (!model.has(o.v) || o.key < model.get(o.v)!) model.set(o.v, o.key);
          } else if (model.size > 0) {
            const [expected] = [...model].sort(([va, ka], [vb, kb]) => ka - kb || va - vb)[0];
            expect(heap.pop()).toBe(expected);
            model.delete(expected);
          }
          expect(heap.size).toBe(model.size);
        }
      }),
    );
  });
});
