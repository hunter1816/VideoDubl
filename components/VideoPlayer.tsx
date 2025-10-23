
import React, { useRef, useEffect } from 'react';
import { base64ToUint8Array, createAudioBufferFromPcm } from '../utils/media';

interface VideoPlayerProps {
  videoSrc: string;
  audioData: string; // base64 encoded PCM data
  playbackRate: number;
  audioOffset: number; // in milliseconds
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoSrc, audioData, playbackRate, audioOffset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Refs for Web Audio API and state
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);

  // Refs for synchronization logic
  const syncIntervalRef = useRef<number | null>(null);
  const audioContextStartTimeRef = useRef<number>(0); // When audio playback started, in AudioContext time
  const videoStartTimeRef = useRef<number>(0); // When audio playback started, in audio's own timeline time
  
  // Effect for audio setup (decoding)
  useEffect(() => {
    if (!audioData) return;

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const context = audioContextRef.current;
    
    let isMounted = true;
    
    const setupAudio = async () => {
      try {
        const decodedBytes = base64ToUint8Array(audioData);
        const buffer = await createAudioBufferFromPcm(decodedBytes, context);
        if (isMounted) {
            audioBufferRef.current = buffer;
        }
      } catch (e) {
        console.error("Failed to decode or create audio buffer:", e);
      }
    };

    setupAudio();

    return () => {
      isMounted = false;
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
      }
      sourceNodeRef.current = null;
    };
  }, [audioData]);

  // Effect for handling video events and syncing audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    // --- Audio Playback Control ---

    const playAudio = (offset: number) => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) { /* Ignore error if already stopped */ }
      }
      
      if (audioBufferRef.current && audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioContextRef.current.destination);
        
        // Apply playback rate and offset from props
        source.playbackRate.value = playbackRate;
        const effectiveOffset = Math.max(0, offset + (audioOffset / 1000));
        
        // Record start times for sync calculation
        audioContextStartTimeRef.current = audioContextRef.current.currentTime;
        videoStartTimeRef.current = effectiveOffset; // The starting point on the audio's own timeline
        
        source.start(0, effectiveOffset);
        sourceNodeRef.current = source;
      }
    };

    const stopAudio = () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) { /* Ignore error */ }
        sourceNodeRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };

    // --- Synchronization Logic ---

    const syncAudio = () => {
        if (!isPlayingRef.current || !videoRef.current || !audioContextRef.current) {
            return;
        }

        const videoTime = videoRef.current.currentTime;
        // Calculate where the audio *should* be, accounting for its playback rate
        const audioContextElapsedTime = audioContextRef.current.currentTime - audioContextStartTimeRef.current;
        const expectedAudioTime = (audioContextElapsedTime * playbackRate) + videoStartTimeRef.current;
        const drift = videoTime - expectedAudioTime;
        
        // Re-sync if drift is over a threshold (e.g., 150ms)
        const SYNC_THRESHOLD = 0.15;
        if (Math.abs(drift) > SYNC_THRESHOLD) {
            console.warn(`Audio drift of ${Math.round(drift * 1000)}ms detected. Re-syncing.`);
            playAudio(videoTime);
        }
    };

    // --- Video Element Event Handlers ---

    const handlePlay = () => {
      isPlayingRef.current = true;
      playAudio(video.currentTime);
      // Start a periodic check to correct for drift
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = window.setInterval(syncAudio, 500);
    };

    const handlePauseOrEnd = () => {
      isPlayingRef.current = false;
      stopAudio(); // Stops audio and clears the sync interval
    };

    const handleSeeked = () => {
      // If the video is playing, re-sync audio to the new position immediately.
      // If paused, the 'play' event handler will sync it when playback resumes.
      if (isPlayingRef.current) {
        playAudio(video.currentTime);
      }
    };

    const enforceMute = () => {
      if (!video.muted) video.muted = true;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseOrEnd);
    video.addEventListener('ended', handlePauseOrEnd);
    video.addEventListener('seeked', handleSeeked); // Use 'seeked' for better performance
    video.addEventListener('volumechange', enforceMute);

    // If sync props change while the video is playing, immediately apply the changes
    if (isPlayingRef.current && !video.paused) {
      playAudio(video.currentTime);
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseOrEnd);
      video.removeEventListener('ended', handlePauseOrEnd);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('volumechange', enforceMute);
      stopAudio(); // Cleanup on unmount
    };
  }, [playbackRate, audioOffset]); // Rerun this entire effect when sync props change

  return (
    <div>
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        muted
        playsInline
        className="w-full h-auto rounded-lg shadow-2xl"
      />
    </div>
  );
};