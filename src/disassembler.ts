function getMemoryLocation(i: number): string {
    if (i >= 0x0000 && i <= 0x07FF) return "WRAM";
    if (i >= 0x0800 && i <= 0x1FFF) return "WRAM-MIR";
    if (i >= 0x2000 && i <= 0x2007) return "PPU";
    if (i >= 0x2008 && i <= 0x3FFF) return "PPU-MIR";
    if (i >= 0x4000 && i <= 0x4017) return "IO";
    if (i >= 0x4018 && i <= 0x401F) return "TEST";
    if (i >= 0x4020 && i <= 0xFFFF) return "CART";

    return "???";
}

const emptyLine = "-------";

const BEFORE = 10;
const AFTER = 20;

// Generates HTML for the disassembler view
function disassemble(nes: NES): string {
    let lines: string[] = [];
    let disasmHead = nes.reg_pc;

    for (let i = 0; i < AFTER; i++) {
        const readAt = disasmHead & 0xFFFF;
        let line = `${pad(getMemoryLocation(readAt), 8, ' ')} ${hex(readAt, 4)}: ${hex(mem_read_debug(nes, readAt), 2)}`;
        lines[i] = line;

        disasmHead++;
    }

    let linesFinal: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        linesFinal[i] = `<span>${lines[i]}</span><br/>`;
    }

    return linesFinal.join('\n');
};