import React, { useRef } from "react";
import { Upload } from "lucide-react";

type DeviceSyncProps = {
    name: string;
    label: string;
    onUpload: (text: string) => void;
    isSynced: boolean;
    type: "mlm" | "pro2" | "pro3";
    fwVersion: string;
    onFwChange: (val: string) => void;
};

export const DeviceSync: React.FC<DeviceSyncProps> = ({ label, onUpload, isSynced, type, fwVersion, onFwChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                onUpload(text);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="device-sync-row">
            <span className="device-label-short">{label.replace("PRO 2.0 ", "")}</span>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                style={{ display: "none" }}
            />

            <button
                className={`btn-sync-mini ${type}`}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload size={12} />
                {isSynced ? "UPLOADED" : "UPLOAD"}
            </button>

            <div className="fw-container">
                <span className="fw-label-static">FW:</span>
                <input
                    type="text"
                    value={fwVersion}
                    onChange={(e) => onFwChange(e.target.value)}
                    className="fw-input-mini"
                />
            </div>
        </div>
    );
};
