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

// ── Abbreviation expansion ────────────────────────────────────────────────────

// Quote chars: ASCII double-quote, curly right double-quote, Hebrew gershayim
const Q = `[""״]`;

const ABBREVIATIONS: Array<[RegExp, string]> = [
	// Talmud tractates
	[new RegExp(`\\bA${Q}Z\\b`, "g"), "Avodah Zarah"],
	[new RegExp(`\\bB${Q}K\\b`, "g"), "Bava Kamma"],
	[new RegExp(`\\bB${Q}M\\b`, "g"), "Bava Metzia"],
	[new RegExp(`\\bB${Q}B\\b`, "g"), "Bava Batra"],
	[new RegExp(`\\bY${Q}T\\b`, "g"), "Beitza"],
	[new RegExp(`\\bR${Q}H\\b`, "g"), "Rosh Hashanah"],
	[new RegExp(`\\bM${Q}K\\b`, "g"), "Moed Katan"],
	[new RegExp(`\\bK${Q}S\\b`, "g"), "Keritot"],
	[new RegExp(`\\bS${Q}A\\b`, "g"), "Shulchan Aruch"],
	// Shulchan Aruch sections
	[new RegExp(`\\bY${Q}D\\b`, "g"), "Yoreh Deah"],
	[new RegExp(`\\bO${Q}C\\b`, "g"), "Orach Chaim"],
	[new RegExp(`\\bE${Q}H\\b`, "g"), "Even HaEzer"],
	[new RegExp(`\\bC${Q}M\\b`, "g"), "Choshen Mishpat"],
	[new RegExp(`\\bCh${Q}M\\b`, "g"), "Choshen Mishpat"],
];

interface Expansion {
	expandedText: string;
	/** For each char in expandedText: original start index of its source token */
	toOrigStart: number[];
	/** For each char in expandedText: original end index (exclusive) of its source token */
	toOrigEnd: number[];
}

function expandAbbreviations(text: string): Expansion {
	interface Rep {
		start: number;
		end: number;
		expansion: string;
	}

	// Collect all matches
	const reps: Rep[] = [];
	for (const [pattern, expansion] of ABBREVIATIONS) {
		const re = new RegExp(pattern.source, "g");
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			reps.push({ start: m.index, end: m.index + m[0].length, expansion });
		}
	}

	// Sort by start position, remove overlaps
	reps.sort((a, b) => a.start - b.start);
	const filtered: Rep[] = [];
	let lastEnd = 0;
	for (const r of reps) {
		if (r.start >= lastEnd) {
			filtered.push(r);
			lastEnd = r.end;
		}
	}

	// Build expanded text + offset maps
	let expandedText = "";
	const toOrigStart: number[] = [];
	const toOrigEnd: number[] = [];
	let origPos = 0;
	let repIdx = 0;

	while (origPos < text.length) {
		if (repIdx < filtered.length && origPos === filtered[repIdx].start) {
			const rep = filtered[repIdx];
			for (let j = 0; j < rep.expansion.length; j++) {
				expandedText += rep.expansion[j];
				toOrigStart.push(rep.start);
				toOrigEnd.push(rep.end);
			}
			origPos = rep.end;
			repIdx++;
		} else {
			expandedText += text[origPos];
			toOrigStart.push(origPos);
			toOrigEnd.push(origPos + 1);
			origPos++;
		}
	}

	return { expandedText, toOrigStart, toOrigEnd };
}

// ── Commentator / contextual reference handling ───────────────────────────────

// Maps lowercased user-written names → Sefaria canonical names
const COMMENTATOR_MAP: Record<string, string> = {
	tosfos: "Tosafot",
	tosafos: "Tosafot",
	tosafot: "Tosafot",
	rashi: "Rashi",
	ramban: "Ramban",
	rambam: "Rambam",
	ran: "Ran",
	ritva: "Ritva",
	rashba: "Rashba",
	meiri: "Meiri",
	tur: "Tur",
	"beit yosef": "Beit Yosef",
	"beis yosef": "Beit Yosef",
	"bet yosef": "Beit Yosef",
};

// Matches e.g. "the tosfos there", "Rashi ibid", "the Ran ad loc"
const COMMENTATOR_NAMES = Object.keys(COMMENTATOR_MAP)
	.sort((a, b) => b.length - a.length) // longest first so multi-word matches win
	.map((k) => k.replace(/\s+/g, "\\s+"))
	.join("|");

const CONTEXTUAL_RE = new RegExp(
	`\\b(?:the\\s+)?(${COMMENTATOR_NAMES})\\s+(?:there|ibid\\.?|ad\\s+loc\\.?)\\b`,
	"gi"
);

interface LinkedRef {
	origStart: number;
	origEnd: number;
	ref: string; // Sefaria ref key, e.g. "Avodah Zarah.75b"
	refUrl: string; // URL slug from refData
}

/**
 * Build a Sefaria URL for a commentary on a base ref.
 * e.g. commentator="Tosafot", refUrl="Avodah_Zarah.75b"
 * → "Tosafot_on_Avodah_Zarah.75b"
 */
function commentaryUrl(commentator: string, refUrl: string): string {
	return `${commentator.replace(/\s+/g, "_")}_on_${refUrl}`;
}

/**
 * Given matched contextual spans, find the nearest preceding linked ref
 * and replace "X there/ibid" with a Sefaria commentary link.
 */
function resolveContextualRefs(
	content: string,
	linkedRefs: LinkedRef[],
	existingRanges: Array<[number, number]>
): { content: string; count: number } {
	if (linkedRefs.length === 0) return { content, count: 0 };

	// Sort linked refs ascending so we can binary-search
	const sorted = [...linkedRefs].sort((a, b) => a.origStart - b.origStart);

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
		matches.push({
			start: m.index,
			end: m.index + m[0].length,
			fullMatch: m[0],
			commentatorRaw: m[1],
		});
	}

	// Process backwards so replacements don't shift positions
	let result = content;
	let count = 0;

	for (const match of [...matches].sort((a, b) => b.start - a.start)) {
		// Skip if inside an existing Sefaria link
		if (
			existingRanges.some(([s, e]) =>
				rangesOverlap(match.start, match.end, s, e)
			)
		)
			continue;

		// Find the nearest preceding linked ref
		let nearestRef: LinkedRef | null = null;
		for (let i = sorted.length - 1; i >= 0; i--) {
			if (sorted[i].origEnd <= match.start) {
				nearestRef = sorted[i];
				break;
			}
		}
		if (!nearestRef) continue;

		const canonical =
			COMMENTATOR_MAP[match.commentatorRaw.toLowerCase().replace(/\s+/g, " ")];
		if (!canonical) continue;

		const url = commentaryUrl(canonical, nearestRef.refUrl);
		const fullUrl = `https://www.sefaria.org/${url}`;
		const replacement = `[${match.fullMatch}](${fullUrl})`;

		result =
			result.slice(0, match.start) + replacement + result.slice(match.end);
		count++;
	}

	return { content: result, count };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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
	const re = /\[([^\]]+)\]\(https:\/\/www\.sefaria\.org\/[^)]+\)/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(content)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
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

async function linkCitations(app: App, file: TFile): Promise<void> {
	const content = await app.vault.read(file);

	// Expand abbreviations before sending to Sefaria
	const { expandedText, toOrigStart, toOrigEnd } = expandAbbreviations(content);

	const submitResp = await fetch("https://www.sefaria.org/api/find-refs", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: { title: "", body: expandedText },
			lang: "en",
		}),
	});

	if (submitResp.status !== 202) {
		throw new Error(`Unexpected status from find-refs: ${submitResp.status}`);
	}

	const { task_id }: FindRefsResponse = await submitResp.json();
	const taskResult = await pollAsyncTask(task_id);

	if (!taskResult.result) throw new Error("Task succeeded but returned no result");

	const { results, refData } = taskResult.result.body;

	// Collect existing Sefaria link ranges so we don't double-link
	const existingRanges = getExistingSefariaLinkRanges(content);

	const processedRefs = new Set<string>();
	const processedRanges: Array<[number, number]> = [];
	const linkedRefs: LinkedRef[] = [];

	// Sort descending so replacements don't shift positions
	const sorted = (results ?? []).sort((a, b) => b.startChar - a.startChar);

	let newContent = content;
	let linkedCount = 0;

	for (const result of sorted) {
		const ref = result.refs?.[0];
		if (!ref) continue;

		const refInfo = refData[ref];
		if (!refInfo?.url) continue;
		if (processedRefs.has(ref)) continue;

		// Map expanded positions back to original text positions
		const origStart = toOrigStart[result.startChar] ?? result.startChar;
		const origEnd =
			result.endChar > 0
				? toOrigEnd[result.endChar - 1] ?? result.endChar
				: result.endChar;

		if (
			existingRanges.some(([s, e]) => rangesOverlap(origStart, origEnd, s, e))
		)
			continue;
		if (
			processedRanges.some(([s, e]) => rangesOverlap(origStart, origEnd, s, e))
		)
			continue;

		// Use the original text slice as link text (preserves abbreviations as-is)
		const originalText = newContent.slice(origStart, origEnd);
		const url = `https://www.sefaria.org/${refInfo.url}`;
		const replacement = `[${originalText}](${url})`;

		newContent =
			newContent.slice(0, origStart) + replacement + newContent.slice(origEnd);

		processedRefs.add(ref);
		processedRanges.push([origStart, origEnd]);
		linkedRefs.push({ origStart, origEnd, ref, refUrl: refInfo.url });
		linkedCount++;
	}

	// Second pass: contextual references ("the tosfos there", "Rashi ibid", etc.)
	// Re-collect existing ranges from the updated content
	const updatedExistingRanges = getExistingSefariaLinkRanges(newContent);
	// Adjust linkedRefs positions: they used original content coords; after backwards
	// replacements they are still valid as starting anchors for "nearest preceding ref"
	// but we pass them relative to the original positions which still order correctly.
	const { content: finalContent, count: contextualCount } = resolveContextualRefs(
		newContent,
		linkedRefs,
		updatedExistingRanges
	);

	const totalCount = linkedCount + contextualCount;

	if (totalCount === 0) {
		new Notice("No citations found");
		return;
	}

	await app.vault.modify(file, finalContent);
	new Notice(`Linked ${totalCount} citation${totalCount === 1 ? "" : "s"}`);
}

// ── Plugin ────────────────────────────────────────────────────────────────────

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
				if (this.autoRunTimer !== null) window.clearTimeout(this.autoRunTimer);
				this.autoRunTimer = window.setTimeout(async () => {
					this.autoRunTimer = null;
					try {
						await linkCitations(this.app, file);
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
