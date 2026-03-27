import { Database } from "bun:sqlite";
import { writeFileSync, mkdirSync } from "fs";

const db = new Database("app/data/app.db");

// Fix video status
db.run("UPDATE videos SET status='ready', thumbnail='ktl3ipgclvftetee.jpg' WHERE id='ktl3ipgclvftetee'");
console.log("Video status updated to ready");
console.log(db.query("SELECT id, status, thumbnail FROM videos").all());

// Create master playlist
const hlsDir = "app/uploads/hls/ktl3ipgclvftetee";
const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,NAME="360p"
360p/playlist.m3u8
`;
writeFileSync(`${hlsDir}/master.m3u8`, master);
console.log("Master playlist created");
