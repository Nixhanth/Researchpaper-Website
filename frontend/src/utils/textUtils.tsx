import React from 'react';
import { Link } from 'react-router-dom';

export const formatContent = (content: string, mentions: string[] = []) => {
    if (!content) return null;

    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // Regex to detect mentions
    const mentionRegex = /(@\w+)/g;

    const parts = content.split(/(\s+)/);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        const mentionMatch = part.match(/^(@\w+)(.*)$/);
        if (mentionMatch) {
            const fullMention = mentionMatch[1];
            const extra = mentionMatch[2];
            const username = fullMention.substring(1).toLowerCase();
            const isValidMention = mentions.some(m => m.toLowerCase() === username);

            if (isValidMention) {
                return (
                    <React.Fragment key={index}>
                        <Link
                            to={`/profile/u/${username}`}
                            className="text-blue-500 font-bold hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {fullMention}
                        </Link>
                        {extra}
                    </React.Fragment>
                );
            }
        }
        return part;
    });
};
