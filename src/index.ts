import { WebSocketServer } from "ws";
import {
    ParrotAlbum,
    ParrotAlbumArt,
    ParrotStateData,
    ParrotTrackData,
} from "./types/parrot";
import { YTMResponse } from "./types/ytmresponse";

const configPath = Bun.file("./config.json");
const Config = await configPath.json();

const YTM_API_URL = `${Config.ytmURL}:${Config.ytmPort}/api/v1/song`;

class SocketData {
    currentTrack: ParrotTrackData | null;
    currentState: ParrotStateData | null;
    isPaused: boolean;

    constructor() {
        this.currentTrack = null;
        this.currentState = null;
        this.isPaused = false;
    }

    processYear(date: string): number {
        var theDate = new Date(date);
        return theDate.getFullYear();
    }

    async setCurrentTrack(data: YTMResponse) {
        if (
            this.currentTrack?.title == data.title &&
            this.currentTrack.artists[0] == data.artist
        ) {
            return;
        }

        console.log("New song, setting current track");

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

        if (socketClients.length > 0) {
            socketClients.forEach((socket) => {
                socket.send(this.sendTrackData());
            });
        }
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
const socketData = new SocketData();

const parrotSocket = new WebSocketServer({
    host: Config.parrotURL,
    port: Config.parrotPort,
});
const socketClients: any[] = [];

parrotSocket.on("connection", async (socket, req) => {
    console.log("Connected to TheBlackParrot's overlay suite!");
    socketClients.push(socket);

    if (socketData.currentTrack !== null) {
        console.log("Sending track data from new connection");
        socket.send(socketData.sendTrackData());
    }

    socket.on("close", function () {
        console.log("Overlay disconnected");
        socketClients.splice(socketClients.indexOf(socket), 1);
    });
});

function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function getYTMInfo() {
    while (true) {
        const ytmResult = await fetch(YTM_API_URL, { method: "GET" });
        if (ytmResult.ok) {
            var txt = await ytmResult.text();
            const songInfo: YTMResponse = JSON.parse(txt);

            console.log(
                `${songInfo.artist} - ${songInfo.title} (${songInfo.elapsedSeconds} / ${songInfo.songDuration})`,
            );

            await socketData.setCurrentTrack(songInfo);
            socketData.updateState(songInfo);

            if (socketClients.length > 0) {
                socketClients.forEach((socket) => {
                    socket.send(socketData.sendStateData());
                });
            }
        } else {
            var message = await ytmResult.text();
            console.log(`No song, message is ${message}`);
        }

        await delay(1000);
    }
}

await getYTMInfo();
