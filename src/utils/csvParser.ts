import Papa from 'papaparse';
import type { ShotData } from '../types';

/**
 * Robust CSV parser for golf technical data.
 * Detects headers based on keyword heuristics to skip metadata rows.
 */
export const parseShotCSV = (file: File): Promise<ShotData[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: false,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[][];

                // Heuristic keywords for identifying the header row
                const keywords = ['no', 'distance', 'exitvelocity', 'launchangle', 'hit_no', 'distance_ft', 'game hit', 'exitvelocity (mph)'];

                const headerRowIndex = rows.findIndex(row => {
                    const normalizedCells = row.map(c => String(c).trim().toLowerCase());
                    // Check if at least 2 key columns are present
                    const matchCount = keywords.filter(k => {
                        return normalizedCells.some(cell => cell.includes(k));
                    }).length;
                    return matchCount >= 2;
                });

                if (headerRowIndex === -1) {
                    reject(new Error('Could not identify data headers. Please ensure the CSV has "No", "Distance", etc.'));
                    return;
                }

                const rawHeaders = rows[headerRowIndex].map(h => String(h).trim().toLowerCase());
                const dataRows = rows.slice(headerRowIndex + 1);

                // Map common column name variations
                const findIdx = (variants: string[]) => {
                    return rawHeaders.findIndex(h => variants.includes(h));
                };

                const noIdx = findIdx(['no', 'shot #', '#', 'shotno', 'hit_no', 'game hit']);
                const distIdx = findIdx(['distance', 'dist', 'total distance', 'distance_ft', 'distance (feet)']);
                const veloIdx = findIdx(['exitvelocity', 'exit speed', 'ball speed', 'velocity', 'exit_velocity_mph', 'exitvelocity (mph)']);
                const angleIdx = findIdx(['launchangle', 'launch angle', 'angle', 'launch_angle_deg']);

                // Usually ExitDirection is unnamed or after LaunchAngle
                let dirIdx = findIdx(['exitdirection', 'direction', 'side angle', 'dir', 'direction_deg', 'side_angle_deg']);
                if (dirIdx === -1 && angleIdx !== -1) {
                    // Look in the neighborhood of angleIdx
                    dirIdx = rawHeaders.findIndex((h, idx) => idx > angleIdx && (h.includes('direction') || h.includes('side') || h.includes('dir') || h.includes('exitdirection')));
                    if (dirIdx === -1) dirIdx = angleIdx + 1;
                }

                const parsedShots: ShotData[] = dataRows
                    .filter(row => row[noIdx] !== undefined && !isNaN(Number(row[noIdx])))
                    .map((row) => ({
                        no: parseInt(String(row[noIdx])) || 0,
                        distance: parseFloat(String(row[distIdx])) || 0,
                        exitVelocity: parseFloat(String(row[veloIdx])) || 0,
                        launchAngle: parseFloat(String(row[angleIdx])) || 0,
                        exitDirection: parseFloat(String(row[dirIdx])) || 0,
                    }))
                    .filter(shot => shot.no > 0)
                    .sort((a, b) => a.no - b.no);

                resolve(parsedShots);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};
