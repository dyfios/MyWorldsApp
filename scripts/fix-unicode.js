/**
 * Post-build script to convert ES6 Unicode escapes \u{XXXX} to ES5 compatible format
 * For characters > 0xFFFF, converts to surrogate pairs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'dist', 'myworlds-client.umd.js');

console.log('Fixing Unicode escapes in:', filePath);

let content = readFileSync(filePath, 'utf8');

// Replace \u{XXXX} with proper surrogate pairs or \uXXXX
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

writeFileSync(filePath, content, 'utf8');

console.log('Unicode escapes fixed successfully');
