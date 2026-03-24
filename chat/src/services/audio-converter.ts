import { execFile } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function tmpFile(ext: string): string {
  return join(tmpdir(), `soma_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

export function cleanupFile(filePath: string) {
  try {
    unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

export function convertToWav(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = tmpFile("wav");
    execFile(
      "ffmpeg",
      ["-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "wav", "-y", outputPath],
      { timeout: 15000 },
      (err) => {
        if (err) return reject(new Error(`ffmpeg wav conversion failed: ${err.message}`));
        resolve(outputPath);
      }
    );
  });
}

export async function audioBufferToBase64Wav(
  buffer: Buffer,
  originalExt: string
): Promise<{ base64: string; mimeType: string }> {
  const inputPath = tmpFile(originalExt);
  writeFileSync(inputPath, buffer);

  try {
    if (originalExt === "wav") {
      // Already WAV, just base64 encode
      const base64 = buffer.toString("base64");
      cleanupFile(inputPath);
      return { base64, mimeType: "audio/wav" };
    }

    // Convert to WAV
    const wavPath = await convertToWav(inputPath);
    const wavBuffer = readFileSync(wavPath);
    const base64 = wavBuffer.toString("base64");

    cleanupFile(inputPath);
    cleanupFile(wavPath);

    return { base64, mimeType: "audio/wav" };
  } catch (err) {
    cleanupFile(inputPath);
    throw err;
  }
}
