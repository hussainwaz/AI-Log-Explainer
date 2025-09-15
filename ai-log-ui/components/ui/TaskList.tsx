import React, { useState } from "react";
import { ClipboardCopy, ClipboardCheck, ChevronDown, ChevronUp, Flame, Zap, CheckCircle2, FileText } from 'lucide-react';

export type Task = {
    id: string;
    title: string;
    description?: string;
    priority?: string;
    // Add more fields as needed
};

export default function TaskList({ tasks }: { tasks: Task[] }) {
    const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

    const handleToggle = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const handleCopy = (value: string, id: string) => {
        navigator.clipboard.writeText(value);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1200);
    };

    if (!tasks || tasks.length === 0) {
        return <p className="text-gray-500">No tasks available.</p>;
    }

    const getPriorityIcon = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case 'high': return <Flame className="w-5 h-5 text-red-500" />;
            case 'medium': return <Zap className="w-5 h-5 text-yellow-400" />;
            case 'low': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            default: return <FileText className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="p-5 rounded-2xl shadow bg-gray-900 hover:shadow-2xl transition border border-gray-800 flex flex-col gap-2"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getPriorityIcon(task.priority)}
                            <span className="text-lg font-bold text-gray-100">
                                {task.title || <span className="text-gray-500">Untitled</span>}
                            </span>
                        </div>
                        <button
                            className="ml-2 px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-100 border border-gray-700 flex items-center gap-1"
                            title="Copy title"
                            onClick={() => handleCopy(task.title || '', task.id + '-title')}
                        >
                            {copiedId === task.id + '-title' ? <ClipboardCheck className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                        </button>
                    </div>
                    {task.description ? (
                        <div className="relative mt-1">
                            <div className="flex items-center justify-between">
                                <button
                                    className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-100 border border-gray-700 flex items-center gap-1"
                                    title={expanded[task.id] ? 'Collapse' : 'Expand'}
                                    onClick={() => handleToggle(task.id)}
                                >
                                    {expanded[task.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    {expanded[task.id] ? 'Collapse' : 'Expand'}
                                </button>
                                <button
                                    className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-100 border border-gray-700 flex items-center gap-1"
                                    title="Copy description"
                                    onClick={() => handleCopy(task.description || '', task.id + '-desc')}
                                >
                                    {copiedId === task.id + '-desc' ? <ClipboardCheck className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className={`text-sm text-gray-300 mt-1 transition-all duration-200 ${expanded[task.id] ? '' : 'line-clamp-2'}`}>{task.description}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-1">No description</p>
                    )}
                    {task.priority && (
                        <span
                            className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs rounded border font-semibold tracking-wide select-none
                                ${task.priority.toLowerCase() === 'high' ? 'bg-red-900 text-red-300 border-red-700' : ''}
                                ${task.priority.toLowerCase() === 'medium' ? 'bg-yellow-900 text-yellow-200 border-yellow-700' : ''}
                                ${task.priority.toLowerCase() === 'low' ? 'bg-green-900 text-green-200 border-green-700' : ''}
                                ${!['high', 'medium', 'low'].includes(task.priority.toLowerCase()) ? 'bg-gray-800 text-gray-300 border-gray-700' : ''}
                            `}
                        >
                            {getPriorityIcon(task.priority)}
                            Priority: {task.priority}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
