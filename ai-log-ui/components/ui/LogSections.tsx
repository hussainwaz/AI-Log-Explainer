import React, { useState } from "react";
import { Card } from "./Card/Card";
import { SeverityBadge } from "./SeverityBadge/SeverityBadge";
import { Button } from "./Button/Button";

// Icons for each severity
const icons = {
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
};

const colors = {
    error: "bg-red-100 border-red-400",
    warning: "bg-yellow-100 border-yellow-400",
    info: "bg-green-100 border-green-400",
};

// Props: expects AI JSON with keys: error, warning, info, summary
export interface LogSectionsProps {
    data: {
        summary?: string;
        error?: Array<{ message: string; timestamp?: string }>;
        warning?: Array<{ message: string; timestamp?: string }>;
        info?: Array<{ message: string; timestamp?: string }>;
    };
}

export const LogSections: React.FC<LogSectionsProps> = ({ data }) => {
    // Track expanded/collapsed state for each section
    const [expanded, setExpanded] = useState({
        error: true,
        warning: true,
        info: true,
    });

    const toggle = (key: "error" | "warning" | "info") => {
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-4">
            {/* Summary box at top */}
            {data.summary && (
                <Card className="bg-blue-50 border-blue-300 p-4">
                    <h2 className="font-semibold text-lg mb-1">Summary</h2>
                    <p className="text-gray-700">{data.summary}</p>
                </Card>
            )}
            {/* Map each section */}
            {["error", "warning", "info"].map((key) => {
                const items = data[key as keyof typeof data] as Array<any> | undefined;
                if (!items || items.length === 0) return null;
                return (
                    <Card
                        key={key}
                        className={`border-l-4 ${colors[key as keyof typeof colors]} p-4`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{icons[key as keyof typeof icons]}</span>
                                <SeverityBadge level={key} />
                                <span className="font-semibold text-lg capitalize">{key}</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => toggle(key as any)}>
                                {expanded[key as keyof typeof expanded] ? "Collapse" : "Expand"}
                            </Button>
                        </div>
                        {expanded[key as keyof typeof expanded] && (
                            <div className="space-y-2">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-2 rounded bg-white shadow-sm">
                                        <div className="text-gray-800">{item.message}</div>
                                        {item.timestamp && (
                                            <div className="text-xs text-gray-500 mt-1">{item.timestamp}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};
