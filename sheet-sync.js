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
    "Chess",
    "Table Tennis",
    "Badminton",
    "Basketball",
    "Volleyball",
    "Football",
    "Cricket",
    "Kho Kho",
    "Tug Of War",
    "Relay Race",
    "Athletics (100 m)",
    "Athletics (200 m)",
    "Athletics (400 m)",
    "Long Jump",
    "High Jump",
    "Javelin Throw",
    "Discus Throw",
    "Shot Put",
    "7 Stones"
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
  // FIND MANDAL COLUMN
  // =========================================================

  function findMandalColumn(table) {

    const columns =
      table.cols || [];

    const labels =
      columns.map(col =>
        String(
          col.label || ""
        )
          .trim()
          .toLowerCase()
      );

    // First try to find column by name
    let index =
      labels.findIndex(
        label =>
          label.includes("mandal")
      );

    // Your sheet structure:
    // A Registration ID
    // B Role
    // C Name
    // D Scholar ID
    // E Course
    // F Semester
    // G Mandal
    //
    // JavaScript index = 6

    if (index === -1) {
      index = 6;
    }

    return index;

  }


  // =========================================================
  // EXTRACT MANDAL COUNTS FROM ONE SHEET
  // =========================================================

  function countMandalsFromSheet(
    data,
    counts,
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

    const mandalIndex =
      findMandalColumn(
        data.table
      );

    let validRows = 0;

    data.table.rows.forEach(
      (row, index) => {

        if (
          !row ||
          !row.c
        ) {
          return;
        }

        const cell =
          row.c[mandalIndex];

        if (!cell) {
          return;
        }

        const value =
          cell.v !== undefined &&
            cell.v !== null
            ? String(cell.v)
            : "";

        const mandalName =
          value
            .trim()
            .toLowerCase();

        if (!mandalName) {
          return;
        }

        validRows++;

        for (
          const [key, aliases]
          of Object.entries(
            MANDAL_KEYS
          )
        ) {

          const matched =
            aliases.some(
              alias =>
                mandalName.includes(
                  alias
                )
            );

          if (matched) {

            counts[key]++;

            break;

          }

        }

      }
    );

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

    const counts =
      emptyCounts();

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
          countMandalsFromSheet(
            data,
            counts,
            sportSheet
          );

      } catch (error) {

        console.warn(
          `DSSL: Could not read ${sportSheet}:`,
          error.message
        );

      }

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
      "DSSL MANDAL COUNTS:",
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