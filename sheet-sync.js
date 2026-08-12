/**
 * DSSL - Google Sheets Live Player Count Sync
 * Reads registration entries from official Google Sheet via native GViz API
 * Auto-updates player counts across index.html & mandals.html
 */

(function () {
  const SHEET_ID = "1wko8nor4TPBssNGKIK5283AJ-zZ-Yj394v4ZcUFXjRU";
  const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  const MANDAL_KEYS = {
    "vashishta": ["vashishta", "vasistha", "vashishtha"],
    "vishwamitra": ["vishwamitra", "viswamitra"],
    "atrey": ["atrey", "atreyi", "atri"],
    "gautam": ["gautam", "gautama"],
    "bharadwaj": ["bharadwaj", "bhardwaj"],
    "jamdagni": ["jamdagni", "jamdagani"],
    "kashyap": ["kashyap", "kasyap"]
  };

  window.dsslPlayerCounts = {
    "vashishta": 0,
    "vishwamitra": 0,
    "atrey": 0,
    "gautam": 0,
    "bharadwaj": 0,
    "jamdagni": 0,
    "kashyap": 0
  };

  async function fetchSheetPlayerCounts() {
    try {
      const response = await fetch(GVIZ_URL);
      if (!response.ok) return;

      const text = await response.text();
      // Parse GViz JSON response: google.visualization.Query.setResponse({...});
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return;

      const jsonStr = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonStr);

      if (!data.table || !data.table.rows) return;

      const cols = (data.table.cols || []).map(c => (c.label || "").toLowerCase());
      let mandalIdx = cols.findIndex(c => c.includes("mandal"));
      if (mandalIdx === -1) mandalIdx = 7; // Fallback to column H (8th col, 0-indexed 7)

      // Reset counts
      const counts = {
        "vashishta": 0,
        "vishwamitra": 0,
        "atrey": 0,
        "gautam": 0,
        "bharadwaj": 0,
        "jamdagni": 0,
        "kashyap": 0
      };

      data.table.rows.forEach(row => {
        if (!row.c || !row.c[mandalIdx]) return;
        const cellValue = (row.c[mandalIdx].v || "").toString().toLowerCase().trim();
        if (!cellValue) return;

        for (const [key, aliases] of Object.entries(MANDAL_KEYS)) {
          if (aliases.some(alias => cellValue.includes(alias))) {
            counts[key]++;
            break;
          }
        }
      });

      window.dsslPlayerCounts = counts;
      updateUIPlayerCounts(counts);

    } catch (err) {
      console.warn("DSSL Sheet Sync warning:", err);
    }
  }

  function updateUIPlayerCounts(counts) {
    // 1. Update index.html static count elements if present
    for (const [key, val] of Object.entries(counts)) {
      const elem = document.getElementById(`${key}-count`);
      if (elem) {
        elem.textContent = val;
      }
    }

    // 2. Dispatch custom event for dynamic pages like mandals.html
    window.dispatchEvent(new CustomEvent("dsslPlayerCountsUpdated", { detail: counts }));
  }

  // Initial load
  fetchSheetPlayerCounts();

  // Auto-refresh every 10 seconds for real-time live updates
  setInterval(fetchSheetPlayerCounts, 10000);

  // Expose global trigger
  window.refreshDsslPlayerCounts = fetchSheetPlayerCounts;
})();
