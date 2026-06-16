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
	// ── Hebrew names for Tanakh books ────────────────────────────────────────
	{ pattern: /\bBereishis\b/g, replacement: "Genesis" },
	{ pattern: /\bBereishit\b/g, replacement: "Genesis" },
	{ pattern: /\bShemos\b/g, replacement: "Exodus" },
	{ pattern: /\bShemot\b/g, replacement: "Exodus" },
	{ pattern: /\bVayikra\b/g, replacement: "Leviticus" },
	{ pattern: /\bBamidbar\b/g, replacement: "Numbers" },
	{ pattern: /\bDevarim\b/g, replacement: "Deuteronomy" },
	{ pattern: /\bTehillim\b/g, replacement: "Psalms" },
	{ pattern: /\bMishlei\b/g, replacement: "Proverbs" },
	{ pattern: /\bKoheles\b/g, replacement: "Ecclesiastes" },
	{ pattern: /\bKohelet\b/g, replacement: "Ecclesiastes" },
	{ pattern: /\bIyov\b/g, replacement: "Job" },
	{ pattern: /\bYeshaya\b/g, replacement: "Isaiah" },
	{ pattern: /\bYirmiyahu\b/g, replacement: "Jeremiah" },
	{ pattern: /\bYechezkel\b/g, replacement: "Ezekiel" },
	{ pattern: /\bShir HaShirim\b/g, replacement: "Song of Songs" },
	{ pattern: /\bEichah\b/g, replacement: "Lamentations" },
	{ pattern: /\bRus\b/g, replacement: "Ruth" },
	{ pattern: /\bYehoshua\b/g, replacement: "Joshua" },
	{ pattern: /\bShoftim\b/g, replacement: "Judges" },
	{ pattern: /\bZechariah\b/g, replacement: "Zechariah" },
	{ pattern: /\bMalachi\b/g, replacement: "Malachi" },
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
 * Expand compressed Talmud page ranges so Sefaria can recognise them.
 *
 * Examples:
 *   108-9     → 108-109      (single digit abbreviated)
 *   96b-7a    → 96b-97a
 *   111b-112a → unchanged    (second number already full length)
 *
 * Rule: if the second number has fewer digits than the first, prefix it
 * with the leading digits of the first number.
 */
export function expandPageRanges(text: string): string {
	return text.replace(
		/\b(\d+)([ab]?)-(\d+)([ab]?)\b/g,
		(full, n1: string, s1: string, n2: string, s2: string) => {
			if (n2.length < n1.length) {
				const padded = n1.slice(0, n1.length - n2.length) + n2;
				return `${n1}${s1}-${padded}${s2}`;
			}
			return full;
		}
	);
}

/**
 * Map a character range in the expanded text back to the original text.
 *
 * Three cases:
 *
 * 1. Result starts WITHIN a substitution (e.g. "Sefer Mitzvot Katan 199"
 *    where "Smak" was expanded to "Sefer Mitzvot Katan" but the API span
 *    extends further into " 199" or "(199)"):
 *    – origStart  = sub.origStart  (anchor to the shortform start)
 *    – origEnd    = computed via delta so chapter/verse after the shortform
 *                   is included (e.g. "Bamidbar 31:23" → keeps "31:23")
 *    – trailing parentheticals like " (199)" are stripped from the label
 *
 * 2. Result falls entirely within a single substitution:
 *    – return the substitution's original span and origText directly.
 *
 * 3. Result outside all substitutions:
 *    – apply cumulative length-delta from prior substitutions.
 */
export function mapToOriginal(
	expandedStart: number,
	expandedEnd: number,
	substitutions: SubstitutionRecord[],
	origText: string
): { origStart: number; origEnd: number; label: string } {

	/** Cumulative orig-vs-expanded delta for all substitutions whose
	 *  expanded span ends at or before `pos`. */
	function deltaAt(pos: number): number {
		let d = 0;
		for (const s of substitutions) {
			if (s.expandedEnd <= pos) {
				d += (s.origEnd - s.origStart) - (s.expandedEnd - s.expandedStart);
			}
		}
		return d;
	}

	// Case 1 & 2: result starts within a substitution
	for (const sub of substitutions) {
		if (expandedStart >= sub.expandedStart && expandedStart < sub.expandedEnd) {

			// Case 2: result also ends within the same substitution
			if (expandedEnd <= sub.expandedEnd) {
				return { origStart: sub.origStart, origEnd: sub.origEnd, label: sub.origText };
			}

			// Case 1: result extends beyond the substitution (e.g. "Numbers 31:23"
			// where "Numbers" came from "Bamidbar", but " 31:23" follows in original)
			const origStart = sub.origStart;
			const origEnd = expandedEnd + deltaAt(expandedEnd);

			// Strip trailing parenthetical e.g. " (199)" so we don't include
			// page-number annotations that aren't part of the citation text.
			const raw = origText.slice(origStart, Math.max(origStart, origEnd));
			const trimmed = raw.replace(/\s*\([^)]*\)\s*$/, "");
			return {
				origStart,
				origEnd: origStart + trimmed.length,
				label: trimmed,
			};
		}
	}

	// Case 3: outside all substitutions
	const d = deltaAt(expandedStart);
	const origStart = expandedStart + d;
	const origEnd = expandedEnd + d;
	return {
		origStart,
		origEnd,
		label: origText.slice(origStart, origEnd),
	};
}
