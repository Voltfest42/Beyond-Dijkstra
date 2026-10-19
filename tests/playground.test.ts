import { describe, expect, it } from 'vitest';
import { nextLabel, parseModel, PRESETS, randomModel, toGraph, toJsonText } from '../src/playground/model';

describe('playground model', () => {
  it('round-trips every preset and random graph through its JSON format', () => {
    for (const model of [...PRESETS.filter((p) => p.id !== 'empty').map((p) => p.build()), randomModel(3), randomModel(4, 10, true)]) {
      expect(parseModel(toJsonText(model))).toEqual(model);
      expect(() => toGraph(model)).not.toThrow();
    }
  });

  it('rejects malformed or oversized files with a readable message', () => {
    expect(() => parseModel('not json')).toThrow();
    expect(() => parseModel('{"edges": []}')).toThrow(/"n"/);
    expect(() => parseModel('{"n": 2, "edges": [{"from": 0, "to": 5, "weight": 1}]}')).toThrow();
    expect(() => parseModel('{"n": 99, "edges": []}')).toThrow(/vertices/);
    expect(() => parseModel('{"n": 2, "edges": [{"from": 0, "to": 1, "weight": 5000}]}')).toThrow(/Weights/);
  });

  it('fills in missing labels and positions, and clamps positions to the canvas', () => {
    const model = parseModel('{"n": 2, "edges": [{"from": 0, "to": 1, "weight": 2}], "positions": [{"x": -50, "y": 9999}, {"x": 100, "y": 100}]}');
    expect(model.vertices.map((v) => v.label)).toEqual(['A', 'B']);
    expect(model.vertices[0].x).toBeGreaterThanOrEqual(30);
    expect(model.vertices[0].y).toBeLessThanOrEqual(410);
  });

  it('picks the first unused label', () => {
    expect(nextLabel({ vertices: [{ label: 'A', x: 0, y: 0 }, { label: 'C', x: 0, y: 0 }], edges: [] })).toBe('B');
  });
});
