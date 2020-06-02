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
        return nes.cart.mapper.read(nes, addr);
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
        return nes.cart.mapper.read(nes, addr);
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
        nes.cart.mapper.write(nes, addr, val);
    }
}


function io_read(nes: NES, addr: number): number {
    switch (addr) {
        case 0x4016:
            return controller_read_port1(nes);
    }
    return 0;
    throw `io_read not implemented addr:${hex(addr, 4)}`;
}

function io_write(nes: NES, addr: number, val: number): void {
    switch (addr) {
        case 0x4014:
            ppu_oam_dma(nes, val);
            return;
        case 0x4016:
            controller_set(nes, val);
            return;
    }
    if (addr >= 0x4000 && addr <= 0x4013 || addr == 0x4015 || addr == 0x4017) {
        apu_io_write(nes, addr, val);
        return;
    }
    return;
    throw `io_write not implemented addr:${hex(addr, 4)} val:${hex(val, 2)}`;
}