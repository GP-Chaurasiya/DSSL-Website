/**
 * DSSL - Google Sheets Live Player Count Sync
 * Reads ALL sport sheets and calculates live Mandal player counts.
 */

(function () {

  const SHEET_ID =
    "1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU";

  // =========================================================
  // ALL SPORT TABS IN YOUR GOOGLE SHEET
  // =========================================================

  const SPORT_SHEETS = [
    "Input",
    "Badminton (double)",
    "Badminton (Singles)",
    "Chess",
    "Table Tennis",
    "Basketball",
    "Volleyball",
    "Football",
    "Cricket",
    "Kho Kho",
    "Tug Of War",
    "Relay Race",
    "7 Stones",
    "100 m",
    "200 m",
    "400 m",
    "Long Jump",
    "High Jump",
    "Shot Put",
    "Javelin Throw",
    "Discus Throw",
    "Kabaddi",
    "Track Marking"
  ];

  // =========================================================
  // MANDAL NAME MATCHING
  // =========================================================

  const MANDAL_KEYS = {

    vashishta: [
      "vashishta",
      "vasistha",
      "vashishtha"
    ],

    vishwamitra: [
      "vishwamitra",
      "viswamitra"
    ],

    atrey: [
      "atrey",
      "atreyi",
      "atri"
    ],

    gautam: [
      "gautam",
      "gautama"
    ],

    bharadwaj: [
      "bharadwaj",
      "bhardwaj",
      "bharadwaja"
    ],

    jamdagni: [
      "jamdagni",
      "jamdagani",
      "jamadagni"
    ],

    kashyap: [
      "kashyap",
      "kasyap",
      "kashyapa"
    ]

  };

  function emptyCounts() {

    return {
      vashishta: 0,
      vishwamitra: 0,
      atrey: 0,
      gautam: 0,
      bharadwaj: 0,
      jamdagni: 0,
      kashyap: 0
    };

  }

  function emptyMandalSets() {

    return {
      vashishta: new Set(),
      vishwamitra: new Set(),
      atrey: new Set(),
      gautam: new Set(),
      bharadwaj: new Set(),
      jamdagni: new Set(),
      kashyap: new Set()
    };

  }

  window.dsslPlayerCounts =
    emptyCounts();


  // =========================================================
  // FETCH ONE GOOGLE SHEET TAB
  // =========================================================

  async function fetchSportSheet(sheetName) {

    const url =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

    const response =
      await fetch(url, {
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error(
        `${sheetName}: HTTP ${response.status}`
      );
    }

    const text =
      await response.text();

    const jsonStart =
      text.indexOf("{");

    const jsonEnd =
      text.lastIndexOf("}");

    if (
      jsonStart === -1 ||
      jsonEnd === -1
    ) {
      throw new Error(
        `${sheetName}: Invalid GViz response`
      );
    }

    const jsonText =
      text.substring(
        jsonStart,
        jsonEnd + 1
      );

    return JSON.parse(jsonText);

  }


  // =========================================================
  // FIND COLUMN INDEX HELPER
  // =========================================================

  function findColumnIndex(table, nameHints, fallbackIndex) {

    const columns =
      table?.cols || [];

    const labels =
      columns.map(col =>
        String(
          col?.label || ""
        )
          .trim()
          .toLowerCase()
      );

    // Try finding by col.label first
    let index =
      labels.findIndex(label =>
        nameHints.some(hint =>
          label.includes(hint)
        )
      );

    if (index !== -1) {
      return { index, isFirstRowHeader: false };
    }

    // If cols are empty, check if row 0 contains header names
    if (
      table?.rows &&
      table.rows[0] &&
      Array.isArray(table.rows[0].c)
    ) {
      const row0 = table.rows[0].c;
      const rIndex = row0.findIndex(cell => {
        const v = cell && cell.v != null ? String(cell.v).trim().toLowerCase() : "";
        return nameHints.some(hint => v.includes(hint));
      });

      if (rIndex !== -1) {
        return { index: rIndex, isFirstRowHeader: true };
      }
    }

    return { index: fallbackIndex, isFirstRowHeader: false };

  }


  // =========================================================
  // EXTRACT MANDAL PLAYERS FROM ONE SHEET
  // =========================================================

  function extractMandalsFromSheet(
    data,
    mandalPlayerSets,
    sheetName
  ) {

    if (
      !data ||
      !data.table ||
      !Array.isArray(
        data.table.rows
      )
    ) {

      console.warn(
        `DSSL: No rows in ${sheetName}`
      );

      return 0;

    }

    const table = data.table;

    // Detect column positions dynamically
    const mandalInfo = findColumnIndex(table, ["mandal"], 7);
    const scholarInfo = findColumnIndex(table, ["scholar", "roll"], 3);
    const nameInfo = findColumnIndex(table, ["name", "student"], 2);
    const regIdInfo = findColumnIndex(table, ["registration", "reg id", "id"], 1);

    const mandalIndex = mandalInfo.index;
    const scholarIndex = scholarInfo.index;
    const nameIndex = nameInfo.index;
    const regIdIndex = regIdInfo.index;

    const isHeaderRow =
      mandalInfo.isFirstRowHeader ||
      scholarInfo.isFirstRowHeader ||
      nameInfo.isFirstRowHeader ||
      regIdInfo.isFirstRowHeader;

    const startRow = isHeaderRow ? 1 : 0;
    let validRows = 0;

    for (let i = startRow; i < table.rows.length; i++) {

      const row = table.rows[i];

      if (
        !row ||
        !Array.isArray(row.c)
      ) {
        continue;
      }

      const cell =
        row.c[mandalIndex];

      if (!cell || cell.v == null) {
        continue;
      }

      const value =
        String(cell.v)
          .trim()
          .toLowerCase();

      // Skip header words or empty strings
      if (
        !value ||
        value === "mandal" ||
        value === "mandal name"
      ) {
        continue;
      }

      for (
        const [key, aliases]
        of Object.entries(
          MANDAL_KEYS
        )
      ) {

        const matched =
          aliases.some(
            alias =>
              value.includes(
                alias
              )
          );

        if (matched) {

          validRows++;

          // Build unique player identifier
          const scholarId = row.c[scholarIndex]?.v != null ? String(row.c[scholarIndex].v).trim().toLowerCase() : "";
          const playerName = row.c[nameIndex]?.v != null ? String(row.c[nameIndex].v).trim().toLowerCase() : "";
          const regId = row.c[regIdIndex]?.v != null ? String(row.c[regIdIndex].v).trim().toLowerCase() : "";

          const uniqueKey = scholarId || (playerName ? (key + "_" + playerName) : "") || regId || (`row_${sheetName}_${i}`);

          mandalPlayerSets[key].add(uniqueKey);

          break;

        }

      }

    }

    console.log(
      `DSSL: ${sheetName} → ${validRows} registrations`
    );

    return validRows;

  }


  // =========================================================
  // MAIN FUNCTION
  // =========================================================

  async function fetchSheetPlayerCounts() {

    console.log(
      "DSSL: Starting complete Mandal sync..."
    );

    const mandalPlayerSets =
      emptyMandalSets();

    let totalEntries = 0;

    // =======================================================
    // READ ALL SPORT SHEETS
    // =======================================================

    for (
      const sportSheet
      of SPORT_SHEETS
    ) {

      try {

        const data =
          await fetchSportSheet(
            sportSheet
          );

        totalEntries +=
          extractMandalsFromSheet(
            data,
            mandalPlayerSets,
            sportSheet
          );

      } catch (error) {

        console.warn(
          `DSSL: Could not read ${sportSheet}:`,
          error.message
        );

      }

    }

    // Calculate count of unique players per Mandal
    const counts = emptyCounts();
    for (const [key, set] of Object.entries(mandalPlayerSets)) {
      counts[key] = set.size;
    }

    // =======================================================
    // SAVE GLOBAL COUNTS
    // =======================================================

    window.dsslPlayerCounts =
      counts;

    console.log(
      "================================"
    );

    console.log(
      "DSSL TOTAL SHEET ENTRIES:",
      totalEntries
    );

    console.log(
      "DSSL MANDAL COUNTS (UNIQUE PLAYERS):",
      counts
    );

    console.log(
      "================================"
    );

    // =======================================================
    // UPDATE HTML
    // =======================================================

    updateUIPlayerCounts(
      counts
    );

  }


  // =========================================================
  // UPDATE MANDAL CARDS
  // =========================================================

  function updateUIPlayerCounts(
    counts
  ) {

    const elementMap = {

      vashishta:
        "vashishta-count",

      vishwamitra:
        "vishwamitra-count",

      atrey:
        "atrey-count",

      gautam:
        "gautam-count",

      bharadwaj:
        "bharadwaj-count",

      jamdagni:
        "jamdagni-count",

      kashyap:
        "kashyap-count"

    };


    Object.entries(
      elementMap
    ).forEach(
      ([key, elementId]) => {

        const element =
          document.getElementById(
            elementId
          );

        if (!element) {

          console.warn(
            `DSSL: #${elementId} not found`
          );

          return;

        }

        element.textContent =
          counts[key] || 0;

      }
    );


    // Notify other pages
    window.dispatchEvent(
      new CustomEvent(
        "dsslPlayerCountsUpdated",
        {
          detail: counts
        }
      )
    );

  }


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  fetchSheetPlayerCounts();


  // =========================================================
  // AUTO REFRESH EVERY 10 SECONDS
  // =========================================================

  setInterval(
    fetchSheetPlayerCounts,
    10000
  );


  // =========================================================
  // MANUAL REFRESH
  // =========================================================

  window.refreshDsslPlayerCounts =
    fetchSheetPlayerCounts;

})();