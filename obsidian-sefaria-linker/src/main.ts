import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { expandShortforms, expandPageRanges, mapToOriginal } from "./expansions";

// ── Settings ──────────────────────────────────────────────────────────────────

interface SefariaLinkerSettings {
	autoRun: boolean;
	autoRunDelay: number;
	enableShortformExpansion: boolean;
}

const DEFAULT_SETTINGS: SefariaLinkerSettings = {
	autoRun: false,
	autoRunDelay: 1500,
	enableShortformExpansion: true,
};

// ── Sefaria API types ─────────────────────────────────────────────────────────

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

// ── Contextual reference handling ("the Tosfos there", "Rashi ibid") ─────────

interface LinkedRef {
	origStart: number;
	origEnd: number;
	ref: string;
	refUrl: string;
}

// Matches any capitalized word(s) immediately before "there / ibid / ad loc"
const CONTEXTUAL_RE =
	/\b(?:the\s+)?([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,4})\s+(?:there|ibid\.?|ad\s+loc\.?)\b/g;

// Session-scoped cache: "Name|||refUrl" → resolved URL slug or null
const commentaryCache = new Map<string, string | null>();

async function resolveCommentaryUrl(
	commentatorRaw: string,
	baseRefUrl: string
): Promise<string | null> {
	const name = commentatorRaw.trim().replace(/\s+/g, " ");
	const cacheKey = `${name}|||${baseRefUrl}`;
	if (commentaryCache.has(cacheKey)) return commentaryCache.get(cacheKey)!;

	// "Avodah_Zarah.75b" → "Avodah Zarah 75b"
	const baseRef = baseRefUrl.replace(/_/g, " ").replace(/\.(\d)/, " $1");
	const candidateRef = `${name} on ${baseRef}`;

	try {
		const resp = await fetch(
			`https://www.sefaria.org/api/texts/${encodeURIComponent(candidateRef)}?context=0&pad=0`
		);
		if (!resp.ok) { commentaryCache.set(cacheKey, null); return null; }
		const data = await resp.json();
		if (data.error || !data.ref) { commentaryCache.set(cacheKey, null); return null; }
		const url: string = data.url ?? (data.ref as string).replace(/\s/g, "_");
		commentaryCache.set(cacheKey, url);
		return url;
	} catch {
		commentaryCache.set(cacheKey, null);
		return null;
	}
}

async function resolveContextualRefs(
	content: string,
	linkedRefs: LinkedRef[],
	existingRanges: Array<[number, number]>
): Promise<{ content: string; count: number }> {
	if (linkedRefs.length === 0) return { content, count: 0 };

	const sortedRefs = [...linkedRefs].sort((a, b) => a.origStart - b.origStart);

	interface ContextualMatch {
		start: number;
		end: number;
		fullMatch: string;
		commentatorRaw: string;
	}

	const matches: ContextualMatch[] = [];
	CONTEXTUAL_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = CONTEXTUAL_RE.exec(content)) !== null) {
		if (existingRanges.some(([s, e]) => rangesOverlap(m!.index, m!.index + m![0].length, s, e)))
			continue;
		matches.push({ start: m.index, end: m.index + m[0].length, fullMatch: m[0], commentatorRaw: m[1] });
	}
	if (matches.length === 0) return { content, count: 0 };

	const resolved = await Promise.all(
		matches.map(async (match) => {
			let nearestRef: LinkedRef | null = null;
			for (let i = sortedRefs.length - 1; i >= 0; i--) {
				if (sortedRefs[i].origEnd <= match.start) { nearestRef = sortedRefs[i]; break; }
			}
			if (!nearestRef) return null;
			const url = await resolveCommentaryUrl(match.commentatorRaw, nearestRef.refUrl);
			return url ? { match, url } : null;
		})
	);

	let result = content;
	let count = 0;
	const toApply = resolved
		.filter((r): r is { match: ContextualMatch; url: string } => r !== null)
		.sort((a, b) => b.match.start - a.match.start);

	for (const { match, url } of toApply) {
		const fullUrl = `https://www.sefaria.org/${url}`;
		result = result.slice(0, match.start) + `[${match.fullMatch}](${fullUrl})` + result.slice(match.end);
		count++;
	}
	return { content: result, count };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
	return aStart < bEnd && bStart < aEnd;
}

/**
 * Returns ranges of ALL link-like constructs that must not be touched:
 *   - Standard markdown links:  [text](url)
 *   - Obsidian wiki links:      [[target]]  or  [[target|alias]]
 *
 * Protecting all links (not just Sefaria ones) prevents the plugin from
 * wrapping already-linked text in a second layer of brackets.
 */
function getProtectedRanges(content: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	let m: RegExpExecArray | null;

	// Standard markdown links [text](url)
	const mdRe = /\[([^\]]*)\]\([^)]*\)/g;
	while ((m = mdRe.exec(content)) !== null) {
		ranges.push([m.index, m.index + m[0].length]);
	}

	// Obsidian wiki links [[...]] and [[...|alias]]
	const wikiRe = /\[\[([^\]]*)\]\]/g;
	while ((m = wikiRe.exec(content)) !== null) {
		ranges.push([m.index, m.index + m[0].length]);
	}

	return ranges;
}

// ── Sefaria API ───────────────────────────────────────────────────────────────

async function pollAsyncTask(taskId: string): Promise<AsyncTaskResponse> {
	const maxAttempts = 30;
	for (let i = 0; i < maxAttempts; i++) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const resp = await fetch(`https://www.sefaria.org/api/async/${taskId}`);
		if (!resp.ok) throw new Error(`Polling failed with status ${resp.status}`);
		const data: AsyncTaskResponse = await resp.json();
		if (data.state === "SUCCESS") return data;
		if (data.state === "FAILURE") throw new Error(data.error ?? "Task failed");
	}
	throw new Error("Timed out waiting for Sefaria response (30s)");
}

// ── Core linking logic ────────────────────────────────────────────────────────

async function linkCitations(
	app: App,
	file: TFile,
	settings: SefariaLinkerSettings
): Promise<void> {
	const content = await app.vault.read(file);
	const existingRanges = getProtectedRanges(content);

	// Expand shortforms for API submission, skipping existing links
	const { expandedText: shortformExpanded, substitutions } = settings.enableShortformExpansion
		? expandShortforms(content, existingRanges)
		: { expandedText: content, substitutions: [] };

	// Expand compressed page ranges ("108-9" → "108-109") on the already-expanded text.
	// This is a pure string transform with no position side-effects because
	// expandPageRanges only ever lengthens a range, and mapToOriginal handles
	// the length delta via the substitutions array (ranges that were already
	// expanded by expandShortforms) plus direct offset for untouched text.
	// Ranges that were NOT touched by expandShortforms remain 1-to-1 with the
	// original, so expanding digits there produces a correct result position.
	const expandedText = expandPageRanges(shortformExpanded);

	const submitResp = await fetch("https://www.sefaria.org/api/find-refs", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text: { title: "", body: expandedText }, lang: "en" }),
	});
	if (submitResp.status !== 202) {
		throw new Error(`Unexpected status from find-refs: ${submitResp.status}`);
	}

	const { task_id }: FindRefsResponse = await submitResp.json();
	const taskResult = await pollAsyncTask(task_id);
	if (!taskResult.result) throw new Error("Task succeeded but returned no result");

	const { results, refData } = taskResult.result.body;

	console.log("[SefariaLinker] API returned", results?.length ?? 0, "results:", JSON.stringify(results?.map(r => ({ text: r.text, refs: r.refs, start: r.startChar, end: r.endChar }))));

	// Protected ranges in EXPANDED text — used to reject API results that
	// land inside any link syntax before we attempt position mapping.
	const expandedProtectedRanges = getProtectedRanges(expandedText);

	const processedRefs = new Set<string>();
	const processedRanges: Array<[number, number]> = [];
	const linkedRefs: LinkedRef[] = [];

	// Sort descending by startChar so in-place replacements don't shift positions
	const sorted = (results ?? []).sort((a, b) => b.startChar - a.startChar);

	let newContent = content;
	let linkedCount = 0;

	for (const result of sorted) {
		const ref = result.refs?.[0];
		if (!ref) continue;
		const refInfo = refData[ref];
		if (!refInfo?.url) continue;
		if (processedRefs.has(ref)) continue;

		// First gate: reject if the result lands inside a link in the EXPANDED text.
		// This catches cases where wiki-links or markdown links survived expansion
		// unchanged, and the API returned a hit for text inside their brackets.
		if (expandedProtectedRanges.some(([s, e]) =>
			rangesOverlap(result.startChar, result.endChar, s, e)
		)) continue;

		// Map expanded positions → original positions, recover label text
		const mapped = mapToOriginal(
			result.startChar,
			result.endChar,
			substitutions,
			content
		);

		// Second gate: reject if the mapped original range overlaps a protected range.
		if (existingRanges.some(([s, e]) => rangesOverlap(mapped.origStart, mapped.origEnd, s, e))) continue;
		if (processedRanges.some(([s, e]) => rangesOverlap(mapped.origStart, mapped.origEnd, s, e))) continue;

		// mapToOriginal handles substitution cases (including trimming parentheticals).
		// For plain-text results (no substitution), also try to narrow to the
		// exact citation span using result.text, to avoid including trailing
		// words like "says" or "writes" that the API sometimes folds in.
		// This search naturally no-ops for substitution results because result.text
		// is in expanded vocabulary (e.g. "Numbers") and won't match the original
		// shortform ("Bamidbar").
		let { origStart, origEnd, label } = mapped;
		if (result.text) {
			const window = content.slice(origStart, origEnd);
			const idx = window.toLowerCase().indexOf(result.text.toLowerCase());
			if (idx !== -1 && idx + result.text.length <= window.length) {
				origStart = origStart + idx;
				origEnd = origStart + result.text.length;
				label = content.slice(origStart, origEnd);
			}
		}

		const url = `https://www.sefaria.org/${refInfo.url}`;
		newContent = newContent.slice(0, origStart) + `[${label}](${url})` + newContent.slice(origEnd);

		processedRefs.add(ref);
		processedRanges.push([origStart, origEnd]);
		linkedRefs.push({ origStart, origEnd, ref, refUrl: refInfo.url });
		linkedCount++;
	}

	// Second pass: contextual refs ("the Tosfos there", "Rashi ibid", …)
	const updatedExistingRanges = getProtectedRanges(newContent);
	const { content: finalContent, count: contextualCount } = await resolveContextualRefs(
		newContent,
		linkedRefs,
		updatedExistingRanges
	);

	const totalCount = linkedCount + contextualCount;
	if (totalCount === 0) { new Notice("No citations found"); return; }

	await app.vault.modify(file, finalContent);
	new Notice(`Linked ${totalCount} citation${totalCount === 1 ? "" : "s"}`);
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default class SefariaLinkerPlugin extends Plugin {
	settings: SefariaLinkerSettings;
	private autoRunTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		// Ribbon button — click to run the linker on the current note
		this.addRibbonIcon("link", "Link Sefaria citations", async () => {
			const file = this.app.workspace.getActiveFile();
			if (!file) { new Notice("No active file"); return; }
			try {
				await linkCitations(this.app, file, this.settings);
			} catch (err) {
				new Notice(`Sefaria Linker error: ${(err as Error).message}`);
			}
		});

		this.addCommand({
			id: "link-citations",
			name: "Link citations in current note",
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) { new Notice("No active file"); return; }
				try {
					await linkCitations(this.app, file, this.settings);
				} catch (err) {
					new Notice(`Sefaria Linker error: ${(err as Error).message}`);
				}
			},
		});

		this.addCommand({
			id: "unlink-citations",
			name: "Unlink Sefaria citations in current note",
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) { new Notice("No active file"); return; }
				const content = await this.app.vault.read(file);
				const stripped = content.replace(
					/\[([^\]]+)\]\(https:\/\/www\.sefaria\.org\/[^)]+\)/g,
					"$1"
				);
				if (stripped === content) { new Notice("No Sefaria links found"); return; }
				const count = (content.match(/\[([^\]]+)\]\(https:\/\/www\.sefaria\.org\/[^)]+\)/g) ?? []).length;
				await this.app.vault.modify(file, stripped);
				new Notice(`Removed ${count} Sefaria link${count === 1 ? "" : "s"}`);
			},
		});

		this.addCommand({
			id: "toggle-auto-run",
			name: "Toggle auto-run",
			callback: async () => {
				this.settings.autoRun = !this.settings.autoRun;
				await this.saveSettings();
				new Notice(`Sefaria auto-run ${this.settings.autoRun ? "enabled" : "disabled"}`);
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!this.settings.autoRun || !file) return;
				if (this.autoRunTimer !== null) window.clearTimeout(this.autoRunTimer);
				this.autoRunTimer = window.setTimeout(async () => {
					this.autoRunTimer = null;
					try {
						await linkCitations(this.app, file, this.settings);
					} catch (err) {
						new Notice(`Sefaria Linker error: ${(err as Error).message}`);
					}
				}, this.settings.autoRunDelay);
			})
		);

		this.addSettingTab(new SefariaLinkerSettingTab(this.app, this));
	}

	onunload() {
		if (this.autoRunTimer !== null) window.clearTimeout(this.autoRunTimer);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// ── Settings tab ──────────────────────────────────────────────────────────────

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
			.setDesc("Automatically detect and link citations when a note is opened.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoRun).onChange(async (value) => {
					this.plugin.settings.autoRun = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Auto-run delay (ms)")
			.setDesc("How long to wait after opening a file before running (milliseconds).")
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

		new Setting(containerEl)
			.setName("Expand halachic shortforms before linking")
			.setDesc(
				"Expand abbreviations like Shach 120.5, Taz, B’’H, Sh’’A, A’’Z etc. " +
				"before sending to Sefaria, so they can be detected and linked. " +
				"The original shortform text is preserved as the link label."
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableShortformExpansion).onChange(async (value) => {
					this.plugin.settings.enableShortformExpansion = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
