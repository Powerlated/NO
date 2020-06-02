class UxROM implements Mapper {
    prg_rom_bank = 0;

    static prg_bank_size = 16384;

    read(nes: NES, addr: number): number {
        const prg_bank_num = (nes.cart.prg_rom_data.length / 16384);

        if (addr >= 0x8000 && addr <= 0xBFFF) {
            addr -= 0x8000;

            return nes.cart.prg_rom_data[(this.prg_rom_bank * UxROM.prg_bank_size) + addr];
        } else if (addr >= 0xC000 && addr <= 0xFFFF) {
            addr -= 0xC000;

            return nes.cart.prg_rom_data[((prg_bank_num - 1) * UxROM.prg_bank_size) + addr];
        }
        return 0;
    }

    write(nes: NES, addr: number, val: number): void {
        if (addr >= 0x8000 && addr <= 0xFFFF) {
            this.prg_rom_bank = val & 0b111;
        }
    }

    read_chr(nes: NES, addr: number): number {
        return nes.cart.chr_rom_data[addr];
    }
}