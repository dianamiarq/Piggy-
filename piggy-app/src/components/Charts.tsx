import React, { useEffect, useRef, useState } from 'react';
import { moneyAxis } from '../util';

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
};

/** Rounds the axis maximum up to a friendly step and returns the ticks. */
const niceScale = (min: number, max: number, count = 4) => {
  const span = Math.max(1, max - min);
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return { lo, hi, ticks };
};

/** Bar path with 4px rounded data end, square at the baseline. */
const barPath = (x: number, y0: number, w: number, y1: number, roundTop: boolean) => {
  const h = Math.abs(y1 - y0);
  const r = roundTop ? Math.min(4, w / 2, h) : 0;
  if (y1 <= y0) {
    // grows upward: top is y1
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`;
  }
  // grows downward (negative values): bottom is y1
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
};

export interface BarDatum {
  key: string;
  label: string;
  /** Stack segments, bottom to top, in cents. */
  values: number[];
}

interface BarChartProps {
  data: BarDatum[];
  colors: string[];
  /** Optional per-bar color override (e.g. negative savings). */
  colorFor?: (d: BarDatum, segment: number) => string;
  reference?: { value: number; label: string };
  referenceColor?: string;
  selectedKey?: string;
  onSelect?: (key: string) => void;
  tip: (d: BarDatum) => React.ReactNode;
  height?: number;
  ariaLabel: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, colors, colorFor, reference, referenceColor, selectedKey, onSelect, tip, height = 200, ariaLabel }) => {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 44, padR = 6, padT = 12, padB = 24;
  const totals = data.map(d => d.values.reduce((a, b) => a + b, 0));
  const maxV = Math.max(0, ...totals, reference?.value ?? 0);
  const minV = Math.min(0, ...totals);
  const { lo, hi, ticks } = niceScale(minV, maxV || 100);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const slot = innerW / Math.max(1, data.length);
  const bw = Math.max(6, Math.min(30, slot * 0.56));
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 34)));
  const anySelected = selectedKey !== undefined && data.some(d => d.key === selectedKey);

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        <g className="grid">
          {ticks.map(t => (<line key={t} x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} />))}
        </g>
        {ticks.map(t => (
          <text key={'t' + t} x={padL - 8} y={y(t) + 3.5} textAnchor="end">{moneyAxis(t)}</text>
        ))}
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          const x = cx - bw / 2;
          const dim = anySelected && d.key !== selectedKey && hover !== i;
          let acc = 0;
          const segs = d.values.map((v, s) => {
            const from = acc;
            acc += v;
            const isLast = d.values.slice(s + 1).every(n => n === 0);
            if (v === 0) return null;
            const y0 = y(from) + (s > 0 && v > 0 ? -1 : 0); // 2px gap between stacked fills
            const y1 = y(from + v) + (v > 0 && !isLast ? 1 : 0);
            const fill = colorFor ? colorFor(d, s) : colors[s % colors.length];
            return <path key={s} d={barPath(x, y0, bw, y1, isLast)} fill={fill} opacity={dim ? 0.6 : 1} />;
          });
          return (
            <g key={d.key}>
              {segs}
              {(i % labelEvery === 0 || d.key === selectedKey) && (
                <text x={cx} y={height - 6} textAnchor="middle" style={d.key === selectedKey ? { fill: 'var(--fg)', fontWeight: 600 } : undefined}>{d.label}</text>
              )}
              <rect className="hit" x={padL + slot * i} y={padT} width={slot} height={innerH}
                onMouseEnter={() => setHover(i)} onClick={() => { setHover(i); onSelect?.(d.key); }} />
            </g>
          );
        })}
        {lo < 0 && <line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} stroke="var(--fg-3)" strokeWidth={1} />}
        {reference && reference.value > 0 && (
          <line className="budget-line" x1={padL} x2={width - padR} y1={y(reference.value)} y2={y(reference.value)} style={referenceColor ? { stroke: referenceColor, strokeWidth: 2 } : undefined} />
        )}
      </svg>
      {hover !== null && data[hover] && (
        <div className="chart-tip" style={{ left: Math.min(width - 70, Math.max(70, padL + slot * hover + slot / 2)), top: Math.max(40, y(Math.max(0, totals[hover]))) }}>
          {tip(data[hover])}
        </div>
      )}
    </div>
  );
};

interface LineChartProps {
  points: Array<{ key: string; label: string; value: number }>;
  color: string;
  goal?: { value: number; label: string };
  tip: (p: { key: string; label: string; value: number }) => React.ReactNode;
  height?: number;
  ariaLabel: string;
}

export const LineChart: React.FC<LineChartProps> = ({ points, color, goal, tip, height = 200, ariaLabel }) => {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 44, padR = 10, padT = 14, padB = 24;
  const vals = points.map(p => p.value);
  const maxV = Math.max(...vals, goal?.value ?? 0, 1);
  const minV = Math.min(0, ...vals);
  const { lo, hi, ticks } = niceScale(minV, maxV);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (i: number) => padL + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1)},${y(Math.max(lo, 0))} L${x(0)},${y(Math.max(lo, 0))} Z` : '';
  const labelEvery = Math.ceil(points.length / Math.max(1, Math.floor(innerW / 34)));
  const last = points.length - 1;
  const gid = 'g' + ariaLabel.replace(/\W/g, '');

  const onMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const rel = clientX - svg.left - padL;
    const i = points.length <= 1 ? 0 : Math.round((rel / innerW) * (points.length - 1));
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}
        onMouseMove={onMove} onTouchStart={onMove} onTouchMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g className="grid">{ticks.map(t => <line key={t} x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} />)}</g>
        {ticks.map(t => <text key={'t' + t} x={padL - 8} y={y(t) + 3.5} textAnchor="end">{moneyAxis(t)}</text>)}
        {goal && <line className="budget-line" x1={padL} x2={width - padR} y1={y(goal.value)} y2={y(goal.value)} />}
        {goal && <text x={width - padR} y={y(goal.value) - 6} textAnchor="end" style={{ fill: 'var(--fg-2)', fontWeight: 600 }}>{goal.label}</text>}
        {points.length > 1 && <path d={area} fill={`url(#${gid})`} />}
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (i % labelEvery === 0 || i === last) && (
          <text key={p.key} x={x(i)} y={height - 6} textAnchor="middle">{p.label}</text>
        ))}
        {last >= 0 && <circle cx={x(last)} cy={y(points[last].value)} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--fg-3)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(points[hover].value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && points[hover] && (
        <div className="chart-tip" style={{ left: Math.min(width - 70, Math.max(70, x(hover))), top: Math.max(40, y(points[hover].value)) }}>
          {tip(points[hover])}
        </div>
      )}
    </div>
  );
};
