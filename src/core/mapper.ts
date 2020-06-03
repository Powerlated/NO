interface Mapper {
    read(nes: NES, addr: number): number;
    write(nes: NES, addr: number, val: number): void;

    read_chr(nes: NES, addr: number): number;
}

const mapper_table: any[] = [];

mapper_table[0] = NROM;
mapper_table[1] = MMC1;
mapper_table[2] = UxROM;
mapper_table[3] = CNROM;
// mapper_table[4] = MMC3;
mapper_table[66] = GxROM;
//
