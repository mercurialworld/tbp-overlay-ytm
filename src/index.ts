import { WebSocketServer } from "ws";
import {
    ParrotAlbum,
    ParrotAlbumArt,
    ParrotStateData,
    ParrotTrackData,
} from "./types/parrot";
import { YTMResponse } from "./types/ytmresponse";

class SocketData {
    currentTrack: ParrotTrackData | null;
    currentState: ParrotStateData | null;
    isPaused: boolean;
    hasSongChanged: boolean;

    constructor() {
        this.currentTrack = null;
        this.currentState = null;
        this.isPaused = false;
        this.hasSongChanged = false;
    }

    processYear(date: string): number {
        var theDate = new Date(date);
        return theDate.getFullYear();
    }

    isCurrentSong(data: YTMResponse): boolean {
        return (
            this.currentTrack?.title == data.title &&
            this.currentTrack.artists[0] == data.artist
        );
    }

    toggleNewSong() {
        this.hasSongChanged = !this.hasSongChanged;
        console.log(
            `Song change variable has now been set to ${this.hasSongChanged}`,
        );
    }

    async setCurrentTrack(data: YTMResponse) {
        if (this.isCurrentSong(data)) {
            return;
        }

        console.log(`Now playing: ${data.artist} - ${data.title}`);

        var album: ParrotAlbum = { year: null, name: null };
        if (data.album && data.uploadDate) {
            album = {
                // closest thing to any date is upload date, unable to add year info
                year: null,
                name: data.album,
            };
        }

        var albumArt: ParrotAlbumArt = { type: null, data: null };
        if (data.imageSrc) {
            // TODO: crop to square if it's not of type audio
            const img = await fetch(data.imageSrc, { method: "GET" })
                .then((res) => res.blob())
                .then((resBlob) => resBlob.arrayBuffer())
                .then((blobArrayBuf) => Buffer.from(blobArrayBuf))
                .then((blobBuf) => blobBuf.toString("base64"));

            // assuming jpg again
            albumArt = { type: "image/jpeg", data: img };
        }

        this.currentTrack = {
            id: data.videoId,
            title: data.title,
            artists: [data.artist],
            duration: data.songDuration * 1000,
            album: album,
            art: albumArt,
        };

        this.toggleNewSong();
    }

    updateState(data: YTMResponse) {
        this.isPaused = data.isPaused;

        this.currentState = {
            playing: !this.isPaused,
            elapsed: data.elapsedSeconds * 1000,
        };
    }

    sendStateData(): string {
        return JSON.stringify({ event: "state", data: this.currentState });
    }

    sendTrackData(): string {
        return JSON.stringify({ event: "track", data: this.currentTrack });
    }
}

class OverlayWS {
    parrotSocket: WebSocketServer;
    socketClients: any[];
    socketData: SocketData;

    constructor(url: string, port: number, socketData: SocketData) {
        this.parrotSocket = new WebSocketServer({
            host: url,
            port: port,
        });
        this.socketClients = [];
        this.socketData = socketData;

        this.parrotSocket.on("connection", async (socket, req) => {
            console.log("Connected to TheBlackParrot's overlay suite!");
            this.socketClients.push(socket);

            if (this.socketData.currentTrack !== null) {
                console.log("Sending track data from new connection");
                socket.send(this.socketData.sendTrackData());
                this.socketData.toggleNewSong();
            }

            socket.on("close", () => {
                console.log("Overlay disconnected");
                this.socketClients.splice(this.socketClients.indexOf(socket), 1);
            });
        });
    }
}

function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function getYTMInfo(url: string, overlayWS: OverlayWS) {
    while (true) {
        const ytmResult = await fetch(url, { method: "GET" });
        if (ytmResult.ok) {
            var txt = await ytmResult.text();
            const songInfo: YTMResponse = JSON.parse(txt);

            await overlayWS.socketData.setCurrentTrack(songInfo);
            overlayWS.socketData.updateState(songInfo);

            if (overlayWS.socketClients.length > 0) {
                overlayWS.socketClients.forEach((socket) => {
                    socket.send(overlayWS.socketData.sendStateData());
                    if (overlayWS.socketData.hasSongChanged) {
                        console.log("Sending new song to overlay");
                        socket.send(overlayWS.socketData.sendTrackData());
                        overlayWS.socketData.toggleNewSong();
                    }
                });
            }
        } else {
            var message = await ytmResult.text();
            console.log(`No song, message is ${message}`);
        }

        await delay(1000);
    }
}

async function main() {
    const configPath = Bun.file("./config.json");
    const Config = await configPath.json();
    const socketData = new SocketData();
    const overlayWS = new OverlayWS(Config.parrotURL, Config.parrotPort, socketData);

    const YTM_API_URL = `${Config.ytmURL}:${Config.ytmPort}/api/v1/song`;

    await getYTMInfo(YTM_API_URL, overlayWS);
}

main();
