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

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 1 — SHULCHAN ARUKH WITH SECTION + SIMAN (most specific first)
	// ════════════════════════════════════════════════════════════════════════════

	// Sh''A O"C 123.4  →  Shulchan Arukh, Orach Chayim 123:4
	{ pattern: new RegExp(`\\bSh${DP}A\\s+O${DP}C\\s+(\\d+)\\.(\\d+)`, "g"), replacement: "Shulchan Arukh, Orach Chayim $1:$2" },
	// Sh''A Y"D 123.4
	{ pattern: new RegExp(`\\bSh${DP}A\\s+Y${DP}D\\s+(\\d+)\\.(\\d+)`, "g"), replacement: "Shulchan Arukh, Yoreh De'ah $1:$2" },
	// Sh''A E"H 123.4
	{ pattern: new RegExp(`\\bSh${DP}A\\s+E${DP}H\\s+(\\d+)\\.(\\d+)`, "g"), replacement: "Shulchan Arukh, Even HaEzer $1:$2" },
	// Sh''A C"M 123.4
	{ pattern: new RegExp(`\\bSh${DP}A\\s+C${DP}M\\s+(\\d+)\\.(\\d+)`, "g"), replacement: "Shulchan Arukh, Choshen Mishpat $1:$2" },
	// Sh''A 123.4  (bare — default to Yoreh De'ah, most common in halacha notes)
	{ pattern: new RegExp(`\\bSh${DP}A\\s+(\\d+)\\.(\\d+)`, "g"), replacement: "Shulchan Arukh, Yoreh De'ah $1:$2" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 2 — SHULCHAN ARUKH COMMENTARIES (with siman.seif)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bShach\s+(\d+)\.(\d+)/g,                                           replacement: "Siftei Kohen on Shulchan Arukh, Yoreh De'ah $1:$2" },
	{ pattern: /\bTaz\s+(\d+)\.(\d+)/g,                                             replacement: "Turei Zahav on Shulchan Arukh, Yoreh De'ah $1:$2" },
	{ pattern: new RegExp(`\\bB${DP}H\\s+(\\d+)\\.(\\d+)`, "g"),                   replacement: "Ba'er Hetev on Shulchan Arukh, Yoreh De'ah $1:$2" },
	{ pattern: new RegExp(`\\bN${DP}HaK\\s+(\\d+)\\.(\\d+)`, "g"),                 replacement: "Nekudot HaKesef on Shulchan Arukh, Yoreh De'ah $1:$2" },
	{ pattern: new RegExp(`\\bP${DP}T\\s+(\\d+)\\.(\\d+)`, "g"),                   replacement: "Pischei Teshuva on Shulchan Arukh, Yoreh De'ah $1:$2" },
	{ pattern: new RegExp(`\\bB${DP}Y\\s+(\\d+)\\.(\\d+)`, "g"),                   replacement: "Beit Yosef, Yoreh De'ah $1:$2" },
	{ pattern: new RegExp(`\\bD${DP}M\\s+(\\d+)\\.(\\d+)`, "g"),                   replacement: "Darkei Moshe, Yoreh De'ah $1:$2" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 3 — TUR (with siman.seif)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bTur\s+(\d+)\.(\d+)/g, replacement: "Tur, Yoreh De'ah $1:$2" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 4 — RAMBAM / MISHNEH TORAH (section abbreviations with chapter.halacha)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: new RegExp(`\\bM${DP}A\\s+(\\d+)\\.(\\d+)`, "g"), replacement: "Mishneh Torah, Forbidden Foods $1:$2" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 5 — STANDALONE RISHON / ACHARON WORKS
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bIVHA\b/g,        replacement: "Issur VeHeter HaArokh" },
	{ pattern: /\bSmak\b/g,        replacement: "Sefer Mitzvot Katan" },
	{ pattern: /\bSmag\b/g,        replacement: "Sefer Mitzvot Gadol" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 6 — TALMUD TRACTATE ABBREVIATIONS (gershayim-style)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: new RegExp(`\\bA${DP}Z\\b`, "g"),  replacement: "Avodah Zarah" },
	{ pattern: new RegExp(`\\bB${DP}K\\b`, "g"),  replacement: "Bava Kamma" },
	{ pattern: new RegExp(`\\bB${DP}M\\b`, "g"),  replacement: "Bava Metzia" },
	{ pattern: new RegExp(`\\bB${DP}B\\b`, "g"),  replacement: "Bava Batra" },
	{ pattern: new RegExp(`\\bY${DP}T\\b`, "g"),  replacement: "Beitzah" },
	{ pattern: new RegExp(`\\bR${DP}H\\b`, "g"),  replacement: "Rosh Hashanah" },
	{ pattern: new RegExp(`\\bM${DP}K\\b`, "g"),  replacement: "Moed Katan" },
	{ pattern: new RegExp(`\\bK${DP}H\\b`, "g"),  replacement: "Kiddushin" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 8 — TANAKH: TORAH (Hebrew/Ashkenazi → English canonical)
	// More specific compound forms first, then single-word forms.
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bBereishis\b/g,   replacement: "Genesis" },
	{ pattern: /\bBereishit\b/g,   replacement: "Genesis" },
	{ pattern: /\bBereshit\b/g,    replacement: "Genesis" },
	{ pattern: /\bShemos\b/g,      replacement: "Exodus" },
	{ pattern: /\bShemot\b/g,      replacement: "Exodus" },
	{ pattern: /\bShmot\b/g,       replacement: "Exodus" },
	{ pattern: /\bVayikra\b/g,     replacement: "Leviticus" },
	{ pattern: /\bWayikra\b/g,     replacement: "Leviticus" },
	{ pattern: /\bBamidbar\b/g,    replacement: "Numbers" },
	{ pattern: /\bBemidbar\b/g,    replacement: "Numbers" },
	{ pattern: /\bDevarim\b/g,     replacement: "Deuteronomy" },
	{ pattern: /\bDevorim\b/g,     replacement: "Deuteronomy" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 9 — TANAKH: NEVI'IM (Prophets)
	// Compound "I/II" forms before plain name to avoid partial matches.
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bYehoshua\b/g,    replacement: "Joshua" },
	{ pattern: /\bShoftim\b/g,     replacement: "Judges" },

	// Samuel — I/II prefixed forms first
	{ pattern: /\bI\s+Shmuel\b/g,            replacement: "I Samuel" },
	{ pattern: /\bII\s+Shmuel\b/g,           replacement: "II Samuel" },
	{ pattern: /\bShmuel\s+Aleph\b/gi,       replacement: "I Samuel" },
	{ pattern: /\bShmuel\s+Beis\b/gi,        replacement: "II Samuel" },
	{ pattern: /\bShmuel\s+Bet\b/gi,         replacement: "II Samuel" },

	// Kings — I/II prefixed forms first
	{ pattern: /\bI\s+Melachim\b/g,          replacement: "I Kings" },
	{ pattern: /\bII\s+Melachim\b/g,         replacement: "II Kings" },
	{ pattern: /\bMelachim\s+Aleph\b/gi,     replacement: "I Kings" },
	{ pattern: /\bMelachim\s+Beis\b/gi,      replacement: "II Kings" },
	{ pattern: /\bMelachim\s+Bet\b/gi,       replacement: "II Kings" },

	// Chronicles
	{ pattern: /\bI\s+Divrei\s+Hayamim\b/g,          replacement: "I Chronicles" },
	{ pattern: /\bII\s+Divrei\s+Hayamim\b/g,          replacement: "II Chronicles" },
	{ pattern: /\bDivrei\s+Hayamim\s+Aleph\b/gi,      replacement: "I Chronicles" },
	{ pattern: /\bDivrei\s+Hayamim\s+Beis\b/gi,       replacement: "II Chronicles" },
	{ pattern: /\bDivrei\s+Hayamim\s+Bet\b/gi,        replacement: "II Chronicles" },

	// Latter Prophets (Yeshayahu etc.)
	{ pattern: /\bYeshayahu\b/g,   replacement: "Isaiah" },
	{ pattern: /\bYeshaya\b/g,     replacement: "Isaiah" },
	{ pattern: /\bYirmiyahu\b/g,   replacement: "Jeremiah" },
	{ pattern: /\bYirmiya\b/g,     replacement: "Jeremiah" },
	{ pattern: /\bYechezkel\b/g,   replacement: "Ezekiel" },
	{ pattern: /\bYechezkeil\b/g,  replacement: "Ezekiel" },

	// Twelve Minor Prophets
	{ pattern: /\bHoshea\b/g,      replacement: "Hosea" },
	{ pattern: /\bYoel\b/g,        replacement: "Joel" },
	{ pattern: /\bOvadiah\b/g,     replacement: "Obadiah" },
	{ pattern: /\bOvadya\b/g,      replacement: "Obadiah" },
	{ pattern: /\bYonah\b/g,       replacement: "Jonah" },
	{ pattern: /\bMicha\b/g,       replacement: "Micah" },
	{ pattern: /\bMichah\b/g,      replacement: "Micah" },
	{ pattern: /\bNachum\b/g,      replacement: "Nahum" },
	{ pattern: /\bChabakuk\b/g,    replacement: "Habakkuk" },
	{ pattern: /\bChavakuk\b/g,    replacement: "Habakkuk" },
	{ pattern: /\bTzefaniah\b/g,   replacement: "Zephaniah" },
	{ pattern: /\bTzfanya\b/g,     replacement: "Zephaniah" },
	{ pattern: /\bChaggai\b/g,     replacement: "Haggai" },
	{ pattern: /\bChagai\b/g,      replacement: "Haggai" },
	{ pattern: /\bZecharya\b/g,    replacement: "Zechariah" },
	{ pattern: /\bZecharia\b/g,    replacement: "Zechariah" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 10 — TANAKH: KETUVIM (Writings)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bTehillim\b/g,        replacement: "Psalms" },
	{ pattern: /\bTehilim\b/g,         replacement: "Psalms" },
	{ pattern: /\bMishlei\b/g,         replacement: "Proverbs" },
	{ pattern: /\bKoheles\b/g,         replacement: "Ecclesiastes" },
	{ pattern: /\bKohelet\b/g,         replacement: "Ecclesiastes" },
	{ pattern: /\bQohelet\b/g,         replacement: "Ecclesiastes" },
	{ pattern: /\bIyov\b/g,            replacement: "Job" },
	{ pattern: /\bIyob\b/g,            replacement: "Job" },
	{ pattern: /\bShir\s+HaShirim\b/g, replacement: "Song of Songs" },
	{ pattern: /\bShir\s+Hashirim\b/g, replacement: "Song of Songs" },
	{ pattern: /\bRus\b/g,             replacement: "Ruth" },
	{ pattern: /\bEichah\b/g,          replacement: "Lamentations" },
	{ pattern: /\bEikhah\b/g,          replacement: "Lamentations" },
	{ pattern: /\bEicha\b/g,           replacement: "Lamentations" },
	{ pattern: /\bNechemya\b/g,        replacement: "Nehemiah" },
	{ pattern: /\bNechemia\b/g,        replacement: "Nehemiah" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 11 — TALMUD TRACTATE ALTERNATE SPELLINGS
	// Ashkenazi/Yiddish pronunciations that differ enough to confuse the API.
	// ════════════════════════════════════════════════════════════════════════════

	// Berakhot
	{ pattern: /\bBerachos\b/g,    replacement: "Berakhot" },
	{ pattern: /\bBerachot\b/g,    replacement: "Berakhot" },
	{ pattern: /\bBrachos\b/g,     replacement: "Berakhot" },
	{ pattern: /\bBrachot\b/g,     replacement: "Berakhot" },
	// Shabbat
	{ pattern: /\bShabbos\b/g,     replacement: "Shabbat" },
	// Eruvin/Eiruvin
	{ pattern: /\bEruvin\b/g,      replacement: "Eiruvin" },
	// Pesachim
	{ pattern: /\bPsachim\b/g,     replacement: "Pesachim" },
	// Yoma
	{ pattern: /\bYuma\b/g,        replacement: "Yoma" },
	// Sukkah
	{ pattern: /\bSukka\b/g,       replacement: "Sukkah" },
	// Beitzah
	{ pattern: /\bBeisa\b/g,       replacement: "Beitzah" },
	{ pattern: /\bBeiza\b/g,       replacement: "Beitzah" },
	{ pattern: /\bBeizah\b/g,      replacement: "Beitzah" },
	// Ta'anit
	{ pattern: /\bTaanis\b/g,      replacement: "Ta'anit" },
	{ pattern: /\bTaanit\b/g,      replacement: "Ta'anit" },
	{ pattern: /\bTa'anis\b/g,     replacement: "Ta'anit" },
	{ pattern: /\bTaaniyos\b/g,    replacement: "Ta'anit" },
	// Megillah
	{ pattern: /\bMegila\b/g,      replacement: "Megillah" },
	// Chagigah
	{ pattern: /\bChagiga\b/g,     replacement: "Chagigah" },
	{ pattern: /\bHagigah\b/g,     replacement: "Chagigah" },
	{ pattern: /\bChagigos\b/g,    replacement: "Chagigah" },
	// Yevamot
	{ pattern: /\bYevamos\b/g,     replacement: "Yevamot" },
	{ pattern: /\bYevamoth\b/g,    replacement: "Yevamot" },
	// Ketubot
	{ pattern: /\bKesuvos\b/g,     replacement: "Ketubot" },
	{ pattern: /\bKesubos\b/g,     replacement: "Ketubot" },
	{ pattern: /\bKetubos\b/g,     replacement: "Ketubot" },
	// Sotah
	{ pattern: /\bSoto\b/g,        replacement: "Sotah" },
	// Gittin
	{ pattern: /\bGitin\b/g,       replacement: "Gittin" },
	// Kiddushin
	{ pattern: /\bKidushin\b/g,    replacement: "Kiddushin" },
	{ pattern: /\bKidushim\b/g,    replacement: "Kiddushin" },
	// Sanhedrin
	{ pattern: /\bSanhedrim\b/g,   replacement: "Sanhedrin" },
	// Makkot
	{ pattern: /\bMakkos\b/g,      replacement: "Makkot" },
	{ pattern: /\bMakos\b/g,       replacement: "Makkot" },
	// Shevuot
	{ pattern: /\bShevuos\b/g,     replacement: "Shevuot" },
	{ pattern: /\bShvuos\b/g,      replacement: "Shevuot" },
	{ pattern: /\bShvuot\b/g,      replacement: "Shevuot" },
	// Horayot
	{ pattern: /\bHorayos\b/g,     replacement: "Horayot" },
	{ pattern: /\bHoriyot\b/g,     replacement: "Horayot" },
	// Zevachim
	{ pattern: /\bZevahim\b/g,     replacement: "Zevachim" },
	// Menachot
	{ pattern: /\bMenachos\b/g,    replacement: "Menachot" },
	{ pattern: /\bMenahos\b/g,     replacement: "Menachot" },
	{ pattern: /\bMenahot\b/g,     replacement: "Menachot" },
	// Chullin / Hullin
	{ pattern: /\bChullin\b/g,     replacement: "Hullin" },
	{ pattern: /\bChulin\b/g,      replacement: "Hullin" },
	// Bekhorot
	{ pattern: /\bBechorot\b/g,    replacement: "Bekhorot" },
	{ pattern: /\bBechoros\b/g,    replacement: "Bekhorot" },
	{ pattern: /\bBekoros\b/g,     replacement: "Bekhorot" },
	// Arakhin
	{ pattern: /\bArachin\b/g,     replacement: "Arakhin" },
	{ pattern: /\bArcin\b/g,       replacement: "Arakhin" },
	// Keritot
	{ pattern: /\bKerisus\b/g,     replacement: "Keritot" },
	{ pattern: /\bKerisos\b/g,     replacement: "Keritot" },
	// Me'ilah
	{ pattern: /\bMeilah\b/g,      replacement: "Me'ilah" },
	// Niddah
	{ pattern: /\bNidah\b/g,       replacement: "Niddah" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 12 — MISHNAH TRACTATES (Pirkei Avot alternate spellings)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bPirkei\s+Avos\b/g,  replacement: "Pirkei Avot" },
	{ pattern: /\bPirke\s+Avot\b/g,   replacement: "Pirkei Avot" },
	{ pattern: /\bPirke\s+Avos\b/g,   replacement: "Pirkei Avot" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 13 — MIDRASH RABBAH (Hebrew/Ashkenazi names → Sefaria canonical)
	// More specific compound names first.
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bBereishis\s+Rabbah\b/g,      replacement: "Bereishit Rabbah" },
	{ pattern: /\bShemos\s+Rabbah\b/g,         replacement: "Shemot Rabbah" },
	{ pattern: /\bDevorim\s+Rabbah\b/g,        replacement: "Devarim Rabbah" },
	{ pattern: /\bShir\s+HaShirim\s+Rabbah\b/g, replacement: "Shir Hashirim Rabbah" },
	{ pattern: /\bEichah\s+Rabbah\b/g,         replacement: "Eikhah Rabbah" },
	{ pattern: /\bEicha\s+Rabbah\b/g,          replacement: "Eikhah Rabbah" },
	{ pattern: /\bKoheles\s+Rabbah\b/g,        replacement: "Kohelet Rabbah" },
	{ pattern: /\bRus\s+Rabbah\b/g,            replacement: "Ruth Rabbah" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 7 — SHULCHAN ARUKH SECTION SHORTHANDS (standalone, no siman)
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: new RegExp(`\\bY${DP}D\\b`, "g"),  replacement: "Yoreh Deah" },
	{ pattern: new RegExp(`\\bO${DP}C\\b`, "g"),  replacement: "Orach Chaim" },
	{ pattern: new RegExp(`\\bE${DP}H\\b`, "g"),  replacement: "Even HaEzer" },
	{ pattern: new RegExp(`\\bC${DP}M\\b`, "g"),  replacement: "Choshen Mishpat" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 7b — PREPOSITION NORMALISATION ("in" / "on" / "al" → correct form)
	//
	// In halachic writing "Tur in Y"D 201" means the same as "Tur on Y"D 201".
	// We normalise the preposition so the API gets the expected citation format.
	//
	// Pattern: "[work] in/on/al [section/tractate]"
	// These fire AFTER section shorthands so the section is already expanded.
	// ════════════════════════════════════════════════════════════════════════════

	// "[Work] in/on Yoreh De'ah / Orach Chayim / …" → "[Work], [section]"
	// (space + preposition becomes a comma — Sefaria format: "Tur, Yoreh De'ah")
	{ pattern: /\s+(?:in|on|al)\s+Yoreh\s+De['']?ah\b/gi,    replacement: ", Yoreh De'ah" },
	{ pattern: /\s+(?:in|on|al)\s+Yoreh\s+Deah\b/gi,          replacement: ", Yoreh De'ah" },
	{ pattern: /\s+(?:in|on|al)\s+Orach\s+Chai[iy]m\b/gi,    replacement: ", Orach Chayim" },
	{ pattern: /\s+(?:in|on|al)\s+Even\s+HaEzer\b/gi,         replacement: ", Even HaEzer" },
	{ pattern: /\s+(?:in|on|al)\s+Choshen\s+Mishpat\b/gi,     replacement: ", Choshen Mishpat" },

	// "[Commentator] in [Tractate/Torah book]" → "[Commentator] on [...]"
	// Covers Rashi in Berakhot, Tosfos in Chullin, Ramban in Bereishis, etc.
	// Must come after tractate-spelling expansions so names are already canonical.
	{
		pattern: /\b(Rashi|Tosafot|Tosfos|Tosafos|Ramban|Rashba|Rashbam|Ran|Rosh|Ritva|Ritba|Meiri|Rif|Nimukei Yosef|Mordechai|Rashbo|Maggid Mishneh|Kessef Mishneh|Kesef Mishneh)\s+in\s+/g,
		replacement: "$1 on "
	},

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 14 — JERUSALEM TALMUD (YERUSHALMI)
	// "Yerushalmi" prefix → "Jerusalem Talmud" so API finds the right corpus.
	// Must come before tractate-name expansions so both fire in sequence.
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bYerushalmi\b/g,   replacement: "Jerusalem Talmud" },
	{ pattern: /\bTalmud\s+Yerushalmi\b/g, replacement: "Jerusalem Talmud" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 15 — MASECHES / MASECHTA PREFIX STRIPPING
	// These Hebrew/Aramaic prefixes have no meaning for Sefaria lookup.
	// ════════════════════════════════════════════════════════════════════════════

	{ pattern: /\bMaseches\s+/g,    replacement: "" },
	{ pattern: /\bMasechta\s+/g,    replacement: "" },
	{ pattern: /\bMasekhet\s+/g,    replacement: "" },
	{ pattern: /\bMasekhta\s+/g,    replacement: "" },
	{ pattern: /\bMasechet\s+/g,    replacement: "" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 16 — RISHON / COMMENTARY NAME NORMALISATION
	// Ashkenazi alternate spellings → Sefaria canonical names.
	// ════════════════════════════════════════════════════════════════════════════

	// Tosafot
	{ pattern: /\bTosfos\b/g,       replacement: "Tosafot" },
	{ pattern: /\bTosafos\b/g,      replacement: "Tosafot" },
	{ pattern: /\bTosfot\b/g,       replacement: "Tosafot" },

	// Rashi (usually fine, but cover alternate)
	{ pattern: /\bRaschi\b/g,       replacement: "Rashi" },

	// Rashba (Rashbo is an alternate abbreviation used in some texts)
	{ pattern: /\bRashbo\b/g,       replacement: "Rashba" },

	// Ritva
	{ pattern: /\bRitba\b/g,        replacement: "Ritva" },

	// Ran (Rabbenu Nissim)
	{ pattern: /\bR(?:abbenu|abbeynu)\s+Nissim\b/gi, replacement: "Ran" },

	// Rosh (Rabbenu Asher)
	{ pattern: /\bRabbenu\s+Asher\b/gi, replacement: "Rosh" },

	// Nimukei Yosef
	{ pattern: /\bNimukei\s+Yosef\b/g,  replacement: "Nimukei Yosef" },
	{ pattern: /\bNimuke[iy]\s+Yosef\b/g, replacement: "Nimukei Yosef" },

	// Mordechai (the rishon on Talmud)
	{ pattern: /\bMordechai\b/g,    replacement: "Mordechai" },

	// Meiri
	{ pattern: /\bMeiry\b/g,        replacement: "Meiri" },
	{ pattern: /\bBeit\s+HaBechirah\b/g, replacement: "Meiri" },
	{ pattern: /\bBeis\s+HaBechirah\b/g, replacement: "Meiri" },

	// Maggid Mishneh
	{ pattern: /\bMaggid\s+Mishneh\b/g,  replacement: "Maggid Mishneh" },
	{ pattern: /\bMagid\s+Mishneh\b/g,   replacement: "Maggid Mishneh" },

	// Kessef Mishneh (Sefaria uses double-s)
	{ pattern: /\bKe[ss]+ef\s+Mishneh\b/g, replacement: "Kessef Mishneh" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 17 — ACHARONIM (later authorities)
	// ════════════════════════════════════════════════════════════════════════════

	// Mishnah Berurah (alternate spellings)
	{ pattern: /\bMishna\s+Berura\b/g,    replacement: "Mishnah Berurah" },
	{ pattern: /\bMishnah\s+Berura\b/g,   replacement: "Mishnah Berurah" },
	{ pattern: /\bMishneh\s+Berura\b/g,   replacement: "Mishnah Berurah" },
	{ pattern: /\bM(?:ishna|ishnah|ishneh)\s+B(?:erura|erurah)\b/g, replacement: "Mishnah Berurah" },

	// Chatam Sofer (Chasam Sofer is Ashkenazi pronunciation)
	{ pattern: /\bChasam\s+Sofer\b/g,     replacement: "Chatam Sofer" },
	{ pattern: /\bChatam\s+Sofer\b/g,     replacement: "Chatam Sofer" },
	{ pattern: /\bHatam\s+Sofer\b/g,      replacement: "Chatam Sofer" },

	// Noda BiYehudah (alternate spellings)
	{ pattern: /\bNoda\s+B[i']?[Yy]ehudah\b/g,  replacement: "Noda BiYehudah" },
	{ pattern: /\bNoda\s+B[i']?[Yy]ehuda\b/g,   replacement: "Noda BiYehudah" },
	{ pattern: /\bNoda\s+Biy?[Yy]ehudah\b/g,    replacement: "Noda BiYehudah" },

	// Igrot Moshe (Responsa of Rav Moshe Feinstein)
	{ pattern: /\bIgros\s+Moshe\b/g,      replacement: "Igrot Moshe" },
	{ pattern: /\bIgrot\s+Moshe\b/g,      replacement: "Igrot Moshe" },
	{ pattern: /\bIgeros\s+Moshe\b/g,     replacement: "Igrot Moshe" },

	// Aruch HaShulchan
	{ pattern: /\bAruch\s+HaShulchan\b/g,    replacement: "Aruch HaShulchan" },
	{ pattern: /\bArukh\s+HaShulchan\b/g,    replacement: "Aruch HaShulchan" },
	{ pattern: /\bAruch\s+Hashulchan\b/g,    replacement: "Aruch HaShulchan" },

	// Kaf HaChayim / Kaf HaChaim
	{ pattern: /\bKaf\s+HaChai[im]m?\b/g,   replacement: "Kaf HaChayim" },
	{ pattern: /\bKaf\s+Hachai[im]m?\b/g,   replacement: "Kaf HaChayim" },

	// Magen Avraham (on Orach Chayim)
	{ pattern: /\bMagen\s+Avraham\b/g,      replacement: "Magen Avraham" },
	{ pattern: /\bMagen\s+Avrohom\b/g,      replacement: "Magen Avraham" },

	// Beur HaGra
	{ pattern: /\bBeur\s+HaGra\b/g,         replacement: "Beur HaGra" },
	{ pattern: /\bBiur\s+HaGra\b/g,         replacement: "Beur HaGra" },

	// Chayei Adam
	{ pattern: /\bChayei\s+Adam\b/g,         replacement: "Chayei Adam" },
	{ pattern: /\bChayyei\s+Adam\b/g,        replacement: "Chayei Adam" },

	// Kitzur Shulchan Arukh
	{ pattern: /\bKitzur\s+Shulchan\s+Aruch\b/g,   replacement: "Kitzur Shulchan Arukh" },
	{ pattern: /\bKitzur\s+Shulchan\s+Arukh\b/g,   replacement: "Kitzur Shulchan Arukh" },
	{ pattern: /\bKitzur\s+S(?:hulchan|hulkan)\s+A(?:ruch|rukh)\b/g, replacement: "Kitzur Shulchan Arukh" },

	// ════════════════════════════════════════════════════════════════════════════
	// SECTION 18 — TANNAITIC / MIDRASHIC WORKS
	// ════════════════════════════════════════════════════════════════════════════

	// Mekhilta DeRabbi Yishmael (most common "Mechilta")
	{ pattern: /\bMechilta\s+(?:D[e']?Rabbi\s+Yishmael|DeRabbi\s+Yishmael)\b/g, replacement: "Mekhilta DeRabbi Yishmael" },
	{ pattern: /\bMekhilta\s+(?:D[e']?Rabbi\s+Yishmael|DeRabbi\s+Yishmael)\b/g, replacement: "Mekhilta DeRabbi Yishmael" },
	{ pattern: /\bMechilta\s+(?:D[e']?Rabbi\s+Shimon|DeRabbi\s+Shimon)\b/g,     replacement: "Mekhilta DeRabbi Shimon Ben Yochai" },
	{ pattern: /\bMekhilta\s+(?:D[e']?Rabbi\s+Shimon|DeRabbi\s+Shimon)\b/g,     replacement: "Mekhilta DeRabbi Shimon Ben Yochai" },
	// bare "Mechilta" defaults to the most common version (Yishmael)
	{ pattern: /\bMechilta\b/g,              replacement: "Mekhilta DeRabbi Yishmael" },
	{ pattern: /\bMekhilta\b/g,              replacement: "Mekhilta DeRabbi Yishmael" },

	// Sifra (on Leviticus)
	{ pattern: /\bSifra\b/g,                 replacement: "Sifra" },
	{ pattern: /\bTorat\s+Kohanim\b/g,       replacement: "Sifra" },

	// Sifrei (on Bamidbar / Devarim — try to distinguish)
	{ pattern: /\bSifrei\s+(?:on\s+)?(?:Bamidbar|Numbers|Bemidbar)\b/gi,   replacement: "Sifrei Bamidbar" },
	{ pattern: /\bSifrei\s+(?:on\s+)?(?:Devarim|Devorim|Deuteronomy)\b/gi, replacement: "Sifrei Devarim" },
	{ pattern: /\bSifre\s+(?:on\s+)?(?:Bamidbar|Numbers|Bemidbar)\b/gi,    replacement: "Sifrei Bamidbar" },
	{ pattern: /\bSifre\s+(?:on\s+)?(?:Devarim|Devorim|Deuteronomy)\b/gi,  replacement: "Sifrei Devarim" },
	// bare Sifre/Sifrei without qualifier — default to Sifrei Devarim (more commonly cited)
	{ pattern: /\bSifre\b/g,                 replacement: "Sifrei Devarim" },

	// Midrash Tanchuma
	{ pattern: /\bMidrash\s+Tanchuma\b/g,    replacement: "Midrash Tanchuma" },
	{ pattern: /\bTanchuma\b/g,              replacement: "Midrash Tanchuma" },
	{ pattern: /\bTankhuma\b/g,             replacement: "Midrash Tanchuma" },

	// Pesikta DeRav Kahana
	{ pattern: /\bPesikta\s+D[e']?Rav\s+Kahana\b/g,    replacement: "Pesikta DeRav Kahana" },
	{ pattern: /\bPesikta\s+de-?Rab\s+Kahana\b/gi,     replacement: "Pesikta DeRav Kahana" },
	{ pattern: /\bPesikta\s+Rabbati\b/g,                replacement: "Pesikta Rabbati" },

	// Pirkei DeRabbi Eliezer
	{ pattern: /\bPirkei\s+(?:de-?|D[e']?)Rabbi\s+Eliezer\b/gi, replacement: "Pirkei DeRabbi Eliezer" },
	{ pattern: /\bPDRE\b/g,                  replacement: "Pirkei DeRabbi Eliezer" },

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
