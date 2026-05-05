import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || "outputs/github-black-tech-ranking.png");
const outputPath = resolve(args.output || "docs/social/github-black-tech-ranking.png");

await mkdir(dirname(outputPath), { recursive: true });
await copyFile(inputPath, outputPath);
console.log(`Copied ${outputPath}`);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      result[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return result;
}
