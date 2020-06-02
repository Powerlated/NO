class NROM implements Mapper {
    read(nes: NES, addr: number): number {
        if (addr >= 0x4020 && addr <= 0x5FFF) {
            return 0;
        }
        else if (addr >= 0x6000 && addr <= 0x7FFF) {
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
        throw `Mapper 0: read_mapper out of bounds addr${hex(addr, 4)}`;
    }
    
    write(nes: NES, addr: number, val: number): void {

    }

    read_chr(nes: NES, addr: number): number {
        return nes.cart.chr_rom_data[addr];
    }
}