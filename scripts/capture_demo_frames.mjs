import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "outputs", "agent-demo-gif");
const frameDir = path.join(outputRoot, "frames");
const manifestPath = path.join(outputRoot, "frame-manifest.json");
const sampleImage = path.join(projectRoot, "data", "test_images", "cafe.jpg");

const appUrl = "http://127.0.0.1:4173/";
const techUrl = "http://127.0.0.1:4173/technology";
const productUrl = "http://127.0.0.1:4173/product-design";

const frames = [];
const playwrightModulePath = path.join(
  projectRoot,
  "frontend",
  "node_modules",
  "playwright",
  "index.mjs"
);
const { chromium } = await import(pathToFileURL(playwrightModulePath).href);

async function ensureOutputDirs() {
  await fs.mkdir(frameDir, { recursive: true });
}

async function clearOldFrames() {
  const entries = await fs.readdir(frameDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
      .map((entry) => fs.unlink(path.join(frameDir, entry.name)))
  );
}

async function waitForAppReady(page) {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Scene Library");
  await page.waitForSelector("text=Recommended queue");
  await page.waitForTimeout(1600);
}

async function clickScene(page, sceneLabel) {
  const button = page.locator("button").filter({ hasText: sceneLabel }).first();
  await button.click();
  await page.waitForTimeout(1600);
}

async function captureFrame(page, name, durationMs) {
  const frameIndex = String(frames.length + 1).padStart(2, "0");
  const filePath = path.join(frameDir, `${frameIndex}-${name}.png`);
  await page.screenshot({
    path: filePath,
    animations: "disabled",
  });
  frames.push({
    name,
    duration_ms: durationMs,
    path: filePath,
  });
}

async function main() {
  await ensureOutputDirs();
  await clearOldFrames();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });

  page.setDefaultTimeout(30000);

  try {
    await waitForAppReady(page);
    await captureFrame(page, "home-cafe", 900);

    await clickScene(page, "健身房");
    await captureFrame(page, "scene-gym", 900);

    await page.evaluate(() => {
      window.scrollTo({ top: 980, behavior: "instant" });
    });
    await page.waitForTimeout(700);
    await captureFrame(page, "gym-insights", 1000);

    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(700);
    await page.locator('input[type="file"]').setInputFiles(sampleImage);
    await page.waitForSelector("text=cafe.jpg");
    await page.waitForTimeout(1500);
    await captureFrame(page, "image-upload", 1100);

    await page.goto(techUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("text=从一张场景图片，到一组更合拍的歌曲。");
    await page.waitForTimeout(800);
    await captureFrame(page, "technology-page", 900);

    await page.goto(productUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("text=把“我现在适合听什么”设计成一段顺滑的产品体验。");
    await page.waitForTimeout(800);
    await captureFrame(page, "product-page", 900);
  } finally {
    await browser.close();
  }

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        source_url: appUrl,
        frames,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Captured ${frames.length} frames to ${frameDir}`);
  console.log(`Manifest written to ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
