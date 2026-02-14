import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = "https://github.com/Boyquotes/crypto-logos-cc.git";
const TEMP_DIR = path.join(__dirname, 'temp_icons_repo');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'crypto-icons');

function executeCommand(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        process.exit(1);
    }
}

function copySvgFiles(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source, { withFileTypes: true });
    let count = 0;

    for (const file of files) {
        const fullPath = path.join(source, file.name);

        if (file.isDirectory()) {
            if (file.name === '.git') continue; // Skip .git directory
            count += copySvgFiles(fullPath, target); // Flatten structure: copy all SVGs to root of target
        } else if (file.isFile() && file.name.toLowerCase().endsWith('.svg')) {
            const targetPath = path.join(target, file.name);
            fs.copyFileSync(fullPath, targetPath);
            count++;
        }
    }
    return count;
}

async function main() {
    console.log("🚀 Starting crypto icon download process...");

    // 1. Clean up temp directory if it exists
    if (fs.existsSync(TEMP_DIR)) {
        console.log("🧹 Cleaning up old temp directory...");
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    // 2. Clone the repository
    console.log(`📦 Cloning repository from ${REPO_URL}...`);
    executeCommand(`git clone --depth 1 ${REPO_URL} "${TEMP_DIR}"`);

    // 3. Copy SVG files
    console.log("📂 Copying SVG files...");
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    const copiedCount = copySvgFiles(TEMP_DIR, TARGET_DIR);
    console.log(`✅ Copied ${copiedCount} SVG icons to ${TARGET_DIR}`);

    // 4. Cleanup
    console.log("🧹 Cleaning up temp directory...");
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log("✨ Done!");
}

main().catch(err => console.error(err));