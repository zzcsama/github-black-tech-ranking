import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || "data/ranking.sample.json");
const outputPath = resolve(args.output || "docs/data/ranking.json");

const ranking = JSON.parse(await readFile(inputPath, "utf8"));
ranking.items = (ranking.items || []).map((item, index) => {
  const [owner] = String(item.repo || "").split("/");
  return {
    rank: item.rank || index + 1,
    url: item.url || `https://github.com/${item.repo}`,
    avatarUrl: item.avatarUrl || `https://github.com/${owner}.png?size=160`,
    ...item
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(ranking, null, 2)}\n`, "utf8");
console.log(`Synced ${outputPath}`);

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
