/**
 * GitHub API service
 */

import { CONFIG } from "../config/index.ts";
import type { GitHubRelease, GitHubRepository } from "../types/types.ts";

export class GitHubService {
	private readonly apiUrl = CONFIG.GITHUB.apiUrl;
	private readonly rateLimit = CONFIG.GITHUB.rateLimit;

	async fetchRepository(
		owner: string,
		repo: string,
	): Promise<GitHubRepository> {
		const url = `${this.apiUrl}/repos/${owner}/${repo}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch repository: ${response.statusText}`);
		}

		return response.json();
	}

	async fetchLatestRelease(
		owner: string,
		repo: string,
	): Promise<GitHubRelease> {
		const url = `${this.apiUrl}/repos/${owner}/${repo}/releases/latest`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch latest release: ${response.statusText}`);
		}

		return response.json();
	}

	async fetchRelease(
		owner: string,
		repo: string,
		tag: string,
	): Promise<GitHubRelease> {
		const url = `${this.apiUrl}/repos/${owner}/${repo}/releases/tags/${tag}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch release ${tag}: ${response.statusText}`);
		}

		return response.json();
	}

	async fetchReleases(
		owner: string,
		repo: string,
		limit = 10,
	): Promise<GitHubRelease[]> {
		const url = `${this.apiUrl}/repos/${owner}/${repo}/releases?per_page=${limit}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch releases: ${response.statusText}`);
		}

		return response.json();
	}
}
