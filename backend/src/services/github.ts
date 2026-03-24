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

export async function getRepoBranches(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 50 });
  return data;
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
  
  // Fetch all branches
  const { data: branches } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
  
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
    })),
    commits: allCommits,
    branchLanes,
    totalCommits: allCommits.length,
  };
}

export async function getUserIssues(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listForAuthenticatedUser({ 
  filter: 'all',  // Shows all issues: created by, assigned to, or mentioning the user
  state: 'open', 
  sort: 'updated', 
  per_page: 50 
});
// Also filters out PRs since GitHub API returns them mixed with issues
return data.filter((issue: any) => !issue.pull_request);

  return data;
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

