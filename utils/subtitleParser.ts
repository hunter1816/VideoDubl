// A simple type for the parsed segment before a speaker is assigned.
export type ParsedSubtitleSegment = {
    startTime: number;
    endTime: number;
    text: string;
};

// Converts SRT time format (00:00:00,000) to seconds.
const srtTimeToSeconds = (time: string): number => {    
    const parts = time.split(/[:,]/);
    if (parts.length !== 4) {
        return 0;
    }
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const milliseconds = parseInt(parts[3], 10);
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

/**
 * Parses SRT file content into an array of subtitle segments.
 * @param srtContent The string content of the .srt file.
 * @returns An array of ParsedSubtitleSegment objects.
 */
export const parseSrt = (srtContent: string): ParsedSubtitleSegment[] => {
    const segments: ParsedSubtitleSegment[] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) continue;

        // The second line should contain the timestamp
        const timeLine = lines[1];
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
        
        if (timeMatch) {
            const startTime = srtTimeToSeconds(timeMatch[1]);
            const endTime = srtTimeToSeconds(timeMatch[2]);
            const text = lines.slice(2).join('\n').trim();
            
            if (text) {
                segments.push({ startTime, endTime, text });
            }
        }
    }

    return segments;
};