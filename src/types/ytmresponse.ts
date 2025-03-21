export type MediaType =
    | "AUDIO"
    | "ORIGINAL_MUSIC_VIDEO"
    | "USER_GENERATED_CONTENT"
    | "PODCAST_EPISODE"
    | "OTHER_VIDEO";

export interface YTMResponse {
    title: string;
    artist: string;
    views: number;
    uploadDate?: string; // datetime
    imageSrc?: string;
    isPaused: boolean;
    songDuration: number;
    elapsedSeconds: 95;
    url?: string;
    album?: string | null;
    videoId: string;
    playlistId: string;
    mediaType: MediaType;
}
