import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { GitGraphData, Commit } from '../types/gitGraph';

export type { GitGraphData };

interface GitGraphProps {
  data: GitGraphData;
  owner: string;
  repo: string;
}

// Color palette for NON-default branches.
// Violet is intentionally excluded here — it is reserved exclusively for the
// default branch via DEFAULT_BRANCH_COLOR so it can never be reused.
const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#ef4444', // red
  '#6366f1', // indigo
];

// Exclusive color for the default branch — never appears in BRANCH_COLORS.
const DEFAULT_BRANCH_COLOR = '#8b5cf6'; // violet

const GitGraph: React.FC<GitGraphProps> = ({ data, owner, repo }) => {
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createBranchMutation = useMutation({
    mutationFn: async ({ name, sha }: { name: string; sha: string }) => {
      const res = await api.post(`/api/branches/${owner}/${repo}`, { name, fromSha: sha });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Branch created');
      setNewBranchName('');
      queryClient.invalidateQueries({ queryKey: ['branchesList'] });
      queryClient.invalidateQueries({ queryKey: ['gitGraph'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create branch');
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async ({ name, sha }: { name: string; sha: string }) => {
      const res = await api.post(`/api/branches/${owner}/${repo}/tag`, { name, fromSha: sha });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Tag created');
      setNewTagName('');
      queryClient.invalidateQueries({ queryKey: ['gitGraph'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create tag');
    },
  });

  const NODE_RADIUS = 6;
  const ROW_HEIGHT = 48;
  const LANE_WIDTH = 24;
  const LEFT_PADDING = 16;

  // Stable color map: default branch → DEFAULT_BRANCH_COLOR (slot 0).
  // Every other branch cycles through BRANCH_COLORS starting at index 0,
  // which never includes violet, so the default branch color is exclusive.
  const branchColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let nonDefaultIdx = 0;
    data.branches.forEach((branch) => {
      if (branch.isDefault) {
        map.set(branch.name, DEFAULT_BRANCH_COLOR);
      } else {
        map.set(branch.name, BRANCH_COLORS[nonDefaultIdx % BRANCH_COLORS.length]);
        nonDefaultIdx++;
      }
    });
    return map;
  }, [data.branches]);

  // Build graph layout using a simpler, more robust algorithm
  const { commitPositions, edges, maxLane } = useMemo(() => {
    const positions = new Map<string, { row: number; lane: number; color: string }>();
    const edges: Array<{
      fromSha: string;
      toSha: string;
      fromRow: number;
      fromLane: number;
      toRow: number;
      toLane: number;
      color: string;
    }> = [];

    if (data.commits.length === 0) {
      return { commitPositions: positions, edges, maxLane: 0 };
    }

    // Create index for quick parent lookup
    const commitIndex = new Map<string, number>();
    data.commits.forEach((c, i) => commitIndex.set(c.sha, i));

    // Track active lanes (which SHA currently "owns" each lane).
    // Lane 0 is pre-reserved for the default branch: seed it with the HEAD SHA
    // of the default branch so the very first commit processed for that branch
    // is guaranteed to land in lane 0, even if it isn't the first commit in the
    // list (e.g. a merge commit that sits above the default branch HEAD).
    const defaultBranch = data.branches.find((b) => b.isDefault);
    const activeLanes: (string | null)[] = [defaultBranch?.headSha ?? null];

    // Helper to find first available lane (never claims lane 0 for non-default
    // branch commits — lane 0 stays reserved as long as any default-branch SHA
    // is pending there).
    const findFreeLane = (isDefaultBranchCommit: boolean): number => {
      const startIdx = isDefaultBranchCommit ? 0 : 1;
      for (let i = startIdx; i < activeLanes.length; i++) {
        if (activeLanes[i] === null) return i;
      }
      activeLanes.push(null);
      return activeLanes.length - 1;
    };

    // Helper to get color for a commit via the stable branchColorMap
    const getCommitColor = (commit: Commit): string => {
      // Prefer the default branch if this commit is on it
      const defaultBranchName = commit.branches.find((bName) => {
        const b = data.branches.find((br) => br.name === bName);
        return b?.isDefault;
      });
      if (defaultBranchName) return DEFAULT_BRANCH_COLOR;

      // Otherwise use the first listed branch
      const primaryBranch = commit.branches[0];
      if (primaryBranch) {
        return branchColorMap.get(primaryBranch) ?? BRANCH_COLORS[0];
      }
      return BRANCH_COLORS[0];
    };

    // Process commits top to bottom (newest first)
    data.commits.forEach((commit, row) => {
      const isDefaultBranchCommit = commit.branches.some((bName) => {
        const b = data.branches.find((br) => br.name === bName);
        return b?.isDefault;
      });

      const color = getCommitColor(commit);
      let lane: number;

      // Check if a child already reserved a lane for this commit
      const reservedLane = activeLanes.indexOf(commit.sha);
      if (reservedLane !== -1) {
        lane = reservedLane;
      } else {
        lane = findFreeLane(isDefaultBranchCommit);
      }

      // Place this commit
      activeLanes[lane] = commit.sha;
      positions.set(commit.sha, { row, lane, color });

      // Process parents
      const validParents = commit.parents.filter((psha) => commitIndex.has(psha));

      validParents.forEach((parentSha, pIdx) => {
        const parentIsDefault = (() => {
          const parentCommit = data.commits[commitIndex.get(parentSha)!];
          return parentCommit?.branches.some((bName) => {
            const b = data.branches.find((br) => br.name === bName);
            return b?.isDefault;
          }) ?? false;
        })();

        let parentLane: number;

        // Check if parent already has a position (from another child)
        const existingParentPos = positions.get(parentSha);
        if (existingParentPos) {
          parentLane = existingParentPos.lane;
        } else {
          // Check if parent is already reserved in a lane
          const reservedParentLane = activeLanes.indexOf(parentSha);
          if (reservedParentLane !== -1) {
            parentLane = reservedParentLane;
          } else if (pIdx === 0) {
            // First parent continues in the same lane
            parentLane = lane;
            activeLanes[lane] = parentSha;
          } else {
            // Secondary parents get a new lane (never lane 0 unless they are
            // a default-branch commit — handled by findFreeLane).
            parentLane = findFreeLane(parentIsDefault);
            activeLanes[parentLane] = parentSha;
          }
        }

        // Edge color follows the *destination* lane: if the parent is on the
        // default branch, the converging line is drawn in the default color so
        // the main lane appears unbroken through merge commits.
        const edgeColor = parentIsDefault
          ? DEFAULT_BRANCH_COLOR
          : color;

        edges.push({
          fromSha: commit.sha,
          toSha: parentSha,
          fromRow: row,
          fromLane: lane,
          toRow: commitIndex.get(parentSha)!,
          toLane: parentLane,
          color: edgeColor,
        });
      });

      // Free up lane if this commit has no parents (root commit)
      if (validParents.length === 0) {
        activeLanes[lane] = null;
      }
    });

    const maxLane = Math.max(0, ...Array.from(positions.values()).map((p) => p.lane));
    return { commitPositions: positions, edges, maxLane };
  }, [data.commits, data.branches, branchColorMap]);

  const svgWidth = Math.max(120, (maxLane + 2) * LANE_WIDTH + LEFT_PADDING * 2);

  const getX = (lane: number) => LEFT_PADDING + lane * LANE_WIDTH + LANE_WIDTH / 2;
  const getY = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT / 2 + 20;

  // Stable color lookup for the legend — use the pre-built branchColorMap
  const getColor = (branchName: string): string =>
    branchColorMap.get(branchName) ?? BRANCH_COLORS[0];

  // Generate SVG path for an edge
  const renderEdgePath = (edge: typeof edges[0]) => {
    const x1 = getX(edge.fromLane);
    const y1 = getY(edge.fromRow);
    const x2 = getX(edge.toLane);
    const y2 = getY(edge.toRow);

    if (edge.fromLane === edge.toLane) {
      // Straight vertical line
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    // Curved connection for branch/merge
    const curveStartY = y1 + ROW_HEIGHT * 0.4;
    const curveEndY = curveStartY + ROW_HEIGHT * 0.4;

    return `M ${x1} ${y1} 
            L ${x1} ${curveStartY}
            Q ${x1} ${curveEndY}, ${(x1 + x2) / 2} ${curveEndY}
            Q ${x2} ${curveEndY}, ${x2} ${curveEndY + ROW_HEIGHT * 0.2}
            L ${x2} ${y2}`;
  };

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
        {data.branches.map((branch) => (
          <div key={branch.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getColor(branch.name) }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              {branch.name}
              {branch.isDefault && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded">
                  default
                </span>
              )}
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

            {/* Edges (lines) - render first so nodes appear on top */}
            {edges.map((edge, idx) => (
              <path
                key={`edge-${idx}-${edge.fromSha}-${edge.toSha}`}
                d={renderEdgePath(edge)}
                fill="none"
                stroke={edge.color}
                strokeWidth="2"
                strokeOpacity="0.7"
              />
            ))}

            {/* Nodes (commits) */}
            {data.commits.map((commit) => {
              const pos = commitPositions.get(commit.sha);
              if (!pos) return null;

              const x = getX(pos.lane);
              const y = getY(pos.row);
              const isHead = data.branches.some((b) => b.headSha === commit.sha);
              const isOnDefaultBranch = commit.branches.some((branchName) => {
                const branch = data.branches.find((b) => b.name === branchName);
                return branch?.isDefault;
              });
              const isHovered = hoveredCommit === commit.sha;
              const isSelected = selectedCommit?.sha === commit.sha;

              return (
                <g key={commit.sha}>
                  {isHead && (
                    <circle
                      cx={x}
                      cy={y}
                      r={NODE_RADIUS + 4}
                      fill={pos.color}
                      opacity="0.3"
                    />
                  )}
                  {/* Special ring for commits on default branch */}
                  {isOnDefaultBranch && !isHead && (
                    <circle
                      cx={x}
                      cy={y}
                      r={NODE_RADIUS + 3}
                      fill="none"
                      stroke={DEFAULT_BRANCH_COLOR}
                      strokeWidth="2"
                      strokeOpacity="0.5"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered || isSelected ? NODE_RADIUS + 2 : NODE_RADIUS}
                    fill={isHead ? pos.color : '#ffffff'}
                    stroke={pos.color}
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
              const isOnDefaultBranch = commit.branches.some((branchName) => {
                const branch = data.branches.find((b) => b.name === branchName);
                return branch?.isDefault;
              });

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
                      {isOnDefaultBranch && !isHead && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded flex-shrink-0">
                          default
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

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {commit.branches.slice(0, 2).map((branch) => {
                      const color = getColor(branch);
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

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded">
                  {selectedCommit.sha}
                </span>
                <span className="text-sm text-gray-500">
                  {selectedCommit.parents.length} parent{selectedCommit.parents.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedCommit.branches.map((branch) => {
                    const color = getColor(branch);
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

              {/* Actions: create branch / tag from this commit */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Create branch from this commit
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="feature/my-branch"
                      className="flex-1 px-2 py-1.5 rounded border border-gray-300 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newBranchName.trim()) return;
                        createBranchMutation.mutate({ name: newBranchName.trim(), sha: selectedCommit.sha });
                      }}
                      disabled={createBranchMutation.isPending || !newBranchName.trim()}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {createBranchMutation.isPending ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Tag this commit
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="v1.2.3"
                      className="flex-1 px-2 py-1.5 rounded border border-gray-300 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTagName.trim()) return;
                        createTagMutation.mutate({ name: newTagName.trim(), sha: selectedCommit.sha });
                      }}
                      disabled={createTagMutation.isPending || !newTagName.trim()}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {createTagMutation.isPending ? 'Tagging…' : 'Tag'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Rename commit helper (CLI instructions) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-blue-600 hover:underline">
                  Rename this commit via Git CLI
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3 overflow-auto">
{`# On your machine
# Choose a branch that contains commit ${selectedCommit.shortSha}
# (for example: ${selectedCommit.branches[0] || '<branch-name>'})

git fetch origin
git checkout ${selectedCommit.branches[0] || '<branch-name>'}
# Start an interactive rebase from the parent of this commit
${selectedCommit.parents[0]
  ? `git rebase -i ${selectedCommit.parents[0]}
`
  : '# This commit has no recorded parent – rename via rebase starting earlier in history\n'}
# In the editor, change "pick" to "reword" for commit ${selectedCommit.shortSha}
# Then enter the new commit message when prompted
# Finally, force-push the updated branch:

git push --force-with-lease origin ${selectedCommit.branches[0] || '<branch-name>'}
`}
                </pre>
              </details>
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
              <button
                type="button"
                onClick={() =>
                  navigate(`/commits?repo=${encodeURIComponent(`${owner}/${repo}`)}&sha=${selectedCommit.sha}`)
                }
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                View Diff
              </button>
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
