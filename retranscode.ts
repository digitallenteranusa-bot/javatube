import { Database } from "bun:sqlite";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const videoId = process.argv[2] || "ktl3ipgclvftetee";
const UPLOADS_DIR = path.resolve(import.meta.dir, "app/uploads");
const inputPath = path.join(UPLOADS_DIR, "videos", `${videoId}.mp4`);
const hlsDir = path.join(UPLOADS_DIR, "hls", videoId);
const db = new Database("app/data/app.db");

const RESOLUTIONS = [
	{ name: "720p", width: 1280, height: 720, bitrate: "2500k", audioBitrate: "128k" },
	{ name: "1080p", width: 1920, height: 1080, bitrate: "5000k", audioBitrate: "192k" },
];

// Check source resolution
async function getSourceRes(): Promise<{ width: number; height: number }> {
	try {
		const proc = Bun.spawn(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", inputPath]);
		const out = await new Response(proc.stdout).text();
		const [w, h] = out.trim().split("x").map(Number);
		if (w && h) return { width: w, height: h };
	} catch {}
	return { width: 1920, height: 1080 };
}

async function main() {
	console.log(`Re-transcoding ${videoId}...`);
	console.log(`Input: ${inputPath}`);

	const source = await getSourceRes();
	console.log(`Source resolution: ${source.width}x${source.height}`);

	const applicable = RESOLUTIONS.filter(r => r.height <= source.height);
	if (applicable.length === 0) {
		console.log("Source resolution too low for 720p/1080p. Done.");
		return;
	}

	const masterEntries: string[] = [
		'#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,NAME="360p"',
		"360p/playlist.m3u8",
	];

	for (const res of applicable) {
		const resDir = path.join(hlsDir, res.name);
		await mkdir(resDir, { recursive: true });

		console.log(`\nTranscoding ${res.name}... (this will take a while)`);
		const start = Date.now();

		const proc = Bun.spawn([
			"ffmpeg", "-threads", "2", "-i", inputPath,
			"-c:v", "libx264", "-c:a", "aac",
			"-threads", "2",
			"-preset", "ultrafast", "-crf", "23",
			"-vf", `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2`,
			"-b:v", res.bitrate, "-maxrate", res.bitrate, "-bufsize", `${parseInt(res.bitrate) * 2}k`,
			"-b:a", res.audioBitrate,
			"-start_number", "0", "-hls_time", "10", "-hls_list_size", "0",
			"-hls_segment_filename", path.join(resDir, "segment%03d.ts"),
			"-f", "hls", "-y",
			path.join(resDir, "playlist.m3u8"),
		], { stdout: "ignore", stderr: "ignore" });

		const exitCode = await proc.exited;
		const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);

		if (exitCode === 0) {
			console.log(`${res.name} done in ${elapsed} minutes`);
			const bandwidth = parseInt(res.bitrate) * 1000;
			masterEntries.push(
				`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res.width}x${res.height},NAME="${res.name}"`,
				`${res.name}/playlist.m3u8`,
			);
		} else {
			console.log(`${res.name} FAILED (exit ${exitCode})`);
		}
	}

	// Update master playlist
	const masterContent = "#EXTM3U\n" + masterEntries.join("\n") + "\n";
	await writeFile(path.join(hlsDir, "master.m3u8"), masterContent);
	console.log("\nMaster playlist updated with all resolutions");

	// Get duration
	let duration = 0;
	try {
		const probe = Bun.spawn(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", inputPath]);
		duration = parseFloat(await new Response(probe.stdout).text()) || 0;
	} catch {}

	db.run("UPDATE videos SET duration = ? WHERE id = ?", [duration, videoId]);
	console.log(`Duration: ${(duration / 60).toFixed(1)} minutes`);
	console.log("All done!");
}

main().catch(console.error);
