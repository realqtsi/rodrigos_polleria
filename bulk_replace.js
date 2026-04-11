const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
    { from: /Pocholo's/gi, to: "Rodrigo's - Brasas & Broasters" },
    { from: /Pocholo/g, to: "Rodrigo" },
    { from: /pocholo-red/g, to: "rodrigo-terracotta" },
    { from: /pocholo-yellow/g, to: "rodrigo-mustard" },
    { from: /pocholo-brown/g, to: "rodrigo-brown" },
    { from: /pocholo-cream/g, to: "rodrigo-cream" },
    { from: /logo-pocholos-icon\.png/g, to: "logo-rodrigos.jpeg" }
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            for (const { from, to } of replacements) {
                if (from.test(content)) {
                    content = content.replace(from, to);
                    modified = true;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory(srcDir);
console.log("Bulk replacement complete!");
