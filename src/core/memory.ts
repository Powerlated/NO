function mem_read(nes: NES, addr: number): number {
    if (addr > 0xFFFF) throw `mem_read: addr > 0xFFFF`;

    if (addr >= 0x0000 && addr <= 0x1FFF) {
        return nes.iram[addr & 0x7FF];
    }

    else if (addr >= 0x2000 && addr <= 0x3FFF) {
        return ppu_reg_read(nes, (addr & 0x7) + 0x2000);
    }

    else if (addr >= 0x4000 && addr <= 0x4017) {
        return io_read(nes, addr);
    }
}

function mem_write(nes: NES, addr: number, val: number): void {
    if (addr > 0xFFFF) throw `mem_write: addr > 0xFFFF`;
    if (val > 0xFF) throw `mem_write: val > 0xFF`;

    if (addr >= 0x0000 && addr <= 0x1FFF) {
        nes.iram[addr & 0x7FF] = val;
    }

    else if (addr >= 0x2000 && addr <= 0x3FFF) {
        ppu_reg_write(nes, (addr & 0x7) + 0x2000, val);
    }

    else if (addr >= 0x4000 && addr <= 0x4017) {
        io_write(nes, addr, val);
    }
}


function io_read(nes: NES, addr: number): number {
    throw "io_read not implemented";
    return 0xFF;
}

function io_write(nes: NES, addr: number, val: number): void {
    throw "io_write not implemented";
}