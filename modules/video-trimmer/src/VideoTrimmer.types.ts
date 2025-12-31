
export type TrimOptions = {
  /**
   * Local file path to the video (without file:// prefix)
   */
  path: string;
  
  /**
   * Start time in seconds
   */
  startTime: number;
  
  /**
   * End time in seconds
   */
  endTime: number;
};

export type TrimResult = {
  /**
   * Path to the trimmed video file
   */
  path: string;
};
