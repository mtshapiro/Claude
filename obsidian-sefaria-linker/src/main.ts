import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

interface SefariaLinkerSettings {
	autoRun: boolean;
	autoRunDelay: number;
}

const DEFAULT_SETTINGS: SefariaLinkerSettings = {
	autoRun: true,
	autoRunDelay: 1500,
};

interface RefResult {
	startChar: number;
	endChar: number;
	text: string;
	refs: string[];
}

interface RefData {
	url: string;
	[key: string]: unknown;
}

interface FindRefsResponse {
	task_id: string;
}

interface AsyncTaskResponse {
	state: string;
	result?: {
		body: {
			results: RefResult[];
			refData: Record<string, RefData>;
		};
	};
	error?: string;
}

function rangesOverlap(
	aStart: number,
	aEnd: number,
	bStart: number,
	bEnd: number
): boolean {
	return aStart < bEnd && bStart < aEnd;
}

function getExistingSefariaLinkRanges(content: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const linkRegex = /\[([^\]]+)\]\(https:\/\/www\.sefaria\.org\/[^)]+\)/g;
	let match: RegExpExecArray | null;
	while ((match = linkRegex.exec(content)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
	}
	return ranges;
}

async function pollAsyncTask(taskId: string): Promise<AsyncTaskResponse> {
	const maxAttempts = 30;
	for (let i = 0; i < maxAttempts; i++) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const resp = await fetch(
			`https://www.sefaria.org/api/async/${taskId}`
		);
		if (!resp.ok) {
			throw new Error(`Polling failed with status ${resp.status}`);
		}
		const data: AsyncTaskResponse = await resp.json();
		if (data.state === "SUCCESS") {
			return data;
		}
		if (data.state === "FAILURE") {
			throw new Error(data.error ?? "Task failed");
		}
	}
	throw new Error("Timed out waiting for Sefaria response (30s)");
}

async function linkCitations(app: App, file: TFile): Promise<void> {
	const content = await app.vault.read(file);

	// Submit the find-refs job
	const submitResp = await fetch("https://www.sefaria.org/api/find-refs", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: { title: "", body: content },
			lang: "en",
		}),
	});

	if (submitResp.status !== 202) {
		throw new Error(`Unexpected status from find-refs: ${submitResp.status}`);
	}

	const { task_id }: FindRefsResponse = await submitResp.json();
	const taskResult = await pollAsyncTask(task_id);

	if (!taskResult.result) {
		throw new Error("Task succeeded but returned no result");
	}

	const { results, refData } = taskResult.result.body;

	if (!results || results.length === 0) {
		new Notice("No citations found");
		return;
	}

	// Collect existing Sefaria link ranges so we don't double-link
	const existingRanges = getExistingSefariaLinkRanges(content);

	// Deduplicate: track which refs have been processed and which char ranges
	const processedRefs = new Set<string>();
	const processedRanges: Array<[number, number]> = [];

	// Sort descending by startChar so we can replace without shifting positions
	const sorted = [...results].sort((a, b) => b.startChar - a.startChar);

	let newContent = content;
	let linkedCount = 0;

	for (const result of sorted) {
		const ref = result.refs?.[0];
		if (!ref) continue;

		const refInfo = refData[ref];
		if (!refInfo?.url) continue;

		// Skip if this ref was already linked
		if (processedRefs.has(ref)) continue;

		const { startChar, endChar, text } = result;

		// Skip if overlaps with an existing Sefaria link
		const overlapsExisting = existingRanges.some(([s, e]) =>
			rangesOverlap(startChar, endChar, s, e)
		);
		if (overlapsExisting) continue;

		// Skip if overlaps with a range we already processed this run
		const overlapsProcessed = processedRanges.some(([s, e]) =>
			rangesOverlap(startChar, endChar, s, e)
		);
		if (overlapsProcessed) continue;

		const url = `https://www.sefaria.org/${refInfo.url}`;
		const replacement = `[${text}](${url})`;

		newContent =
			newContent.slice(0, startChar) +
			replacement +
			newContent.slice(endChar);

		processedRefs.add(ref);
		processedRanges.push([startChar, endChar]);
		linkedCount++;
	}

	if (linkedCount === 0) {
		new Notice("No citations found");
		return;
	}

	await app.vault.modify(file, newContent);
	new Notice(`Linked ${linkedCount} citation${linkedCount === 1 ? "" : "s"}`);
}

export default class SefariaLinkerPlugin extends Plugin {
	settings: SefariaLinkerSettings;
	private autoRunTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "link-citations",
			name: "Link citations in current note",
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					new Notice("No active file");
					return;
				}
				try {
					await linkCitations(this.app, file);
				} catch (err) {
					new Notice(`Sefaria Linker error: ${(err as Error).message}`);
				}
			},
		});

		this.addCommand({
			id: "toggle-auto-run",
			name: "Toggle auto-run",
			callback: async () => {
				this.settings.autoRun = !this.settings.autoRun;
				await this.saveSettings();
				new Notice(
					`Sefaria auto-run ${this.settings.autoRun ? "enabled" : "disabled"}`
				);
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!this.settings.autoRun || !file) return;

				if (this.autoRunTimer !== null) {
					window.clearTimeout(this.autoRunTimer);
				}

				this.autoRunTimer = window.setTimeout(async () => {
					this.autoRunTimer = null;
					try {
						await linkCitations(this.app, file);
					} catch (err) {
						new Notice(
							`Sefaria Linker error: ${(err as Error).message}`
						);
					}
				}, this.settings.autoRunDelay);
			})
		);

		this.addSettingTab(new SefariaLinkerSettingTab(this.app, this));
	}

	onunload() {
		if (this.autoRunTimer !== null) {
			window.clearTimeout(this.autoRunTimer);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SefariaLinkerSettingTab extends PluginSettingTab {
	plugin: SefariaLinkerPlugin;

	constructor(app: App, plugin: SefariaLinkerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Sefaria Linker Settings" });

		new Setting(containerEl)
			.setName("Auto-run on file open")
			.setDesc(
				"Automatically detect and link citations when a note is opened."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoRun)
					.onChange(async (value) => {
						this.plugin.settings.autoRun = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-run delay (ms)")
			.setDesc(
				"How long to wait after opening a file before running (milliseconds)."
			)
			.addText((text) =>
				text
					.setPlaceholder("1500")
					.setValue(String(this.plugin.settings.autoRunDelay))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!isNaN(parsed) && parsed >= 0) {
							this.plugin.settings.autoRunDelay = parsed;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
