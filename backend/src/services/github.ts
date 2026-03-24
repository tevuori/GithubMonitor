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

export async function getUserIssues(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.issues.listForAuthenticatedUser({
    state: 'open', sort: 'updated', per_page: 50
  });
  return data;
}

export async function getUserPullRequests(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.search.issuesAndPullRequests({
    q: 'is:pr is:open author:@me',
    sort: 'updated',
    per_page: 30
  });
  return data.items;
}

export async function getRepoWorkflowRuns(accessToken: string, owner: string, repo: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner, repo, per_page: 20
  });
  return data.workflow_runs;
}
