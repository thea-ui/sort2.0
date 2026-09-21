import { disconnectAtlasMapService, syncAtlasMap } from '../services/atlas-map.service.js';

/**
 * CLI: mirror the ATLAS campus map into SORTv2.
 * Exit 0 on SUCCESS/PARTIAL (PARTIAL = map mirrored, image refresh failed),
 * exit 1 on FAILED so scripts/CI can detect it.
 */
async function main() {
  try {
    const result = await syncAtlasMap();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'FAILED' ? 1 : 0;
  } catch (error: any) {
    console.error('[Atlas] Sync failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await disconnectAtlasMapService();
  }
}

main();
