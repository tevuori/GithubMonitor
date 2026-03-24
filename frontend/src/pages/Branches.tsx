import React, { useMemo, useState } from 'react';

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  fullMessage: string;
  author: {
    name: string;
    email: string;
    date: string;
    avatar: string;
    login: string;
  };
  parents: string[];
  htmlUrl: string;
  branches: string[];
}

interface Branch {
  name: string;
  protected: boolean;
  headSha: string;
  lane: number;
}

interface GitGraphData {
  branches: Branch[];
  commits: Commit[];
  branchLanes: Record<string, number>;
  totalCommits: number;
}

interface GitGraphProps {
  data: GitGraphData;
  owner: string;
  repo: string;
}

const BRANCH_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#ef4444',
  '#6366f1',
];

const GitGraph: React.FC<GitGraphProps> = ({ data, owner, repo }) => {
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

  const commitIndex = useMemo(() => {
    const index = new Map<string, number>();
    data.commits.forEach((c, i) => index.set(c.sha, i));
    return index;
  }, [data.commits]);

  const commitLanes = useMemo(() => {
    const lanes = new Map<string, number>();
    data.commits.forEach((commit) => {
      const primaryBranch = commit.branches[0];
      let lane = data.branchLanes[primaryBranch] ?? 0;
      lane = Math.min(lane, data.branches.length - 1);
      lanes.set(commit.sha, lane);
    });
    return lanes;
  }, [data.commits, data.branchLanes, data.branches]);

  const NODE_RADIUS = 6;
  const ROW_HEIGHT = 48;
  const LANE_WIDTH = 24;
  const LEFT_PADDING = 16;
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
        return diffMins + 'm ago';
      }
      return diffHours + 'h ago';
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return diffDays + 'd ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + 'w ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-3 p-4 bg-gray-800/50 border-b border-gray-700/50">
        {data.branches.map((branch, i) => (
          <div key={branch.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getColor(i) }}
            />
            <span className="text-sm text-gray-300 font-mono">{branch.name}</span>
            {branch.protected && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">protected</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
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

            {data.commits.map((commit, rowIndex) => {
              const lane = commitLanes.get(commit.sha) ?? 0;
              const x = LEFT_PADDING + lane * LANE_WIDTH + LANE_WIDTH / 2;
              const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;

              return commit.parents.map((parentSha) => {
                const parentIndex = commitIndex.get(parentSha);
                if (parentIndex === undefined) return null;

                const parentLane = commitLanes.get(parentSha) ?? 0;
                const parentX = LEFT_PADDING + parentLane * LANE_WIDTH + LANE_WIDTH / 2;
                const parentY = parentIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;
                const branchIndex = Math.min(lane, data.branches.length - 1);

                if (lane === parentLane) {
                  return (
                    <line
                      key={commit.sha + '-' + parentSha}
                      x1={x}
                      y1={y}
                      x2={parentX}
                      y2={parentY}
                      stroke={getColor(branchIndex)}
                      strokeWidth="2"
                      strokeOpacity="0.6"
                    />
                  );
                } else {
                  const midY = (y + parentY) / 2;
                  return (
                    <path
                      key={commit.sha + '-' + parentSha}
                      d={'M ' + x + ' ' + y + ' C ' + x + ' ' + midY + ', ' + parentX + ' ' + midY + ', ' + parentX + ' ' + parentY}
                      fill="none"
                      stroke={getColor(branchIndex)}
                      strokeWidth="2"
                      strokeOpacity="0.6"
                    />
                  );
                }
              });
            })}

            {data.commits.map((commit, rowIndex) => {
              const lane = commitLanes.get(commit.sha) ?? 0;
              const x = LEFT_PADDING + lane * LANE_WIDTH + LANE_WIDTH / 2;
              const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;
              const branchIndex = Math.min(lane, data.branches.length - 1);
              const isHead = data.branches.some((b) => b.headSha === commit.sha);
              const isHovered = hoveredCommit === commit.sha;
              const isSelected = selectedCommit?.sha === commit.sha;

              return (
                <g key={commit.sha}>
                  {isHead && (
                    <circle
                      cx={x}
                      cy={y}
                      r={NODE_RADIUS + 4}
                      fill={getColor(branchIndex)}
                      opacity="0.3"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered || isSelected ? NODE_RADIUS + 2 : NODE_RADIUS}
                    fill={isHead ? getColor(branchIndex) : '#1f2937'}
                    stroke={getColor(branchIndex)}
                    strokeWidth={isHead ? 3 : 2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCommit(commit.sha)}
                    onMouseLeave={() => setHoveredCommit(null)}
                    onClick={() => setSelectedCommit(commit)}
                  />
                </g>
              );
            })}
          </svg>

          <div className="flex-1 min-w-0">
            {data.commits.map((commit) => {
              const isSelected = selectedCommit?.sha === commit.sha;
              const isHovered = hoveredCommit === commit.sha;
              const isHead = data.branches.some((b) => b.headSha === commit.sha);

              let rowClass = 'flex items-center gap-4 px-4 border-b border-gray-800/50 cursor-pointer';
              if (isSelected) rowClass += ' bg-blue-500/10';
              if (isHovered && !isSelected) rowClass += ' bg-gray-800/30';

              return (
                <div
                  key={commit.sha}
                  className={rowClass}
                  style={{ height: ROW_HEIGHT }}
                  onMouseEnter={() => setHoveredCommit(commit.sha)}
                  onMouseLeave={() => setHoveredCommit(null)}
                  onClick={() => setSelectedCommit(commit)}
                >
                  {commit.author.avatar ? (
                    <img
                      src={commit.author.avatar}
                      alt={commit.author.name}
                      className="w-7 h-7 rounded-full ring-2 ring-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                      {commit.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-200 truncate font-medium">{commit.message}</span>
                      {isHead && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded flex-shrink-0">HEAD</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="font-mono text-blue-400">{commit.shortSha}</span>
                      <span>·</span>
                      <span>{commit.author.login || commit.author.name}</span>
                      <span>·</span>
                      <span>{formatDate(commit.author.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {commit.branches.slice(0, 2).map((branch) => {
                      const idx = data.branchLanes[branch] ?? 0;
                      return (
                        <span
                          key={branch}
                          className="px-2 py-0.5 text-xs rounded-full font-mono"
                          style={{ backgroundColor: getColor(idx) + '20', color: getColor(idx) }}
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

      {selectedCommit && (
        <div className="border-t border-gray-700 bg-gray-800/80 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {selectedCommit.author.avatar && (
                  <img src={selectedCommit.author.avatar} alt={selectedCommit.author.name} className="w-10 h-10 rounded-full" />
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-100">{selectedCommit.message}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-gray-300">{selectedCommit.author.name}</span>
                    {selectedCommit.author.login && <span className="text-gray-500"> (@{selectedCommit.author.login})</span>}
                    <span className="mx-2">·</span>
                    <span>{new Date(selectedCommit.author.date).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <span className="font-mono text-sm text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{selectedCommit.sha}</span>
                <span className="text-sm text-gray-500">{selectedCommit.parents.length} parent(s)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <a
                href={selectedCommit.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg"
              >
                View on GitHub
              </a>
              <a
                href={'https://github.com/' + owner + '/' + repo + '/commit/' + selectedCommit.sha + '.diff'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
              >
                View Diff
              </a>
              <button
                onClick={() => setSelectedCommit(null)}
                className="p-1.5 text-gray-400 hover:text-gray-200"
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
