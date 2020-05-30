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

    else if (addr >= 0x4020) {
        return read_mapper(nes, addr);
    }

    throw `mem_read out of bounds`;
}

function mem_read_debug(nes: NES, addr: number): number {
    if (addr > 0xFFFF) throw `mem_read: addr > 0xFFFF`;

    if (addr >= 0x0000 && addr <= 0x1FFF) {
        return nes.iram[addr & 0x7FF];
    }

    else if (addr >= 0x2000 && addr <= 0x3FFF) {
        return 0;
    }

    else if (addr >= 0x4000 && addr <= 0x4017) {
        return 0;
    }

    else if (addr >= 0x4020) {
        return read_mapper(nes, addr);
    }

    throw `mem_read out of bounds`;
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

    else if (addr >= 0x4020) {
        write_mapper(nes, addr, val);
    }
}

function read_mapper(nes: NES, addr: number) {
    switch (nes.cart.mapper) {
        case 0:
            if (addr >= 0x6000 && addr <= 0x7FFF) {
                throw 'Mapper 0: Family Basic PRG RAM read';
            }

            else if (addr >= 0x8000 && addr <= 0xBFFF) {
                return nes.cart.prg_rom_data[addr - 0x8000];
            }

            else if (addr >= 0xC000 && addr <= 0xFFFF) {
                if (nes.cart.prg_rom_data.length > 16384) {
                    // No mirroring
                    // if (debug) console.log("Mapper 0: no mirorring")
                    return nes.cart.prg_rom_data[addr - 0x8000];
                } else {
                    // Mirroring
                    // if (debug) console.log("Mapper 0: mirroring")
                    return nes.cart.prg_rom_data[addr - 0xC000];
                }
            }
            throw `Mapper 0: read_mapper out of bounds`;
            break;
    }
    throw `Mapper ${nes.cart.mapper}: not implemented`;
}

function write_mapper(nes: NES, addr: number, val: number) {
    switch (nes.cart.mapper) {
        case 0:
            return;
    }
    throw "write_mapper not implemented";
}

function io_read(nes: NES, addr: number): number {
    return 0;
    throw `io_read not implemented addr:${hex(addr, 4)}`;
}

function io_write(nes: NES, addr: number, val: number): void {
    if (addr >= 0x4000 && addr <= 0x4013 || addr == 0x4015 || addr == 0x4017) {
        apu_io_write(nes, addr, val);
        return;
    }
    return;
    throw `io_write not implemented addr:${hex(addr, 4)} val:${hex(val, 2)}`;
}