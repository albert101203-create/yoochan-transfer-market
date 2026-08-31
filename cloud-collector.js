const fs = require("fs");
const path = require("path");
const { refreshAllData } = require("./server");
const { downloadAssets } = require("./download-assets");

const HEALTH_FILE = path.join(__dirname, "cache", "collector-health.json");

function writeHealth(payload) {
  fs.mkdirSync(path.dirname(HEALTH_FILE), { recursive: true });
  fs.writeFileSync(HEALTH_FILE, JSON.stringify({ checkedAt: new Date().toISOString(), ...payload }, null, 2) + "\n", "utf8");
}

(async () => {
  try {
    const livePayload = await refreshAllData("cloud-scheduled");
    const assetResult = await downloadAssets();
    writeHealth({ ok: true, headlineCount: livePayload?.itemCount || 0, assetResult });
    process.exit(0);
  } catch (error) {
    // Keep the last known-good cache online. A temporary feed/API failure must
    // not turn into a red workflow or a stream of failure emails.
    console.error("collector warning:", error);
    writeHealth({ ok: false, error: String(error), action: "kept-last-known-good-cache" });
    process.exit(0);
  }
})();
