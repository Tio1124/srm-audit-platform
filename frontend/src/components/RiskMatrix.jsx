/**
 * components/RiskMatrix.jsx — Visual Risk Matrix / Heatmap
 * 5×5 grid: Likelihood (Y axis) vs Impact (X axis)
 */

export default function RiskMatrix({ data = [] }) {
  // Risk level colors
  const getCellColor = (likelihood, impact) => {
    const score = likelihood * impact;
    if (score >= 20) return 'bg-red-600 text-white';
    if (score >= 10) return 'bg-orange-500 text-white';
    if (score >= 5) return 'bg-yellow-400 text-gray-900';
    return 'bg-green-400 text-gray-900';
  };

  const getRiskLabel = (score) => {
    if (score >= 20) return 'CRITICAL';
    if (score >= 10) return 'HIGH';
    if (score >= 5) return 'MEDIUM';
    return 'LOW';
  };

  // Count items per cell
  const cellCounts = {};
  data.forEach(item => {
    const key = `${item.likelihood}-${item.impact}`;
    if (!cellCounts[key]) cellCounts[key] = [];
    cellCounts[key].push(item);
  });

  const likelihoods = [5, 4, 3, 2, 1]; // Y axis (top to bottom = high to low)
  const impacts = [1, 2, 3, 4, 5];       // X axis (left to right = low to high)

  const likelioodLabels = { 5: 'Almost Certain', 4: 'Likely', 3: 'Possible', 2: 'Unlikely', 1: 'Rare' };
  const impactLabels = { 1: 'Insignificant', 2: 'Minor', 3: 'Moderate', 4: 'Major', 5: 'Catastrophic' };

  return (
    <div className="space-y-4">
      {/* Matrix */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Impact header */}
          <div className="flex items-center ml-28 mb-1">
            <p className="text-xs font-bold text-slate-500 text-center w-full">← IMPACT →</p>
          </div>

          <div className="flex">
            {/* Likelihood label (rotated) */}
            <div className="flex flex-col items-center justify-center w-6 mr-2">
              <span
                className="text-xs font-bold text-slate-500 whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                ← LIKELIHOOD →
              </span>
            </div>

            {/* Y axis labels */}
            <div className="flex flex-col w-20 mr-2">
              <div className="h-8" /> {/* spacer for x header */}
              {likelihoods.map(l => (
                <div key={l} className="flex items-center justify-end h-16 pr-2">
                  <span className="text-[10px] text-slate-500 text-right leading-tight">
                    {l}<br/>{likelioodLabels[l]}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1">
              {/* X axis labels */}
              <div className="flex">
                {impacts.map(i => (
                  <div key={i} className="flex-1 h-8 flex items-end justify-center pb-1">
                    <span className="text-[10px] text-slate-500 text-center leading-tight">
                      {i}<br/>{impactLabels[i].split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Matrix cells */}
              {likelihoods.map(likelihood => (
                <div key={likelihood} className="flex">
                  {impacts.map(impact => {
                    const key = `${likelihood}-${impact}`;
                    const items = cellCounts[key] || [];
                    const score = likelihood * impact;
                    const colorClass = getCellColor(likelihood, impact);

                    return (
                      <div
                        key={impact}
                        className={`flex-1 h-16 border border-white/30 flex flex-col items-center justify-center cursor-default transition-all hover:opacity-80 relative group ${colorClass}`}
                        title={`L${likelihood} × I${impact} = ${score} (${getRiskLabel(score)})\n${items.length} vulnerabilities`}
                      >
                        <span className="text-sm font-bold">{score}</span>
                        {items.length > 0 && (
                          <span className="text-[10px] font-semibold bg-black/20 px-1 rounded">
                            {items.length}×
                          </span>
                        )}

                        {/* Tooltip on hover */}
                        {items.length > 0 && (
                          <div className="absolute left-full top-0 ml-2 z-50 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg p-3 w-52 shadow-xl">
                            <p className="font-bold mb-1">{getRiskLabel(score)} Risk (Score: {score})</p>
                            {items.slice(0, 3).map((item, idx) => (
                              <p key={idx} className="text-slate-300 text-[10px]">• {item.vulnerability_name}</p>
                            ))}
                            {items.length > 3 && (
                              <p className="text-slate-400 text-[10px]">+{items.length - 3} lainnya</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Legend:</span>
        {[
          { label: 'Critical (20-25)', color: 'bg-red-600' },
          { label: 'High (10-19)', color: 'bg-orange-500' },
          { label: 'Medium (5-9)', color: 'bg-yellow-400' },
          { label: 'Low (1-4)', color: 'bg-green-400' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
