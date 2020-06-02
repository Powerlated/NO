class GxROM implements Mapper {
    chr_rom_bank = 0;
    prg_rom_bank = 0;

    read(nes: NES, addr: number): number {
        if (addr >= 0x8000 && addr <= 0xFFFF) {
            addr -= 0x8000;

            const base = this.prg_rom_bank * 32768;
            return nes.cart.prg_rom_data[base + addr];
        }
        return 0;
    }

    write(nes: NES, addr: number, val: number): void {
        if (addr >= 0x8000 && addr <= 0xFFFF) {
            const chr_bank_mask = (nes.cart.chr_rom_data.length / 8192) - 1
            const prg_bank_mask = (nes.cart.prg_rom_data.length / 32768) - 1

            const chr_rom_bank = ((val >> 0) & 0b111) & chr_bank_mask;
            const prg_rom_bank = ((val >> 4) & 0b111) & prg_bank_mask;

            this.chr_rom_bank = chr_rom_bank;
            this.prg_rom_bank = prg_rom_bank;

            console.log(`Mapper 66: CHR ROM Bank:${chr_rom_bank}`)
            console.log(`Mapper 66: PRG ROM Bank:${prg_rom_bank}`)
        }
    }

    read_chr(nes: NES, addr: number): number {
        const base = this.chr_rom_bank * 8192;
        return nes.cart.chr_rom_data[base + addr];
    }
}