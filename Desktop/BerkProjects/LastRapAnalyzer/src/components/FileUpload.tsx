import React, { useRef, useState } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";

type FileUploadProps = {
    onFileSelect: (text: string, fileName: string) => void;
    error?: string;
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, error }) => {
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = () => {
                onFileSelect(String(reader.result ?? ""), file.name);
            };
            reader.readAsText(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const clearFile = () => {
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="w-full">
            <div
                className={`glass-card p-8 flex flex-col items-center justify-center transition-all duration-300 ${dragActive ? "border-primary bg-primary-10" : ""
                    } ${error ? "border-error" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{ minHeight: "240px", cursor: "pointer", borderStyle: "dashed", borderWidth: "2px" }}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    style={{ display: "none" }}
                    accept=".csv"
                    onChange={handleChange}
                />

                {!fileName ? (
                    <>
                        <div className="flex items-center justify-center mb-4" style={{ width: "64px", height: "64px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "50%" }}>
                            <Upload className="text-primary" size={32} />
                        </div>
                        <h3 className="text-xl mb-2">Upload Session CSV</h3>
                        <p className="text-muted text-sm text-center" style={{ maxWidth: "320px", color: "var(--text-muted)" }}>
                            Drag and drop your MLM DS vs Pro comparison CSV here or click to browse
                        </p>
                    </>
                ) : (
                    <div className="flex items-center gap-4 bg-primary-10 p-4 rounded-xl" style={{ border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                        <FileText className="text-primary" size={32} />
                        <div className="flex flex-col">
                            <span className="font-medium" style={{ color: "var(--text-bright)" }}>{fileName}</span>
                            <span className="text-xs text-primary flex items-center gap-1">
                                <CheckCircle2 size={12} /> Ready to analyze
                            </span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFile();
                            }}
                            style={{ padding: "4px", background: "transparent", border: "none", cursor: "pointer", borderRadius: "50%" }}
                        >
                            <X size={18} style={{ color: "var(--text-muted)" }} />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-error text-sm p-2 px-4 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                        <X size={14} /> {error}
                    </div>
                )}
            </div>
        </div>
    );
};
