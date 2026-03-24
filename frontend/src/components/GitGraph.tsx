import React, { useMemo, useState } from 'react';
import type { GitGraphData, Commit } from '../types/gitGraph';

export type { GitGraphData };

interface GitGraphProps {
  data: GitGraphData;
  owner: string;
  repo: string;
}

// Color palette for branches
const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#ef4444', // red
  '#6366f1', // indigo
];

const GitGraph: React.FC<GitGraphProps> = ({ data, owner, repo }) => {
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

  // Build commit index for quick lookup
  const commitIndex = useMemo(() => {
    const index = new Map<string, number>();
    data.commits.forEach((c, i) => index.set(c.sha, i));
    return index;
  }, [data.commits]);

  // Build a map of which branch each commit belongs to (use first/primary branch)
  const commitToBranch = useMemo(() => {
    const map = new Map<string, string>();
    data.commits.forEach((commit) => {
      if (commit.branches && commit.branches.length > 0) {
        map.set(commit.sha, commit.branches[0]);
      }
    });
    return map;
  }, [data.commits]);

  // Improved lane assignment - track active lanes and assign based on branch continuity
  const commitLanes = useMemo(() => {
    const lanes = new Map<string, number>();
    const branchToLane = new Map<string, number>();
    
    // First pass: assign lanes to branches based on their order
    data.branches.forEach((branch, idx) => {
      branchToLane.set(branch.name, idx);
    });

    // Second pass: assign lanes to commits based on their branch
    data.commits.forEach((commit) => {
      const primaryBranch = commit.branches?.[0];
      if (primaryBranch && branchToLane.has(primaryBranch)) {
        lanes.set(commit.sha, branchToLane.get(primaryBranch)!);
      } else {
        // Fallback: use lane 0 for commits without branch info
        lanes.set(commit.sha, 0);
      }
    });

    return lanes;
  }, [data.commits, data.branches]);

  // Get the color for a commit based on its branch
  const getCommitColor = (commit: Commit) => {
    const branch = commit.branches?.[0];
    if (branch) {
      const branchIdx = data.branches.findIndex(b => b.name === branch);
      if (branchIdx >= 0) {
        return BRANCH_COLORS[branchIdx % BRANCH_COLORS.length];
      }
    }
    return BRANCH_COLORS[0];
  };

  const NODE_RADIUS = 6;
  const ROW_HEIGHT = 48;
  const LANE_WIDTH = 28;
  const LEFT_PADDING = 20;
  const svgWidth = Math.max(200, (data.branches.length + 1) * LANE_WIDTH + LEFT_PADDING * 2);

  const getColor = (branchIndex: number) => BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Branch Legend */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
        {data.branches.map((branch, i) => (
          <div key={branch.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getColor(i) }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              {branch.name}
              {branch.protected && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">
                  protected
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Graph Container */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <div className="flex min-h-full">
          {/* SVG Graph */}
          <svg
            width={svgWidth}
            height={data.commits.length * ROW_HEIGHT + 40}
            className="flex-shrink-0"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connection Lines */}
            {data.commits.map((commit, rowIndex) => {
              const lane = commitLanes.get(commit.sha) ?? 0;
              const x = LEFT_PADDING + lane * LANE_WIDTH + LANE_WIDTH / 2;
              const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;
              const commitColor = getCommitColor(commit);

              return commit.parents.map((parentSha) => {
                const parentIndex = commitIndex.get(parentSha);
                if (parentIndex === undefined) return null;

                const parentLane = commitLanes.get(parentSha) ?? 0;
                const parentX = LEFT_PADDING + parentLane * LANE_WIDTH + LANE_WIDTH / 2;
                const parentY = parentIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;

                if (lane === parentLane) {
                  // Straight vertical line
                  return (
                    <line
                      key={`${commit.sha}-${parentSha}`}
                      x1={x}
                      y1={y}
                      x2={parentX}
                      y2={parentY}
                      stroke={commitColor}
                      strokeWidth="2"
                      strokeOpacity="0.7"
                    />
                  );
                } else {
                  // Curved line for merge/branch - improved bezier curve
                  const midY = y + (parentY - y) * 0.3;
                  return (
                    <path
                      key={`${commit.sha}-${parentSha}`}
                      d={`M ${x} ${y} 
                          L ${x} ${midY}
                          Q ${x} ${midY + 15}, ${(x + parentX) / 2} ${midY + 15}
                          Q ${parentX} ${midY + 15}, ${parentX} ${midY + 30}
                          L ${parentX} ${parentY}`}
                      fill="none"
                      stroke={commitColor}
                      strokeWidth="2"
                      strokeOpacity="0.7"
                    />
                  );
                }
              });
            })}

            {/* Commit Nodes */}
            {data.commits.map((commit, rowIndex) => {
              const lane = commitLanes.get(commit.sha) ?? 0;
              const x = LEFT_PADDING + lane * LANE_WIDTH + LANE_WIDTH / 2;
              const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;
              const commitColor = getCommitColor(commit);
              const isHead = data.branches.some((b) => b.headSha === commit.sha);
              const isHovered = hoveredCommit === commit.sha;
              const isSelected = selectedCommit?.sha === commit.sha;

              return (
                <g key={commit.sha}>
                  {/* Glow effect for head commits */}
                  {isHead && (
                    <circle
                      cx={x}
                      cy={y}
                      r={NODE_RADIUS + 4}
                      fill={commitColor}
                      opacity="0.3"
                    />
                  )}
                  {/* Main node */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered || isSelected ? NODE_RADIUS + 2 : NODE_RADIUS}
                    fill={isHead ? commitColor : '#ffffff'}
                    stroke={commitColor}
                    strokeWidth={isHead ? 3 : 2}
                    className="cursor-pointer"
                    style={{
                      filter: isHovered || isSelected ? 'url(#glow)' : undefined,
                    }}
                    onMouseEnter={() => setHoveredCommit(commit.sha)}
                    onMouseLeave={() => setHoveredCommit(null)}
                    onClick={() => setSelectedCommit(commit)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Commit List */}
          <div className="flex-1 min-w-0">
            {data.commits.map((commit) => {
              const isSelected = selectedCommit?.sha === commit.sha;
              const isHovered = hoveredCommit === commit.sha;
              const isHead = data.branches.some((b) => b.headSha === commit.sha);

              return (
                <div
                  key={commit.sha}
                  className={`flex items-center gap-4 px-4 border-b border-gray-100 dark:border-gray-800/50 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10 border-l-2 border-l-blue-500' : ''}
                    ${isHovered && !isSelected ? 'bg-gray-50 dark:bg-gray-800/30' : ''}
                  `}
                  style={{ height: ROW_HEIGHT }}
                  onMouseEnter={() => setHoveredCommit(commit.sha)}
                  onMouseLeave={() => setHoveredCommit(null)}
                  onClick={() => setSelectedCommit(commit)}
                >
                  {/* Author Avatar */}
                  {commit.author.avatar ? (
                    <img
                      src={commit.author.avatar}
                      alt={commit.author.name}
                      className="w-7 h-7 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                      {commit.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Commit Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">
                        {commit.message}
                      </span>
                      {isHead && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded flex-shrink-0">
                          HEAD
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="font-mono text-blue-600 dark:text-blue-400">{commit.shortSha}</span>
                      <span>·</span>
                      <span>{commit.author.login || commit.author.name}</span>
                      <span>·</span>
                      <span>{formatDate(commit.author.date)}</span>
                    </div>
                  </div>

                  {/* Branch Tags */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {commit.branches.slice(0, 2).map((branch) => {
                      const branchIdx = data.branches.findIndex(b => b.name === branch);
                      const color = branchIdx >= 0 ? getColor(branchIdx) : getColor(0);
                      return (
                        <span
                          key={branch}
                          className="px-2 py-0.5 text-xs rounded-full font-mono"
                          style={{
                            backgroundColor: `${color}20`,
                            color: color,
                          }}
                        >
                          {branch}
                        </span>
                      );
                    })}
                    {commit.branches.length > 2 && (
                      <span className="text-xs text-gray-500">+{commit.branches.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Commit Details Panel */}
      {selectedCommit && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {selectedCommit.author.avatar && (
                  <img
                    src={selectedCommit.author.avatar}
                    alt={selectedCommit.author.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {selectedCommit.message}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    <span className="text-gray-800 dark:text-gray-300">{selectedCommit.author.name}</span>
                    {selectedCommit.author.login && (
                      <span className="text-gray-500"> (@{selectedCommit.author.login})</span>
                    )}
                    <span className="mx-2">·</span>
                    <span>{new Date(selectedCommit.author.date).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {selectedCommit.fullMessage !== selectedCommit.message && (
                <pre className="mt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg">
                  {selectedCommit.fullMessage}
                </pre>
              )}

              <div className="flex items-center gap-4 mt-3">
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded">
                  {selectedCommit.sha}
                </span>
                <span className="text-sm text-gray-500">
                  {selectedCommit.parents.length} parent{selectedCommit.parents.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  {selectedCommit.branches.map((branch) => {
                    const branchIdx = data.branches.findIndex(b => b.name === branch);
                    const color = branchIdx >= 0 ? getColor(branchIdx) : getColor(0);
                    return (
                      <span
                        key={branch}
                        className="px-2 py-0.5 text-xs rounded-full font-mono"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                        }}
                      >
                        {branch}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <a
                href={selectedCommit.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              >
                View on GitHub
              </a>
              <a
                href={`https://github.com/${owner}/${repo}/commit/${selectedCommit.sha}.diff`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                View Diff
              </a>
              <button
                onClick={() => setSelectedCommit(null)}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitGraph;
