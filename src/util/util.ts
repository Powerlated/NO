function two4b(n: number): number {
    if ((n & BIT_3) !== 0)
        n -= BIT_4;

    return n;
}

function two8b(n: number): number {
    if ((n & BIT_7) !== 0)
        n -= BIT_8;

    return n;
}

function two16b(n: number): number {
    if ((n & BIT_15) !== 0)
        n -= BIT_16;

    return n;
}

function do4b(i: number): boolean {
    return (i ^ 0xF) !== 0;
}

function do8b(i: number): boolean {
    return (i ^ 0xFF) !== 0;
}

function do16b(i: number): boolean {
    return (i ^ 0xFFFF) !== 0;
}

function hex(i: any, digits: number) {
    return `0x${pad(i.toString(16), digits, '0').toUpperCase()}`;
}

function hexN(i: any, digits: number) {
    return pad(i.toString(16), digits, '0').toUpperCase();
}

function hexN_LC(i: any, digits: number) {
    return pad(i.toString(16), digits, '0');
}

function pad(input: string, width: number, char: string) {
    char = char || '0';
    input = input + '';
    return input.length >= width ? input : new Array(width - input.length + 1).join(char) + input;
}

function r_pad(input: string, width: number, char: string) {
    char = char || '0';
    input = input + '';
    return input.length >= width ? input : input + new Array(width - input.length + 1).join(char);
}

function assert(n1: any, n2: any, reason: string) {
    if (n1 != n2) {
        console.error(`Assertion failed:
            ${reason}
            ${n1} != ${n2}
        `);
        return false;
    }
    return true;
}