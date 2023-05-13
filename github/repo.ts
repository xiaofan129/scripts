/**
 * Using the GitHub API(REST) to get repository information
 */

import { resolve } from "node:path";
import axios from "axios";
import { uiRepos } from "./data";
import { ensureDir, writeJSON } from "fs-extra";
import "dotenv/config";

export interface RepoItemProp {
  stamp: string;

  owner: string;
  repo: string;
  html_url: string;
  description?: string;
  topics?: string[];
  license?: string;
  homepage?: string;

  created_at: string;
  updated_at: string;
  commits: number;
  stars: number;
  forks: number;
  watch: number;
  contributors: number;
  // 0 = closed, 1 = open
  pulls0: number;
  pulls1: number;
  issues0: number;
  issues1: number;
}

function createRequest(owner: string, repo: string) {
  return axios.create({
    baseURL: `https://api.github.com/repos/${owner}/${repo}`,
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
    },
  });
}

async function dump(owner: string, repo: string) {
  const req = createRequest(owner, repo);
  const stamp = new Date().toISOString();
  const basic = (await req.get("")).data;
  let result: RepoItemProp = {
    stamp,
    owner,
    repo,

    homepage: basic.homepage,
    html_url: basic.html_url,
    description: basic.description,
    created_at: basic.created_at,
    updated_at: basic.updated_at,
    license: basic.license?.name,
    topics: basic.topics,
    stars: basic.stargazers_count,
    forks: basic.forks_count,
    watch: basic.subscribers_count,

    commits: await parseLink("/commits"),
    contributors: await parseLink("/contributors"),
    pulls0: await parseLink("/pulls", { state: "closed" }),
    pulls1: await parseLink("/pulls", { state: "open" }),
    issues0: await parseLink("/issues", { state: "closed" }),
    issues1: await parseLink("/issues", { state: "open" }),
  };

  return result;

  async function parseLink(path: string, params = {}) {
    const resp = await req.get(path, {
      params: {
        ...params,
        per_page: 1,
      },
    });
    const link = resp.headers?.link;
    if (link) {
      return parseInt(link.match(/page=(\d+)>; rel="last"/)?.[1] ?? -1);
    }
    return -1;
  }
}

async function main(saveSingle = true) {
  const delay = (timeout: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  const saveTempDir = resolve(__dirname, "temp");
  await ensureDir(saveTempDir);
  const list = uiRepos.map((item) => item.split("/"));
  const saveList = await Promise.all(
    list.map(async ([owner, repo], index) => {
      const timeout = 1e3 * index;
      await delay(timeout);
      console.log(`delay ${timeout}ms ---start ${owner}/${repo}---`);
      const result = await dump(owner, repo);
      const cost = Date.now() - new Date(result.stamp).getTime();
      console.log(`spend ${cost}ms ---end ${owner}/${repo}---`);
      if (saveSingle) {
        const saveto = resolve(saveTempDir, `${owner}-${repo}.json`);
        await writeJSON(saveto, result, {
          spaces: 2,
        });
      }
      return [`${owner}/${repo}`, result];
    })
  );

  const results = saveList.reduce((prev, [key, value]) => {
    prev[key as string] = value;
    return prev;
  }, {});
  await writeJSON(resolve(__dirname, "ui.json"), results, { spaces: 2 });
  console.log("---ok---");
}

main();
