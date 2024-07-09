import * as readline from 'readline';
export const readChar = () => {
    return new Promise((resolve, reject) => {
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        const handler = (chunk, key) => {
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            process.stdin.pause();
            process.stdin.removeListener('keypress', handler); // Clean up the listener
            resolve(key.sequence);
        };
        process.stdin.on('keypress', handler);
        process.stdin.on('error', (err) => {
            reject(err);
        });
        process.stdin.resume(); // Ensure stdin is in a listening state
    });
};
