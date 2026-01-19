import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const packageJsonPath = path.join(root, 'package.json');
const mainFile = path.join(root, 'scrollcrafter.php');
const readmeFile = path.join(root, 'readme.txt');

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version;

console.log(`Syncing version to: ${version}`);

// Update scrollcrafter.php
if (fs.existsSync(mainFile)) {
    let content = fs.readFileSync(mainFile, 'utf8');

    // 1. Plugin Header: Version: 1.2.3
    content = content.replace(/( \* Version:\s+)(.+)/, `$1${version}`);

    // 2. Define Constant: define( 'SCROLLCRAFTER_VERSION', '1.2.3' );
    content = content.replace(/(define\(\s*'SCROLLCRAFTER_VERSION',\s*').+('\s*\);)/, `$1${version}$2`);

    fs.writeFileSync(mainFile, content, 'utf8');
    console.log('✔ Updated scrollcrafter.php');
}

// Update readme.txt
if (fs.existsSync(readmeFile)) {
    let content = fs.readFileSync(readmeFile, 'utf8');

    // 1. Stable tag: 1.2.3
    content = content.replace(/(Stable tag:\s+)(.+)/, `$1${version}`);

    // 2. Headings like "= 1.2.3 =" in Changelog might need manual update or regex if you want automated changelog injection. 
    // For now, let's just do stable tag as it is the most critical for WP.

    fs.writeFileSync(readmeFile, content, 'utf8');
    console.log('✔ Updated readme.txt');
}
