
import React, { createContext, useContext, useState, useCallback } from 'react';

interface VideoRecordingContextType {
  recordedVideoUri: string | null;
  recordedVideoDuration: number | null;
  targetWordId: string | null;
  isRecordingFromWordDetail: boolean;
  setRecordedVideo: (uri: string, duration: number) => void;
  setTargetWord: (wordId: string | null) => void;
  setIsRecordingFromWordDetail: (value: boolean) => void;
  clearRecordedVideo: () => void;
}

const VideoRecordingContext = createContext<VideoRecordingContextType>({
  recordedVideoUri: null,
  recordedVideoDuration: null,
  targetWordId: null,
  isRecordingFromWordDetail: false,
  setRecordedVideo: () => {},
  setTargetWord: () => {},
  setIsRecordingFromWordDetail: () => {},
  clearRecordedVideo: () => {},
});

export const useVideoRecording = () => {
  const context = useContext(VideoRecordingContext);
  if (!context) {
    throw new Error('useVideoRecording must be used within a VideoRecordingProvider');
  }
  return context;
};

export function VideoRecordingProvider({ children }: { children: React.ReactNode }) {
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordedVideoDuration, setRecordedVideoDuration] = useState<number | null>(null);
  const [targetWordId, setTargetWordIdState] = useState<string | null>(null);
  const [isRecordingFromWordDetail, setIsRecordingFromWordDetailState] = useState(false);

  const setRecordedVideo = useCallback((uri: string, duration: number) => {
    console.log('VideoRecordingContext: Setting recorded video:', uri, 'duration:', duration);
    setRecordedVideoUri(uri);
    setRecordedVideoDuration(duration);
  }, []);

  const setTargetWord = useCallback((wordId: string | null) => {
    console.log('VideoRecordingContext: Setting target word:', wordId);
    setTargetWordIdState(wordId);
  }, []);

  const setIsRecordingFromWordDetail = useCallback((value: boolean) => {
    console.log('VideoRecordingContext: Setting isRecordingFromWordDetail:', value);
    setIsRecordingFromWordDetailState(value);
  }, []);

  const clearRecordedVideo = useCallback(() => {
    console.log('VideoRecordingContext: Clearing recorded video');
    setRecordedVideoUri(null);
    setRecordedVideoDuration(null);
    setTargetWordIdState(null);
    setIsRecordingFromWordDetailState(false);
  }, []);

  return (
    <VideoRecordingContext.Provider
      value={{
        recordedVideoUri,
        recordedVideoDuration,
        targetWordId,
        isRecordingFromWordDetail,
        setRecordedVideo,
        setTargetWord,
        setIsRecordingFromWordDetail,
        clearRecordedVideo,
      }}
    >
      {children}
    </VideoRecordingContext.Provider>
  );
}
