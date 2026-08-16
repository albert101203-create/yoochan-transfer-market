const { refreshAllData } = require("./server");
const { downloadAssets } = require("./download-assets");

refreshAllData("cloud-scheduled")
  .then(() => downloadAssets())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
