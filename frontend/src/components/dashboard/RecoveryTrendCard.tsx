import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  RotateCcw, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardSummary, RecoveryTrendPoint, RecoveryTrendResponse } from '../../types';
import { api } from '../../services/api';

interface RecoveryTrendCardProps {
  summary?: DashboardSummary | null;
}

export const RecoveryTrendCard: React.FC<RecoveryTrendCardProps> = ({ summary }) => {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [trendData, setTrendData] = useState<RecoveryTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchTrend = async (range: 'month' | 'quarter' | 'year') => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRecoveryTrend(range);
      setTrendData(res);
      // Default hovered point to the latest active point with data
      if (res.points && res.points.length > 0) {
        setHoveredIndex(res.points.length - 1);
      }
    } catch (err: any) {
      console.error('Failed to load recovery trend data', err);
      setError(err.message || 'Unable to load recovery trend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrend(timeRange);
  }, [
    timeRange, 
    summary?.total_revenue_recovered, 
    summary?.total_revenue_at_risk, 
    summary?.successful_recoveries_count,
    summary?.open_recovery_cases_count
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = 180;
  const padLeft = 30;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 30;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const points = trendData?.points || [];
  const hasData = points.length > 0 && points.some(p => p.recovered > 0 || p.at_risk > 0);

  // Compute scale max
  const maxVal = Math.max(
    ...points.map(p => Math.max(p.recovered, p.at_risk)),
    1000
  );

  // Coordinates mapping
  const coords = points.map((p, idx) => {
    const x = points.length === 1 
      ? padLeft + chartWidth / 2 
      : padLeft + (idx / (points.length - 1)) * chartWidth;
    const yRec = padTop + chartHeight - (p.recovered / maxVal) * chartHeight;
    const yRisk = padTop + chartHeight - (p.at_risk / maxVal) * chartHeight;
    return { x, yRec, yRisk, point: p };
  });

  // Helper to build smooth SVG path with cubic bezier curves
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const recPts = coords.map(c => ({ x: c.x, y: c.yRec }));
  const riskPts = coords.map(c => ({ x: c.x, y: c.yRisk }));

  const recPath = buildSmoothPath(recPts);
  const riskPath = buildSmoothPath(riskPts);

  const baselineY = padTop + chartHeight;
  const recAreaPath = recPts.length > 0
    ? `${recPath} L ${recPts[recPts.length - 1].x} ${baselineY} L ${recPts[0].x} ${baselineY} Z`
    : '';
  const riskAreaPath = riskPts.length > 0
    ? `${riskPath} L ${riskPts[riskPts.length - 1].x} ${baselineY} L ${riskPts[0].x} ${baselineY} Z`
    : '';

  const activeHoverPoint = hoveredIndex !== null && coords[hoveredIndex] ? coords[hoveredIndex] : null;

  return (
    <Card className="p-6 lg:p-7 border-[#ECEEF2] bg-white flex flex-col justify-between shadow-xs font-sans">
      {/* Header with Title, Period Summary, and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F1F5F9]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#0F172A] tracking-tight">
              Recovery Trend
            </h2>
            {trendData?.period_label && (
              <span className="text-[11px] font-semibold text-[#6366F1] bg-[#EEF2FF] px-2 py-0.5 rounded-lg border border-[#C7D2FE]">
                {trendData.period_label}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            SQL Database-Aggregated Revenue Recovered vs Revenue at Risk
          </p>
        </div>

        {/* Legend & Period Totals */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-[#334155]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#059669]"></span>
            <span>Recovered ({formatCurrency(trendData?.total_recovered || summary?.total_revenue_recovered || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#334155]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]"></span>
            <span>At Risk ({formatCurrency(trendData?.total_at_risk || summary?.total_revenue_at_risk || 0)})</span>
          </div>
          <button
            onClick={() => fetchTrend(timeRange)}
            title="Refresh recovery trend dataset"
            disabled={loading}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#6366F1]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Time Range Filter Controls */}
      <div className="flex items-center justify-between pt-3 pb-1">
        <div className="text-xs text-[#64748B]">
          {activeHoverPoint ? (
            <span className="font-medium">
              Selected: <strong className="text-[#0F172A]">{activeHoverPoint.point.label}</strong> ·{' '}
              <span className="text-[#059669] font-bold">Recovered: {formatCurrency(activeHoverPoint.point.recovered)}</span> ·{' '}
              <span className="text-[#8B5CF6] font-bold">At Risk: {formatCurrency(activeHoverPoint.point.at_risk)}</span>
            </span>
          ) : (
            <span>Hover over data points to inspect periodic volumes</span>
          )}
        </div>

        <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 text-xs">
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              timeRange === 'month' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              timeRange === 'quarter' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            This Quarter
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              timeRange === 'year' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="my-2 h-52 w-full relative">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-2 text-[#64748B]">
            <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
            <span className="text-xs font-semibold">Loading recovery trend...</span>
          </div>
        ) : error ? (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-3 p-4 text-center">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E11D48]">
              <AlertCircle className="h-4 w-4" />
              <span>Unable to load recovery trend</span>
            </div>
            <button
              onClick={() => fetchTrend(timeRange)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-bold text-[#0F172A] transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : !hasData ? (
          <div className="h-full w-full flex flex-col items-center justify-center space-y-1 text-center text-[#64748B]">
            <span className="text-xs font-bold text-[#0F172A]">No recovery activity for this period</span>
            <span className="text-[11px] text-[#94A3B8]">Transactions and recovery cases will populate here automatically as events occur.</span>
          </div>
        ) : (
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
            <defs>
              {/* Soft Gradient fills for area under curves */}
              <linearGradient id="recoveredGradientReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="atRiskGradientReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            <line x1={padLeft} y1={padTop} x2={svgWidth - padRight} y2={padTop} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padLeft} y1={padTop + chartHeight * 0.33} x2={svgWidth - padRight} y2={padTop + chartHeight * 0.33} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padLeft} y1={padTop + chartHeight * 0.66} x2={svgWidth - padRight} y2={padTop + chartHeight * 0.66} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padLeft} y1={baselineY} x2={svgWidth - padRight} y2={baselineY} stroke="#E2E8F0" strokeWidth="1" />

            {/* At Risk Area Fill & Line */}
            {riskAreaPath && (
              <path d={riskAreaPath} fill="url(#atRiskGradientReal)" />
            )}
            {riskPath && (
              <path
                d={riskPath}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Recovered Area Fill & Line */}
            {recAreaPath && (
              <path d={recAreaPath} fill="url(#recoveredGradientReal)" />
            )}
            {recPath && (
              <path
                d={recPath}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Vertical Guide & Hover Circles */}
            {activeHoverPoint && (
              <g>
                <line
                  x1={activeHoverPoint.x}
                  y1={padTop}
                  x2={activeHoverPoint.x}
                  y2={baselineY}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Recovered Point */}
                <circle cx={activeHoverPoint.x} cy={activeHoverPoint.yRec} r="6" fill="#10B981" />
                <circle cx={activeHoverPoint.x} cy={activeHoverPoint.yRec} r="3" fill="#FFFFFF" />

                {/* At Risk Point */}
                <circle cx={activeHoverPoint.x} cy={activeHoverPoint.yRisk} r="6" fill="#8B5CF6" />
                <circle cx={activeHoverPoint.x} cy={activeHoverPoint.yRisk} r="3" fill="#FFFFFF" />
              </g>
            )}

            {/* Transparent Interactive Click/Hover Columns */}
            {coords.map((c, idx) => {
              const colWidth = chartWidth / coords.length;
              return (
                <rect
                  key={idx}
                  x={c.x - colWidth / 2}
                  y={0}
                  width={colWidth}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onTouchStart={() => setHoveredIndex(idx)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Dynamic X-Axis Labels */}
      <div className="flex items-center justify-between text-xs text-[#64748B] px-3 pt-2 border-t border-[#F1F5F9]">
        {points.map((p, idx) => {
          const isSelected = hoveredIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => setHoveredIndex(idx)}
              className={`transition-all text-[11px] cursor-pointer ${
                isSelected 
                  ? 'font-extrabold text-[#0F172A] scale-105' 
                  : 'font-medium hover:text-[#0F172A]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
};
