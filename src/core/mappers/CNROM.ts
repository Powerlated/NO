class CNROM implements Mapper {
    chr_rom_bank = 0;
    static chr_bank_size = 8192;

    read(nes: NES, addr: number): number {
        if (addr >= 0x4020 && addr <= 0x5FFF) {
            return 0;
        }
        else if (addr >= 0x6000 && addr <= 0x7FFF) {
        }

        else if (addr >= 0x8000 && addr <= 0xBFFF) {
            return nes.cart.prg_rom_data[addr - 0x8000];
        }

        else if (addr >= 0xC000 && addr <= 0xFFFF) {
            if (nes.cart.prg_rom_data.length > 16384) {
                return nes.cart.prg_rom_data[addr - 0x8000];
            } else {
                return nes.cart.prg_rom_data[addr - 0xC000];
            }
        }
        throw `CNROM: read_mapper out of bounds addr${hex(addr, 4)}`;
    }

    write(nes: NES, addr: number, val: number): void {
        this.chr_rom_bank = val & 0b11;
    }

    read_chr(nes: NES, addr: number): number {
        return nes.cart.chr_rom_data[(this.chr_rom_bank * CNROM.chr_bank_size) + addr];
    }
}