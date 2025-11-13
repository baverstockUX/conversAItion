import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<ArrayBuffer[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const socketRef = useRef<any>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const isStreamingRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Listen for complete audio events (legacy)
    const handleAgentAudio = (event: Event) => {
      const customEvent = event as CustomEvent<{audio: ArrayBuffer, socket: any}>;
      socketRef.current = customEvent.detail.socket;
      playAudio(customEvent.detail.audio);
    };

    // Listen for streaming audio chunks
    const handleAudioChunk = (event: Event) => {
      const customEvent = event as CustomEvent<{chunk: ArrayBuffer, socket: any, isFirstChunk: boolean}>;
      socketRef.current = customEvent.detail.socket;

      if (customEvent.detail.isFirstChunk) {
        console.log('Received first audio chunk, starting accumulation');
        chunksRef.current = [];
        isStreamingRef.current = true;
      }

      // Accumulate chunk
      chunksRef.current.push(customEvent.detail.chunk);
      console.log(`Received chunk ${chunksRef.current.length}, size: ${customEvent.detail.chunk.byteLength} bytes`);
    };

    // Listen for streaming complete event
    const handleAudioEnd = (event: Event) => {
      console.log(`Audio streaming complete, received ${chunksRef.current.length} chunks`);

      if (isStreamingRef.current && chunksRef.current.length > 0) {
        // Concatenate all chunks into single buffer
        const totalLength = chunksRef.current.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const completeBuffer = new Uint8Array(totalLength);

        let offset = 0;
        for (const chunk of chunksRef.current) {
          completeBuffer.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }

        console.log(`Concatenated ${chunksRef.current.length} chunks into ${totalLength} bytes, playing now...`);

        // Play the complete audio
        playAudio(completeBuffer.buffer);

        // Reset streaming state
        chunksRef.current = [];
        isStreamingRef.current = false;
      }
    };

    window.addEventListener('agent:audio', handleAgentAudio);
    window.addEventListener('agent:audio:chunk', handleAudioChunk);
    window.addEventListener('agent:audio:end', handleAudioEnd);

    return () => {
      window.removeEventListener('agent:audio', handleAgentAudio);
      window.removeEventListener('agent:audio:chunk', handleAudioChunk);
      window.removeEventListener('agent:audio:end', handleAudioEnd);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playAudio = useCallback(async (audioBuffer: ArrayBuffer) => {
    console.log('playAudio called with buffer size:', audioBuffer?.byteLength || 0);
    if (!audioContextRef.current) {
      console.error('Audio context not initialized');
      return;
    }

    try {
      setIsPlaying(true);
      console.log('Decoding audio data...');

      // Decode audio data
      const audioData = await audioContextRef.current.decodeAudioData(audioBuffer.slice(0));
      console.log('Audio decoded successfully, duration:', audioData.duration);

      // Create source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioData;
      source.connect(audioContextRef.current.destination);

      currentSourceRef.current = source;

      // Play
      console.log('Starting audio playback...');
      source.start(0);

      // Handle completion
      source.onended = () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
        currentSourceRef.current = null;

        // Notify backend that audio has finished playing
        if (socketRef.current) {
          console.log('Emitting audio:playback:ended to backend');
          socketRef.current.emit('audio:playback:ended');
        }
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (error) {
        // Ignore if already stopped
      }
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
    setQueue([]);
  }, []);

  const addToQueue = useCallback((audioBuffer: ArrayBuffer) => {
    setQueue((prev) => [...prev, audioBuffer]);
  }, []);

  return {
    isPlaying,
    queue,
    playAudio,
    stop,
    addToQueue,
  };
}
