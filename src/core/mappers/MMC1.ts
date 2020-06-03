class MMC1 implements Mapper {
    // MMC1 internal 5-bit shift register
    shift = 0b10000;

    static prg_bank_size = 16384;
    static chr_bank_size = 4096;

    // Control

    // TODO: Hook MMC1 mirroring up to PPU
    mirroring_mode = 0;
    prg_multi_bank = false;
    prg_multi_bank_fix_first = false;
    chr_banking_mode = 0;

    chr_bank0 = 0;
    chr_bank1 = 0;

    prg_bank = 0;
    prg_ram_enable = false;

    read(nes: NES, addr: number): number {
        const prg_rom_banks = nes.cart.prg_rom_data.length / MMC1.prg_bank_size;

        // PRG RAM
        if (addr >= 0x6000 && addr <= 0x7FFF) {
            return 0;
            // throw `MMC1: PRG RAM read`;
        }
        else if (addr >= 0x8000 && addr <= 0xFFFF) {
            if (!this.prg_multi_bank) {
                const base = prg_rom_banks * this.prg_bank;
                addr -= 0x8000;
                return nes.cart.prg_rom_data[base + addr];
            } else {
                if (addr >= 0x8000 && addr <= 0xBFFF) {
                    // First/Switchable bank
                    addr -= 0x8000;
                    if (this.prg_multi_bank_fix_first) {
                        const base = MMC1.prg_bank_size * 0;
                        return nes.cart.prg_rom_data[base + addr];
                    } else {
                        const base = MMC1.prg_bank_size * this.prg_bank;
                        return nes.cart.prg_rom_data[base + addr];
                    }
                } else if (addr >= 0xC000 && addr <= 0xFFFF) {
                    // Last/Switchable Bank
                    addr -= 0xC000;
                    if (!this.prg_multi_bank_fix_first) {
                        const base = MMC1.prg_bank_size * (prg_rom_banks - 1);
                        return nes.cart.prg_rom_data[base + addr];
                    } else {
                        const base = MMC1.prg_bank_size * this.prg_bank;
                        return nes.cart.prg_rom_data[base + addr];
                    }
                }
            }
        }
        throw `MMC1: read_mapper out of bounds addr:${hex(addr, 4)}`;
    }

    write(nes: NES, addr: number, val: number): void {
        if (addr >= 0x8000 && addr <= 0xFFFF) {
            let bit = val & 1;
            let reset = bit_test(val, 7);

            if (reset) {
                this.shift = 0b10000;
            } else {
                // If the shift register is full, then....
                if (bit_test(this.shift, 0)) {
                    let sr_val = (this.shift >> 1) | (bit << 4);

                    // console.log(`Value: ${sr_val}`);
                    if (addr >= 0x8000 && addr <= 0x9FFF) {
                        // Control
                        this.mirroring_mode = (sr_val >> 0) & 0b11;
                        this.prg_multi_bank = bit_test(sr_val, 3);
                        this.prg_multi_bank_fix_first = bit_test(sr_val, 4);
                        this.chr_banking_mode = (sr_val >> 4) & 0b1;
                    } else if (addr >= 0xA000 && addr <= 0xBFFF) {
                        // CHR Bank 0
                        this.chr_bank0 = sr_val;
                    } else if (addr >= 0xC000 && addr <= 0xDFFF) {
                        // CHR Bank 1
                        this.chr_bank1 = sr_val;
                    } else if (addr >= 0xE000 && addr <= 0xFFFF) {
                        // PRG Bank
                        this.prg_bank = sr_val & 0b1111;
                        this.prg_ram_enable = bit_test(sr_val, 4);
                        // console.log(this.prg_ram_enable);
                    }

                    // Reset
                    this.shift = 0b10000;

                } else {
                    this.shift >>= 1;
                    this.shift |= (bit << 4);
                }
            }
        }
    }
    read_chr(nes: NES, addr: number): number {
        return nes.cart.chr_rom_data[addr];
    }
}