interface Mapper {
    read(nes: NES, addr: number): number;
    write(nes: NES, addr: number, val: number): void;

    read_chr(nes: NES, addr: number): number;
}

const mapper_table: (Mapper | null)[] = [
    new NROM(), null, null, null, null
]