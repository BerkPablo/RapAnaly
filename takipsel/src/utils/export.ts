import type { KinematicsState } from '../pose/types';

export function exportToCSV(history: KinematicsState['history']) {
    // Assume generic time steps or just list values
    // Since we store separate arrays, we need to zip them.
    // We'll use the longest array to determine rows.

    const keys = Object.keys(history);
    if (keys.length === 0) return;

    const maxLength = Math.max(...keys.map(k => history[k].length));

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Index," + keys.join(",") + "\n"; // Header

    for (let i = 0; i < maxLength; i++) {
        const row = [i.toString()];
        for (const key of keys) {
            const val = history[key][i] !== undefined ? history[key][i].toFixed(2) : "";
            row.push(val);
        }
        csvContent += row.join(",") + "\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kinematics_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
