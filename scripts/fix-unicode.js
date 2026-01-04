/**
 * Post-build script to:
 * 1. Convert ES6 Unicode escapes \u{XXXX} to ES5 compatible format
 * 2. Escape all non-ASCII characters to \uXXXX format
 * For characters > 0xFFFF, converts to surrogate pairs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'dist', 'myworlds-client.umd.js');

console.log('Fixing Unicode in:', filePath);

let content = readFileSync(filePath, 'utf8');

// Step 1: Replace \u{XXXX} with proper surrogate pairs or \uXXXX
content = content.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (match, hex) => {
    const codePoint = parseInt(hex, 16);
    
    if (codePoint <= 0xFFFF) {
        // Simple case: fits in one \uXXXX
        return '\\u' + codePoint.toString(16).padStart(4, '0').toUpperCase();
    } else {
        // Need surrogate pair for characters outside BMP
        const offset = codePoint - 0x10000;
        const high = 0xD800 + (offset >> 10);
        const low = 0xDC00 + (offset & 0x3FF);
        return '\\u' + high.toString(16).toUpperCase() + '\\u' + low.toString(16).toUpperCase();
    }
});

// Step 2: Escape all raw non-ASCII characters (including emoji) to \uXXXX format
// This handles multi-byte UTF-8 characters that weren't escaped by the bundler
let escapedContent = '';
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const code = char.charCodeAt(0);
    
    if (code > 127) {
        // Non-ASCII character - escape it
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < content.length) {
            // High surrogate - check for low surrogate
            const nextCode = content.charCodeAt(i + 1);
            if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
                // Valid surrogate pair - escape both
                escapedContent += '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
                escapedContent += '\\u' + nextCode.toString(16).toUpperCase().padStart(4, '0');
                i++; // Skip the low surrogate
                continue;
            }
        }
        // Single character or unpaired surrogate
        escapedContent += '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
    } else {
        escapedContent += char;
    }
}

writeFileSync(filePath, escapedContent, 'utf8');

// Count how many characters were escaped
const originalNonAscii = (content.match(/[^\x00-\x7F]/g) || []).length;
console.log(`Escaped ${originalNonAscii} non-ASCII characters`);
console.log('Unicode fixes applied successfully');
