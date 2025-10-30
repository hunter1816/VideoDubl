import React, { useRef, useEffect } from 'react';
import { base64ToUint8Array, createAudioBufferFromPcm } from '../utils/media';

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  audioData: string | null;
  playbackRate: number;
  audioOffset: number; // in milliseconds
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoRef, audioData, playbackRate, audioOffset }) => {
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioData) {
      return;
    }

    let isMounted = true;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let audioBuffer: AudioBuffer | null = null;
    let isPlaying = false;
    
    let syncRequest: number | null = null;
    let audioContextStartTime = 0;
    let videoStartTime = 0;

    const stopAudio = () => {
      if (syncRequest) {
        cancelAnimationFrame(syncRequest);
        syncRequest = null;
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {
          // Ignore errors, it might have already stopped.
        }
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    };

    const playAudio = (offset: number) => {
      stopAudio();

      if (audioBuffer && audioContext.state !== 'closed') {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.playbackRate.value = playbackRate;
        
        const effectiveOffset = Math.max(0, offset + (audioOffset / 1000));
        
        audioContextStartTime = audioContext.currentTime;
        videoStartTime = effectiveOffset;
        
        source.start(0, effectiveOffset);
        sourceNodeRef.current = source;
      }
    };

    const syncAudio = () => {
      if (!isPlaying || !videoRef.current || audioContext.state === 'closed' || !sourceNodeRef.current) {
        return;
      }

      const videoTime = videoRef.current.currentTime;
      const audioContextTimeElapsed = audioContext.currentTime - audioContextStartTime;
      const actualAudioPosition = videoStartTime + (audioContextTimeElapsed * sourceNodeRef.current.playbackRate.value);
      const drift = videoTime - actualAudioPosition;
      
      const SYNC_THRESHOLD_HARD = 0.25;
      const SYNC_THRESHOLD_SOFT = 0.05;

      if (Math.abs(drift) > SYNC_THRESHOLD_HARD) {
        playAudio(videoTime);
      } else if (Math.abs(drift) > SYNC_THRESHOLD_SOFT) {
        const correctionFactor = drift * 0.5;
        const newPlaybackRate = playbackRate + correctionFactor;
        const maxRate = playbackRate * 1.1;
        const minRate = playbackRate * 0.9;
        sourceNodeRef.current.playbackRate.value = Math.max(minRate, Math.min(maxRate, newPlaybackRate));
      } else {
        if (sourceNodeRef.current.playbackRate.value !== playbackRate) {
          sourceNodeRef.current.playbackRate.value = playbackRate;
        }
      }
    };

    const syncLoop = () => {
      syncAudio();
      if (isPlaying) {
        syncRequest = window.requestAnimationFrame(syncLoop);
      }
    };

    const handlePlay = () => {
      if(!audioBuffer) return;
      isPlaying = true;
      playAudio(video.currentTime);
      if (syncRequest) cancelAnimationFrame(syncRequest);
      syncRequest = window.requestAnimationFrame(syncLoop);
    };

    const handlePauseOrEnd = () => {
      isPlaying = false;
      stopAudio();
    };

    const handleSeeked = () => {
      if (isPlaying && !video.paused) {
        playAudio(video.currentTime);
      }
    };

    const enforceMute = () => {
      if (!video.muted) video.muted = true;
    };

    video.muted = true;
    createAudioBufferFromPcm(base64ToUint8Array(audioData), audioContext)
      .then(buffer => {
        if (!isMounted) return;
        audioBuffer = buffer;
        if (!video.paused) {
            handlePlay();
        }
      })
      .catch(e => console.error("Failed to decode audio data:", e));

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseOrEnd);
    video.addEventListener('ended', handlePauseOrEnd);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('volumechange', enforceMute);

    return () => {
      isMounted = false;
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseOrEnd);
      video.removeEventListener('ended', handlePauseOrEnd);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('volumechange', enforceMute);
      stopAudio();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [audioData, playbackRate, audioOffset, videoRef]);

  return null;
};
