import { Octokit } from '@octokit/rest';

export function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function getUserRepos(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({ sort: 'updated', per_page: 50 });
  return data;
}

export async function getRepoStats(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const [repoData, commits, issues, pulls] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.listCommits({ owner, repo, per_page: 10 }),
    octokit.issues.listForRepo({ owner, repo, state: 'open' }),
    octokit.pulls.list({ owner, repo, state: 'open' })
  ]);
  return {
    repo: repoData.data,
    recentCommits: commits.data,
    openIssues: issues.data,
    openPulls: pulls.data
  };
}

export async function getRepoCommits(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listCommits({ owner, repo, per_page: 30 });
  return data;
}

// Get single commit with full details including diff
export async function getCommitDetails(accessToken: string, owner: string, repo: string, sha: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });
  
  return {
    sha: data.sha,
    html_url: data.html_url,
    commit: {
      message: data.commit.message,
      author: {
        name: data.commit.author?.name,
        email: data.commit.author?.email,
        date: data.commit.author?.date,
      },
      committer: {
        name: data.commit.committer?.name,
        email: data.commit.committer?.email,
        date: data.commit.committer?.date,
      },
    },
    author: data.author ? {
      login: data.author.login,
      avatar_url: data.author.avatar_url,
      html_url: data.author.html_url,
    } : null,
    committer: data.committer ? {
      login: data.committer.login,
      avatar_url: data.committer.avatar_url,
    } : null,
    parents: data.parents.map((p: any) => ({ sha: p.sha, html_url: p.html_url })),
    stats: data.stats,
    files: data.files?.map((f: any) => ({
      sha: f.sha,
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
      blob_url: f.blob_url,
      raw_url: f.raw_url,
      contents_url: f.contents_url,
      previous_filename: f.previous_filename,
    })) || [],
  };
}

export async function getRepoBranches(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 50 });
  return data;
}

// Delete a branch by name
export async function deleteBranch(accessToken: string, owner: string, repo: string, branch: string) {
  const octokit = getOctokit(accessToken);
  await octokit.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
}

// Get the default branch name for a repo
export async function getDefaultBranch(accessToken: string, owner: string, repo: string): Promise<string> {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch;
}

// Create a new branch ref pointing at a specific commit
export async function createBranchFromCommit(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
) {
  const octokit = getOctokit(accessToken);
  const ref = `refs/heads/${branch}`;
  const { data } = await octokit.git.createRef({ owner, repo, ref, sha });
  return data;
}

// Create a lightweight tag pointing at a specific commit
export async function createTagFromCommit(
  accessToken: string,
  owner: string,
  repo: string,
  tag: string,
  sha: string,
) {
  const octokit = getOctokit(accessToken);
  const ref = `refs/tags/${tag}`;
  const { data } = await octokit.git.createRef({ owner, repo, ref, sha });
  return data;
}

// ==================== BRANCH MANAGEMENT ====================

/**
 * Rename a branch by creating a new ref at the same SHA and deleting the old one.
 * GitHub doesn't expose a rename endpoint in REST; this is the standard workaround.
 */
export async function renameBranch(
  accessToken: string,
  owner: string,
  repo: string,
  oldName: string,
  newName: string,
) {
  const octokit = getOctokit(accessToken);

  // 1. Resolve the current SHA of the old branch
  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${oldName}` });
  const sha = refData.object.sha;

  // 2. Create the new branch at that SHA
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${newName}`, sha });

  // 3. Delete the old branch
  await octokit.git.deleteRef({ owner, repo, ref: `heads/${oldName}` });

  return { renamed: true, from: oldName, to: newName, sha };
}

/**
 * Set the default branch of a repository.
 */
export async function setDefaultBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.update({ owner, repo, default_branch: branch });
  return { default_branch: data.default_branch };
}

/**
 * Squash-merge a source branch into a target branch.
 * This creates a PR under the hood (or uses the merge API with squash strategy).
 * We use the merge endpoint which accepts merge_method: 'squash'.
 *
 * Requires the source branch to be ahead of target.
 */
export async function squashMergeBranch(
  accessToken: string,
  owner: string,
  repo: string,
  head: string,      // source branch (the one to squash-merge FROM)
  base: string,      // target branch (the one to merge INTO)
  commitTitle?: string,
  commitMessage?: string,
) {
  const octokit = getOctokit(accessToken);

  // Create a temporary PR so we can use the merge API with squash strategy
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head,
    base,
    title: commitTitle || `Squash merge ${head} into ${base}`,
    body: commitMessage || `Automated squash merge of \`${head}\` into \`${base}\``,
  });

  try {
    const { data: mergeResult } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: pr.number,
      merge_method: 'squash',
      commit_title: commitTitle || `Squash merge ${head} into ${base}`,
      commit_message: commitMessage || '',
    });
    return { merged: mergeResult.merged, sha: mergeResult.sha, message: mergeResult.message, pr_number: pr.number };
  } catch (err) {
    // Attempt to close the PR if merge fails
    await octokit.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' }).catch(() => {});
    throw err;
  }
}

/**
 * Rebase-merge a source branch into a target branch.
 * Uses the PR merge API with rebase strategy.
 */
export async function rebaseMergeBranch(
  accessToken: string,
  owner: string,
  repo: string,
  head: string,      // source branch
  base: string,      // target branch
) {
  const octokit = getOctokit(accessToken);

  // Create a temporary PR
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head,
    base,
    title: `Rebase merge ${head} into ${base}`,
    body: `Automated rebase merge of \`${head}\` into \`${base}\``,
  });

  try {
    const { data: mergeResult } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: pr.number,
      merge_method: 'rebase',
    });
    return { merged: mergeResult.merged, sha: mergeResult.sha, message: mergeResult.message, pr_number: pr.number };
  } catch (err) {
    await octokit.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' }).catch(() => {});
    throw err;
  }
}

// ==================== PR REVIEW FEATURES ====================

export async function getPullRequest(accessToken: string, owner: string, repo: string, pullNumber: number) {
  const octokit = getOctokit(accessToken);
  const [pr, reviews, comments, files] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listReviews({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listReviewComments({ owner, repo, pull_number: pullNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 }),
  ]);
  return {
    ...pr.data,
    reviews: reviews.data,
    comments: comments.data,
    files: files.data,
  };
}

export async function getPullRequestDiff(accessToken: string, owner: string, repo: string, pullNumber: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' }
  });
  return data;
}

export async function getRepoPullRequests(accessToken: string, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.pulls.list({ owner, repo, state, per_page: 50, sort: 'updated' });
  return data;
}

// ==================== CODE SEARCH ====================

export async function searchCode(accessToken: string, query: string, page: number = 1) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.code({ q: query, per_page: 30, page });
  return data;
}

export async function searchRepos(accessToken: string, query: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.repos({ q: query, per_page: 20 });
  return data;
}

// ==================== FILE BROWSER ====================

export async function getRepoContents(accessToken: string, owner: string, repo: string, path: string = '', ref?: string) {
  const octokit = getOctokit(accessToken);
  const params: any = { owner, repo, path };
  if (ref) params.ref = ref;
  const { data } = await octokit.repos.getContent(params);
  return data;
}

export async function getFileContent(accessToken: string, owner: string, repo: string, path: string, ref?: string) {
  const octokit = getOctokit(accessToken);
  const params: any = { owner, repo, path };
  if (ref) params.ref = ref;
  const { data } = await octokit.repos.getContent(params);
  if ('content' in data && data.type === 'file') {
    return {
      ...data,
      decodedContent: Buffer.from(data.content, 'base64').toString('utf-8'),
    };
  }
  return data;
}

export async function getRepoTree(accessToken: string, owner: string, repo: string, sha: string = 'HEAD') {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.git.getTree({ owner, repo, tree_sha: sha, recursive: 'true' });
  return data;
}

// ==================== REPOSITORY TRAFFIC ====================

export async function getRepoTrafficViews(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getViews({ owner, repo, per: 'day' });
  return data;
}

export async function getRepoTrafficClones(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getClones({ owner, repo, per: 'day' });
  return data;
}

export async function getRepoTrafficReferrers(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getTopReferrers({ owner, repo });
  return data;
}

export async function getRepoTrafficPaths(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getTopPaths({ owner, repo });
  return data;
}

// ==================== ORGANIZATION ====================

export async function getUserOrgs(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.orgs.listForAuthenticatedUser({ per_page: 50 });
  return data;
}

export async function getOrgDetails(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.orgs.get({ org });
  return data;
}

export async function getOrgMembers(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.orgs.listMembers({ org, per_page: 100 });
  return data;
}

export async function getOrgTeams(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.teams.list({ org, per_page: 100 });
  return data;
}

export async function getOrgRepos(accessToken: string, org: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForOrg({ org, sort: 'updated', per_page: 50 });
  return data;
}


export async function getGitGraph(accessToken: string, owner: string, repo: string, perPage: number = 100) {
  const octokit = getOctokit(accessToken);

  // Fetch all branches and default branch
  const [{ data: branches }, { data: repoInfo }] = await Promise.all([
    octokit.repos.listBranches({ owner, repo, per_page: 100 }),
    octokit.repos.get({ owner, repo }),
  ]);
  const defaultBranch = repoInfo.default_branch;
  
  // Fetch commits for each branch with parent info
  const branchCommits = await Promise.all(
    branches.map(async (branch) => {
      try {
        const { data: commits } = await octokit.repos.listCommits({
          owner,
          repo,
          sha: branch.name,
          per_page: perPage,
        });
        return {
          branch: branch.name,
          protected: branch.protected,
          commits: commits.map((c: any) => ({
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            message: c.commit.message.split(/\r?\n/)[0],
            fullMessage: c.commit.message,
            author: {
              name: c.commit.author?.name || 'Unknown',
              email: c.commit.author?.email || '',
              date: c.commit.author?.date || '',
              avatar: c.author?.avatar_url || '',
              login: c.author?.login || '',
            },
            parents: c.parents.map((p: any) => p.sha),
            htmlUrl: c.html_url,
          })),
        };
      } catch {
        return { branch: branch.name, protected: branch.protected, commits: [] };
      }
    })
  );

  // Build unified commit map and calculate graph lanes
  const commitMap = new Map<string, any>();
  const branchHeads = new Map<string, string>();

  branchCommits.forEach(({ branch, commits, protected: isProtected }) => {
    if (commits.length > 0) {
      branchHeads.set(branch, commits[0].sha);
    }
    commits.forEach((commit: any) => {
      if (!commitMap.has(commit.sha)) {
        commitMap.set(commit.sha, { ...commit, branches: [branch] });
      } else {
        const existing = commitMap.get(commit.sha);
        if (!existing.branches.includes(branch)) {
          existing.branches.push(branch);
        }
      }
    });
  });

  // Sort commits by date (newest first)
  const allCommits = Array.from(commitMap.values()).sort(
    (a, b) => new Date(b.author.date).getTime() - new Date(a.author.date).getTime()
  );

  // Assign lanes to branches for visualization
  const branchLanes: Record<string, number> = {};
  let laneIndex = 0;
  branches.forEach((b) => {
    branchLanes[b.name] = laneIndex++;
  });

  return {
    branches: branches.map((b) => ({
      name: b.name,
      protected: b.protected,
      headSha: branchHeads.get(b.name) || '',
      lane: branchLanes[b.name],
      isDefault: b.name === defaultBranch,
    })),
    commits: allCommits,
    branchLanes,
    totalCommits: allCommits.length,
    defaultBranch,
  };
}

export async function getUserIssues(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listForAuthenticatedUser({ 
    filter: 'all',
    state: 'open', 
    sort: 'updated', 
    per_page: 50 
  });
  // Filter out PRs since GitHub API returns them mixed with issues
  return data.filter((issue: any) => !issue.pull_request);
}

// Get issues for a specific repository
export async function getRepoIssues(accessToken: string, owner: string, repo: string, state: string = 'open') {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: state as 'open' | 'closed' | 'all',
    sort: 'updated',
    per_page: 50,
  });
  // Filter out PRs
  return data.filter((issue: any) => !issue.pull_request).map((issue: any) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    body: issue.body,
    user: {
      login: issue.user?.login,
      avatar_url: issue.user?.avatar_url,
      html_url: issue.user?.html_url,
    },
    labels: issue.labels,
    assignees: issue.assignees,
    milestone: issue.milestone,
    comments: issue.comments,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    html_url: issue.html_url,
  }));
}

// Get single issue with full details
export async function getIssueDetails(accessToken: string, owner: string, repo: string, issueNumber: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
  
  return {
    id: data.id,
    number: data.number,
    title: data.title,
    state: data.state,
    state_reason: data.state_reason,
    body: data.body,
    body_html: data.body_html,
    user: {
      login: data.user?.login,
      avatar_url: data.user?.avatar_url,
      html_url: data.user?.html_url,
    },
    labels: data.labels,
    assignees: data.assignees?.map((a: any) => ({
      login: a.login,
      avatar_url: a.avatar_url,
    })),
    milestone: data.milestone ? {
      number: data.milestone.number,
      title: data.milestone.title,
      state: data.milestone.state,
    } : null,
    comments: data.comments,
    created_at: data.created_at,
    updated_at: data.updated_at,
    closed_at: data.closed_at,
    closed_by: data.closed_by ? {
      login: data.closed_by.login,
      avatar_url: data.closed_by.avatar_url,
    } : null,
    html_url: data.html_url,
    reactions: data.reactions,
  };
}

// Get issue comments
export async function getIssueComments(accessToken: string, owner: string, repo: string, issueNumber: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  
  return data.map((comment: any) => ({
    id: comment.id,
    body: comment.body,
    body_html: comment.body_html,
    user: {
      login: comment.user?.login,
      avatar_url: comment.user?.avatar_url,
      html_url: comment.user?.html_url,
    },
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    html_url: comment.html_url,
    reactions: comment.reactions,
  }));
}

// Create a new issue
export async function createIssue(accessToken: string, owner: string, repo: string, options: {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.create({ owner, repo, ...options });
  return {
    id: data.id,
    number: data.number,
    title: data.title,
    state: data.state,
    body: data.body,
    user: { login: data.user?.login, avatar_url: data.user?.avatar_url, html_url: data.user?.html_url },
    labels: data.labels,
    assignees: data.assignees,
    milestone: data.milestone,
    comments: data.comments,
    created_at: data.created_at,
    updated_at: data.updated_at,
    closed_at: data.closed_at,
    html_url: data.html_url,
  };
}

// Update an existing issue (title, body, state, labels, assignees)
export async function updateIssue(accessToken: string, owner: string, repo: string, issueNumber: number, options: {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened';
  labels?: string[];
  assignees?: string[];
  milestone?: number | null;
}) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.update({ owner, repo, issue_number: issueNumber, ...options });
  return {
    id: data.id,
    number: data.number,
    title: data.title,
    state: data.state,
    body: data.body,
    user: { login: data.user?.login, avatar_url: data.user?.avatar_url, html_url: data.user?.html_url },
    labels: data.labels,
    assignees: data.assignees,
    milestone: data.milestone,
    comments: data.comments,
    created_at: data.created_at,
    updated_at: data.updated_at,
    closed_at: data.closed_at,
    html_url: data.html_url,
  };
}

export async function getUserPullRequests(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.issuesAndPullRequests({ q: 'is:pr is:open author:@me', sort: 'updated', per_page: 30 });
  return data.items;
}

export async function getRepoWorkflowRuns(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 20 });
  return data.workflow_runs;
}

export async function getContributorStats(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  // GitHub may return 202 while computing stats, retry up to 3 times
  for (let i = 0; i < 3; i++) {
    const res = await octokit.repos.getContributorsStats({ owner, repo });
    if (res.status === 200 && res.data) {
      return (res.data as any[]).map(c => ({
        login: c.author.login,
        avatarUrl: c.author.avatar_url,
        profileUrl: c.author.html_url,
        totalCommits: c.total,
        additions: c.weeks.reduce((sum: number, w: any) => sum + w.a, 0),
        deletions: c.weeks.reduce((sum: number, w: any) => sum + w.d, 0),
      })).sort((a, b) => b.totalCommits - a.totalCommits);
    }
    await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
  }
  return [];
}


// ==================== DIFF / COMPARE ====================

export async function compareBranches(accessToken: string, owner: string, repo: string, base: string, head: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  });
  return {
    status: data.status,
    ahead_by: data.ahead_by,
    behind_by: data.behind_by,
    total_commits: data.total_commits,
    commits: data.commits.map((c: any) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: c.commit.message.split(/\r?\n/)[0],
      author: {
        name: c.commit.author?.name || 'Unknown',
        date: c.commit.author?.date || '',
        avatar: c.author?.avatar_url || '',
        login: c.author?.login || '',
      },
      htmlUrl: c.html_url,
    })),
    files: data.files?.map((f: any) => ({
      sha: f.sha,
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
      blob_url: f.blob_url,
      raw_url: f.raw_url,
    })) || [],
    base_commit: {
      sha: data.base_commit.sha,
      message: data.base_commit.commit.message.split(/\r?\n/)[0],
    },
    merge_base_commit: {
      sha: data.merge_base_commit.sha,
      message: data.merge_base_commit.commit.message.split(/\r?\n/)[0],
    },
  };
}

export async function compareCommits(accessToken: string, owner: string, repo: string, base: string, head: string) {
  return compareBranches(accessToken, owner, repo, base, head);
}

// ==================== RELEASES ====================

export async function getRepoReleases(accessToken: string, owner: string, repo: string, page: number = 1) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listReleases({ owner, repo, per_page: 20, page });
  return data.map((r: any) => ({
    id: r.id,
    tag_name: r.tag_name,
    name: r.name,
    body: r.body,
    draft: r.draft,
    prerelease: r.prerelease,
    created_at: r.created_at,
    published_at: r.published_at,
    author: {
      login: r.author.login,
      avatar_url: r.author.avatar_url,
    },
    html_url: r.html_url,
    tarball_url: r.tarball_url,
    zipball_url: r.zipball_url,
    assets: r.assets.map((a: any) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      download_count: a.download_count,
      browser_download_url: a.browser_download_url,
      content_type: a.content_type,
    })),
  }));
}

export async function getRepoTags(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listTags({ owner, repo, per_page: 50 });
  return data;
}

export async function getRelease(accessToken: string, owner: string, repo: string, releaseId: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getRelease({ owner, repo, release_id: releaseId });
  return data;
}

export async function getReleaseAssets(accessToken: string, owner: string, repo: string, releaseId: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listReleaseAssets({ owner, repo, release_id: releaseId });
  return data;
}

export async function createRelease(accessToken: string, owner: string, repo: string, options: {
  tag_name: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  target_commitish?: string;
}) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.createRelease({
    owner,
    repo,
    ...options,
  });
  return data;
}

// ==================== INSIGHTS / STATS ====================

export async function getCodeFrequency(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  for (let i = 0; i < 3; i++) {
    const res = await octokit.repos.getCodeFrequencyStats({ owner, repo });
    if (res.status === 200 && res.data) {
      // Data is array of [timestamp, additions, deletions]
      return (res.data as any[]).map((week: number[]) => ({
        week: new Date(week[0] * 1000).toISOString(),
        additions: week[1],
        deletions: week[2],
      }));
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return [];
}

export async function getCommitActivity(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  for (let i = 0; i < 3; i++) {
    const res = await octokit.repos.getCommitActivityStats({ owner, repo });
    if (res.status === 200 && res.data) {
      return (res.data as any[]).map((week: any) => ({
        week: new Date(week.week * 1000).toISOString(),
        total: week.total,
        days: week.days, // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
      }));
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return [];
}

export async function getPunchCard(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  for (let i = 0; i < 3; i++) {
    const res = await octokit.repos.getPunchCardStats({ owner, repo });
    if (res.status === 200 && res.data) {
      // Data is array of [day, hour, commits]
      return (res.data as any[]).map((item: number[]) => ({
        day: item[0], // 0=Sunday, 6=Saturday
        hour: item[1],
        commits: item[2],
      }));
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return [];
}

export async function getParticipation(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  for (let i = 0; i < 3; i++) {
    const res = await octokit.repos.getParticipationStats({ owner, repo });
    if (res.status === 200 && res.data) {
      return {
        all: res.data.all,
        owner: res.data.owner,
      };
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return { all: [], owner: [] };
}

export async function getCommunityProfile(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.repos.getCommunityProfileMetrics({ owner, repo });
    return data;
  } catch {
    return null;
  }
}

// ==================== SECURITY ALERTS ====================

export async function getDependabotAlerts(accessToken: string, owner: string, repo: string, state: string = 'open', severity?: string) {
  const octokit = getOctokit(accessToken);
  try {
    const params: any = { owner, repo, state, per_page: 50 };
    if (severity) params.severity = severity;
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/dependabot/alerts', params);
    return data;
  } catch (err: any) {
    if (err.status === 403 || err.status === 404) {
      return [];
    }
    throw err;
  }
}

export async function getCodeScanningAlerts(accessToken: string, owner: string, repo: string, state: string = 'open') {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/code-scanning/alerts', {
      owner,
      repo,
      state,
      per_page: 50,
    });
    return data;
  } catch (err: any) {
    if (err.status === 403 || err.status === 404) {
      return [];
    }
    throw err;
  }
}

export async function getSecretScanningAlerts(accessToken: string, owner: string, repo: string, state: string = 'open') {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/secret-scanning/alerts', {
      owner,
      repo,
      state,
      per_page: 50,
    });
    return data;
  } catch (err: any) {
    if (err.status === 403 || err.status === 404) {
      return [];
    }
    throw err;
  }
}

export async function getSecurityAlerts(accessToken: string, owner: string, repo: string) {
  const [dependabot, codeScanning, secretScanning] = await Promise.all([
    getDependabotAlerts(accessToken, owner, repo).catch(() => []),
    getCodeScanningAlerts(accessToken, owner, repo).catch(() => []),
    getSecretScanningAlerts(accessToken, owner, repo).catch(() => []),
  ]);
  
  return {
    dependabot,
    codeScanning,
    secretScanning,
    summary: {
      dependabot: dependabot.length,
      codeScanning: codeScanning.length,
      secretScanning: secretScanning.length,
      total: dependabot.length + codeScanning.length + secretScanning.length,
    },
  };
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(accessToken: string, all: boolean = false, participating: boolean = false, page: number = 1) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.activity.listNotificationsForAuthenticatedUser({
    all,
    participating,
    per_page: 50,
    page,
  });
  return data.map((n: any) => ({
    id: n.id,
    unread: n.unread,
    reason: n.reason,
    updated_at: n.updated_at,
    last_read_at: n.last_read_at,
    subject: {
      title: n.subject.title,
      url: n.subject.url,
      type: n.subject.type,
      latest_comment_url: n.subject.latest_comment_url,
    },
    repository: {
      id: n.repository.id,
      name: n.repository.name,
      full_name: n.repository.full_name,
      owner: {
        login: n.repository.owner.login,
        avatar_url: n.repository.owner.avatar_url,
      },
      html_url: n.repository.html_url,
    },
    url: n.url,
    subscription_url: n.subscription_url,
  }));
}

export async function getNotificationThread(accessToken: string, threadId: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.activity.getThread({ thread_id: threadId });
  return data;
}

export async function markNotificationAsRead(accessToken: string, threadId: number) {
  const octokit = getOctokit(accessToken);
  await octokit.activity.markThreadAsRead({ thread_id: threadId });
}

export async function markAllNotificationsAsRead(accessToken: string) {
  const octokit = getOctokit(accessToken);
  await octokit.activity.markNotificationsAsRead();
}


// ==================== REPOSITORY SETTINGS ====================

export async function getRepoSettings(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    description: data.description,
    private: data.private,
    fork: data.fork,
    default_branch: data.default_branch,
    visibility: data.visibility,
    has_issues: data.has_issues,
    has_projects: data.has_projects,
    has_wiki: data.has_wiki,
    has_pages: data.has_pages,
    has_downloads: data.has_downloads,
    allow_squash_merge: data.allow_squash_merge,
    allow_merge_commit: data.allow_merge_commit,
    allow_rebase_merge: data.allow_rebase_merge,
    allow_auto_merge: data.allow_auto_merge,
    delete_branch_on_merge: data.delete_branch_on_merge,
    archived: data.archived,
    disabled: data.disabled,
    topics: data.topics,
    license: data.license,
    permissions: data.permissions,
  };
}

export async function getBranchProtection(accessToken: string, owner: string, repo: string, branch: string) {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.repos.getBranchProtection({ owner, repo, branch });
    return {
      protected: true,
      required_status_checks: data.required_status_checks,
      enforce_admins: data.enforce_admins,
      required_pull_request_reviews: data.required_pull_request_reviews,
      restrictions: data.restrictions,
      required_linear_history: data.required_linear_history,
      allow_force_pushes: data.allow_force_pushes,
      allow_deletions: data.allow_deletions,
      required_conversation_resolution: data.required_conversation_resolution,
    };
  } catch (err: any) {
    // 404 = not protected, 403 = requires GitHub Pro for private repos
    if (err.status === 404 || err.status === 403) {
      return { protected: false, reason: err.status === 403 ? 'requires_pro' : 'not_protected' };
    }
    throw err;
  }
}

export async function updateBranchProtection(accessToken: string, owner: string, repo: string, branch: string, settings: any) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.updateBranchProtection({
    owner,
    repo,
    branch,
    ...settings,
  });
  return data;
}

export async function getCollaborators(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listCollaborators({ owner, repo, per_page: 100 });
  return data.map((c: any) => ({
    id: c.id,
    login: c.login,
    avatar_url: c.avatar_url,
    html_url: c.html_url,
    permissions: c.permissions,
    role_name: c.role_name,
  }));
}

export async function getRepoWebhooks(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.repos.listWebhooks({ owner, repo, per_page: 50 });
    return data.map((h: any) => ({
      id: h.id,
      name: h.name,
      active: h.active,
      events: h.events,
      config: {
        url: h.config.url,
        content_type: h.config.content_type,
        insecure_ssl: h.config.insecure_ssl,
      },
      created_at: h.created_at,
      updated_at: h.updated_at,
    }));
  } catch (err: any) {
    if (err.status === 404) return [];
    throw err;
  }
}

export async function getRepoTopics(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.getAllTopics({ owner, repo });
  return data.names;
}

export async function updateRepoTopics(accessToken: string, owner: string, repo: string, names: string[]) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.replaceAllTopics({ owner, repo, names });
  return data.names;
}

// ==================== DEPENDENCY GRAPH ====================

export async function getDependencyGraph(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  try {
    // Get dependency graph via SBOM export
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/dependency-graph/sbom', {
      owner,
      repo,
    });
    
    const sbom = data.sbom;
    const packages = sbom.packages || [];
    
    // Group by ecosystem
    const byEcosystem: Record<string, any[]> = {};
    packages.forEach((pkg: any) => {
      // Extract ecosystem from PURL or external refs
      let ecosystem = 'unknown';
      if (pkg.externalRefs) {
        const purl = pkg.externalRefs.find((r: any) => r.referenceType === 'purl');
        if (purl) {
          const match = purl.referenceLocator.match(/^pkg:(\w+)\//);
          if (match) ecosystem = match[1];
        }
      }
      
      if (!byEcosystem[ecosystem]) byEcosystem[ecosystem] = [];
      byEcosystem[ecosystem].push({
        name: pkg.name,
        version: pkg.versionInfo,
        license: pkg.licenseConcluded || pkg.licenseDeclared,
      });
    });
    
    return {
      name: sbom.name,
      createdAt: sbom.creationInfo?.created,
      packages: packages.length,
      ecosystems: Object.entries(byEcosystem).map(([name, deps]) => ({
        name,
        count: deps.length,
        dependencies: deps,
      })),
    };
  } catch (err: any) {
    if (err.status === 404 || err.status === 403) {
      return { packages: 0, ecosystems: [] };
    }
    throw err;
  }
}

// ==================== MILESTONES & PROJECTS ====================

export async function getRepoMilestones(accessToken: string, owner: string, repo: string, state: string = 'open') {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listMilestones({
    owner,
    repo,
    state: state as 'open' | 'closed' | 'all',
    sort: 'due_on',
    direction: 'asc',
    per_page: 50,
  });
  return data.map((m: any) => ({
    id: m.id,
    number: m.number,
    title: m.title,
    description: m.description,
    state: m.state,
    open_issues: m.open_issues,
    closed_issues: m.closed_issues,
    created_at: m.created_at,
    updated_at: m.updated_at,
    due_on: m.due_on,
    closed_at: m.closed_at,
    html_url: m.html_url,
    progress: m.open_issues + m.closed_issues > 0 
      ? Math.round((m.closed_issues / (m.open_issues + m.closed_issues)) * 100) 
      : 0,
  }));
}

export async function getMilestone(accessToken: string, owner: string, repo: string, number: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.getMilestone({ owner, repo, milestone_number: number });
  return data;
}

export async function createMilestone(accessToken: string, owner: string, repo: string, options: {
  title: string;
  description?: string;
  due_on?: string;
  state?: 'open' | 'closed';
}) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.createMilestone({ owner, repo, ...options });
  return data;
}

export async function updateMilestone(accessToken: string, owner: string, repo: string, number: number, options: {
  title?: string;
  description?: string;
  due_on?: string;
  state?: 'open' | 'closed';
}) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.updateMilestone({ owner, repo, milestone_number: number, ...options });
  return data;
}

export async function getRepoProjects(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.projects.listForRepo({ owner, repo, state: 'open', per_page: 30 });
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      body: p.body,
      state: p.state,
      created_at: p.created_at,
      updated_at: p.updated_at,
      html_url: p.html_url,
      columns_url: p.columns_url,
    }));
  } catch (err: any) {
    // 410 = Projects disabled, 404 = Not found or no projects feature
    if (err.status === 410 || err.status === 404) return [];
    throw err;
  }
}

export async function getProjectColumns(accessToken: string, projectId: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.projects.listColumns({ project_id: projectId });
  return data.map((c: any) => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
    updated_at: c.updated_at,
    cards_url: c.cards_url,
  }));
}

export async function getColumnCards(accessToken: string, columnId: number) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.projects.listCards({ column_id: columnId, per_page: 100 });
  return data;
}

// ==================== USER PROFILE ====================

export async function getUserProfile(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.users.getAuthenticated();
  return {
    id: data.id,
    login: data.login,
    name: data.name,
    email: data.email,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
    bio: data.bio,
    company: data.company,
    location: data.location,
    blog: data.blog,
    twitter_username: data.twitter_username,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    followers: data.followers,
    following: data.following,
    created_at: data.created_at,
    updated_at: data.updated_at,
    private_gists: data.private_gists,
    total_private_repos: data.total_private_repos,
    owned_private_repos: data.owned_private_repos,
    disk_usage: data.disk_usage,
    collaborators: data.collaborators,
    two_factor_authentication: data.two_factor_authentication,
    plan: data.plan,
  };
}

export async function getRateLimit(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.rateLimit.get();
  return {
    resources: {
      core: {
        limit: data.resources.core.limit,
        remaining: data.resources.core.remaining,
        reset: new Date(data.resources.core.reset * 1000).toISOString(),
        used: data.resources.core.used,
      },
      search: {
        limit: data.resources.search.limit,
        remaining: data.resources.search.remaining,
        reset: new Date(data.resources.search.reset * 1000).toISOString(),
        used: data.resources.search.used,
      },
      graphql: {
        limit: data.resources.graphql.limit,
        remaining: data.resources.graphql.remaining,
        reset: new Date(data.resources.graphql.reset * 1000).toISOString(),
        used: data.resources.graphql.used,
      },
    },
    rate: {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000).toISOString(),
      used: data.rate.used,
    },
  };
}

export async function getUserEmails(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.users.listEmailsForAuthenticatedUser();
  return data;
}

export async function getReceivedEvents(accessToken: string, username: string, page: number = 1) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.activity.listReceivedEventsForUser({
    username,
    per_page: 50,
    page,
  });
  return data.map((e: any) => ({
    id: e.id,
    type: e.type,
    actor: {
      login: e.actor.login,
      avatar_url: e.actor.avatar_url,
    },
    repo: {
      name: e.repo.name,
      url: `https://github.com/${e.repo.name}`,
    },
    payload: e.payload,
    created_at: e.created_at,
  }));
}

export async function getUserActivity(accessToken: string, username: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.activity.listEventsForAuthenticatedUser({
    username,
    per_page: 100,
  });
  
  // Group events by type
  const byType: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  
  data.forEach((e: any) => {
    byType[e.type] = (byType[e.type] || 0) + 1;
    const day = e.created_at.split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });
  
  return {
    total: data.length,
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    byDay: Object.entries(byDay).map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    recentEvents: data.slice(0, 20).map((e: any) => ({
      id: e.id,
      type: e.type,
      repo: e.repo.name,
      created_at: e.created_at,
    })),
  };
}
