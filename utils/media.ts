
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = (reader.result as string).split(',')[1];
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array containing the decoded binary data.
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a WAV file Blob from raw PCM audio data.
 * @param pcmData The raw audio data.
 * @param sampleRate The sample rate of the audio (e.g., 24000).
 * @param numChannels The number of audio channels (e.g., 1).
 * @param bitsPerSample The number of bits per sample (e.g., 16).
 * @returns A Blob representing the WAV file.
 */
export const createWavBlobFromPcm = (
  pcmData: Uint8Array,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Blob => {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;
  
  // 44 bytes for the header
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, chunkSize, true);
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true); // AudioFormat for PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write the PCM data
  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

/** Helper to write a string to a DataView. */
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Converts an AudioBuffer to a Uint8Array of 16-bit PCM data.
 * @param buffer The AudioBuffer to convert.
 * @returns A Uint8Array containing the raw PCM data.
 */
const audioBufferToPcm = (buffer: AudioBuffer): Uint8Array => {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * 2; // 2 bytes per 16-bit sample
    const result = new Uint8Array(length);
    const view = new DataView(result.buffer);
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i])); // Clamp
            // Convert to 16-bit signed integer
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, intSample, true); // true for little-endian
            offset += 2;
        }
    }
    return result;
};


/**
 * Extracts the audio track from a video file and returns it as a WAV Blob.
 * @param videoFile The video file.
 * @returns A Promise that resolves with a Blob of the audio in WAV format.
 */
export const extractAudioFromVideoAsWavBlob = async (videoFile: File): Promise<Blob> => {
    try {
        const arrayBuffer = await videoFile.arrayBuffer();
        // Use a temporary AudioContext
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const pcmData = audioBufferToPcm(audioBuffer);
        
        const wavBlob = createWavBlobFromPcm(
            pcmData,
            audioBuffer.sampleRate,
            audioBuffer.numberOfChannels,
            16 // 16 bits per sample
        );
        
        await audioContext.close();
        return wavBlob;

    } catch (error) {
        console.error("Error extracting audio from video:", error);
        throw new Error("Could not extract audio from the provided video file. It might be corrupt or in an unsupported format.");
    }
};
