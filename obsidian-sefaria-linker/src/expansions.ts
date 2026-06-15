/**
 * Halachic shortform expansions for the Sefaria Linker plugin.
 *
 * Each entry is [pattern, replacement].  Capture groups in the pattern are
 * referenced with $1, $2 … in the replacement string (same convention as
 * String.prototype.replace).
 *
 * ORDER MATTERS — more specific patterns must appear before any pattern that
 * is a prefix of them (e.g. Sh''A O"C before plain Sh''A).
 */

// Matches the various ways a double-prime / gershayim can be written:
//   ''  (two ASCII apostrophes)
//   "   (ASCII double-quote)
//   "   (Unicode right double-quote, U+201D)
//   ״   (Hebrew gershayim, U+05F4)
const DP = `(?:''|[""״])`;

export interface ExpansionEntry {
	pattern: RegExp;
	replacement: string;
}

export const SHORTFORM_EXPANSIONS: ExpansionEntry[] = [
	// ── Shulchan Arukh + section override (most specific first) ─────────────
	{
		// Sh''A O"C 123.4  →  Shulchan Arukh, Orach Chayim 123:4
		pattern: new RegExp(`\\bSh${DP}A\\s+O${DP}C\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Shulchan Arukh, Orach Chayim $1:$2",
	},
	{
		// Sh''A E"H 123.4  →  Shulchan Arukh, Even HaEzer 123:4
		pattern: new RegExp(`\\bSh${DP}A\\s+E${DP}H\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Shulchan Arukh, Even HaEzer $1:$2",
	},
	{
		// Sh''A C"M 123.4  →  Shulchan Arukh, Choshen Mishpat 123:4
		pattern: new RegExp(`\\bSh${DP}A\\s+C${DP}M\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Shulchan Arukh, Choshen Mishpat $1:$2",
	},
	{
		// Sh''A 123.4  (bare, defaults to Yoreh De'ah)
		pattern: new RegExp(`\\bSh${DP}A\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Shulchan Arukh, Yoreh De'ah $1:$2",
	},

	// ── Shulchan Arukh commentaries on Yoreh De'ah ──────────────────────────
	{
		pattern: /\bShach\s+(\d+)\.(\d+)/g,
		replacement: "Siftei Kohen on Shulchan Arukh, Yoreh De'ah $1:$2",
	},
	{
		pattern: /\bTaz\s+(\d+)\.(\d+)/g,
		replacement: "Turei Zahav on Shulchan Arukh, Yoreh De'ah $1:$2",
	},
	{
		// B''H  (Ba'er Hetev)
		pattern: new RegExp(`\\bB${DP}H\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Ba'er Hetev on Shulchan Arukh, Yoreh De'ah $1:$2",
	},
	{
		// N''HaK  (Nekudot HaKesef)
		pattern: new RegExp(`\\bN${DP}HaK\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Nekudot HaKesef on Shulchan Arukh, Yoreh De'ah $1:$2",
	},
	{
		// P''T  (Pischei Teshuva)
		pattern: new RegExp(`\\bP${DP}T\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Pischei Teshuva on Shulchan Arukh, Yoreh De'ah $1:$2",
	},
	{
		// B''Y  (Beit Yosef)
		pattern: new RegExp(`\\bB${DP}Y\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Beit Yosef, Yoreh De'ah $1:$2",
	},
	{
		// D''M  (Darkei Moshe)
		pattern: new RegExp(`\\bD${DP}M\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Darkei Moshe, Yoreh De'ah $1:$2",
	},

	// ── Tur ──────────────────────────────────────────────────────────────────
	{
		pattern: /\bTur\s+(\d+)\.(\d+)/g,
		replacement: "Tur, Yoreh De'ah $1:$2",
	},

	// ── Rambam / Mishneh Torah ────────────────────────────────────────────────
	{
		// M''A  (Mishneh Torah, Forbidden Foods)
		pattern: new RegExp(`\\bM${DP}A\\s+(\\d+)\\.(\\d+)`, "g"),
		replacement: "Mishneh Torah, Forbidden Foods $1:$2",
	},

	// ── Standalone Rishon works ───────────────────────────────────────────────
	{
		pattern: /\bIVHA\b/g,
		replacement: "Issur VeHeter HaArokh",
	},
	{
		pattern: /\bSmak\b/g,
		replacement: "Sefer Mitzvot Katan",
	},
	{
		pattern: /\bSmag\b/g,
		replacement: "Sefer Mitzvot Gadol",
	},

	// ── Tractate abbreviations ────────────────────────────────────────────────
	{
		// A''Z  →  Avodah Zarah
		pattern: new RegExp(`\\bA${DP}Z\\b`, "g"),
		replacement: "Avodah Zarah",
	},
	// Existing single-quote abbreviations already handled by the old expansion
	// are kept here so everything lives in one place:
	{
		pattern: new RegExp(`\\bB${DP}K\\b`, "g"),
		replacement: "Bava Kamma",
	},
	{
		pattern: new RegExp(`\\bB${DP}M\\b`, "g"),
		replacement: "Bava Metzia",
	},
	{
		pattern: new RegExp(`\\bB${DP}B\\b`, "g"),
		replacement: "Bava Batra",
	},
	{
		pattern: new RegExp(`\\bY${DP}T\\b`, "g"),
		replacement: "Beitza",
	},
	{
		pattern: new RegExp(`\\bR${DP}H\\b`, "g"),
		replacement: "Rosh Hashanah",
	},
	{
		pattern: new RegExp(`\\bM${DP}K\\b`, "g"),
		replacement: "Moed Katan",
	},
	// Shulchan Arukh section shorthands (standalone, no siman number)
	{
		pattern: new RegExp(`\\bY${DP}D\\b`, "g"),
		replacement: "Yoreh Deah",
	},
	{
		pattern: new RegExp(`\\bO${DP}C\\b`, "g"),
		replacement: "Orach Chaim",
	},
	{
		pattern: new RegExp(`\\bE${DP}H\\b`, "g"),
		replacement: "Even HaEzer",
	},
	{
		pattern: new RegExp(`\\bC${DP}M\\b`, "g"),
		replacement: "Choshen Mishpat",
	},
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubstitutionRecord {
	origStart: number;
	origEnd: number;
	expandedStart: number;
	expandedEnd: number;
	/** The original text that was replaced (used as the markdown link label) */
	origText: string;
}

export interface ExpansionMap {
	expandedText: string;
	substitutions: SubstitutionRecord[];
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Expand halachic shortforms in `text` for submission to the Sefaria API.
 *
 * Returns both the expanded text and a substitution record for every
 * replacement made, so callers can map API result positions back to the
 * original text and recover the original label.
 *
 * @param text               The original note content.
 * @param skipRanges         Character ranges to leave untouched (e.g. existing
 *                           markdown links).  Any match that overlaps a skip
 *                           range is ignored.
 */
export function expandShortforms(
	text: string,
	skipRanges: Array<[number, number]> = []
): ExpansionMap {
	interface RawMatch {
		start: number;
		end: number;
		origText: string;
		expandedText: string;
	}

	const rawMatches: RawMatch[] = [];

	for (const entry of SHORTFORM_EXPANSIONS) {
		// Always use a fresh regex instance with the global flag
		const re = new RegExp(entry.pattern.source, "g");
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			const matchStart = m.index;
			const matchEnd = m.index + m[0].length;

			// Skip if the match overlaps any protected range
			if (skipRanges.some(([s, e]) => matchStart < e && s < matchEnd)) continue;

			// Resolve capture-group references ($1, $2 …)
			const expanded = entry.replacement.replace(
				/\$(\d+)/g,
				(_, n: string) => m![parseInt(n, 10)] ?? ""
			);

			rawMatches.push({
				start: matchStart,
				end: matchEnd,
				origText: m[0],
				expandedText: expanded,
			});
		}
	}

	// Sort ascending; remove overlaps (first match in source order wins)
	rawMatches.sort((a, b) => a.start - b.start);
	const filtered: RawMatch[] = [];
	let lastEnd = 0;
	for (const r of rawMatches) {
		if (r.start >= lastEnd) {
			filtered.push(r);
			lastEnd = r.end;
		}
	}

	// Build expanded text and substitution records in a single pass
	let expandedText = "";
	const substitutions: SubstitutionRecord[] = [];
	let origPos = 0;

	for (const match of filtered) {
		// Copy verbatim text before this match
		expandedText += text.slice(origPos, match.start);

		const expandedStart = expandedText.length;
		expandedText += match.expandedText;
		const expandedEnd = expandedText.length;

		substitutions.push({
			origStart: match.start,
			origEnd: match.end,
			expandedStart,
			expandedEnd,
			origText: match.origText,
		});

		origPos = match.end;
	}

	// Append any remaining text after the last match
	expandedText += text.slice(origPos);

	return { expandedText, substitutions };
}

/**
 * Map a character range in the expanded text back to the original text.
 *
 * If the range falls entirely within a substitution, returns the original
 * span and the original shortform as the link label.
 *
 * If the range falls outside substitutions, applies the cumulative length
 * delta from all earlier substitutions to recover the original position, and
 * slices the label from `origText`.
 */
export function mapToOriginal(
	expandedStart: number,
	expandedEnd: number,
	substitutions: SubstitutionRecord[],
	origText: string
): { origStart: number; origEnd: number; label: string } {
	// Check whether this result falls entirely within a single substitution
	for (const sub of substitutions) {
		if (expandedStart >= sub.expandedStart && expandedEnd <= sub.expandedEnd) {
			return {
				origStart: sub.origStart,
				origEnd: sub.origEnd,
				label: sub.origText,
			};
		}
	}

	// Not inside a substitution — compute cumulative offset delta.
	// delta = sum of (origLength - expandedLength) for all substitutions
	// whose expanded range ends before expandedStart.
	let delta = 0;
	for (const sub of substitutions) {
		if (sub.expandedEnd <= expandedStart) {
			delta += (sub.origEnd - sub.origStart) - (sub.expandedEnd - sub.expandedStart);
		}
	}

	const origStart = expandedStart + delta;
	const origEnd = expandedEnd + delta;
	return {
		origStart,
		origEnd,
		label: origText.slice(origStart, origEnd),
	};
}
