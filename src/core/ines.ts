function parse_iNES(rom: Uint8Array): iNES {
    console.log(`File length: ${rom.length}`);

    if (
        rom[0] == 0x4E &&
        rom[1] == 0x45 &&
        rom[2] == 0x53 &&
        rom[3] == 0x1A
    ) {
        console.log("NES magic intact");
    }

    console.log(`${rom[4] * 16384} PRG ROM bytes`);
    if (rom[5] != 0) {
        console.log(`${rom[5] * 8192} CHR ROM bytes`);
    } else {
        console.log(`Cartridge uses CHR RAM`);
    }

    const prg_rom_size = rom[4]; // In 16 KiB units
    const chr_rom_size = rom[5]; // In 8 KiB units

    const prg_rom_size_bytes = prg_rom_size * 16384;
    const chr_rom_size_bytes = chr_rom_size * 8192;

    const flags_6 = rom[6];

    const vertical_mirroring = bit_test(flags_6, 0);
    const persistent_memory = bit_test(flags_6, 1);
    const trainer = bit_test(flags_6, 2);
    const four_screen_vram = bit_test(flags_6, 3);
    const mapper_lower_nybble = (flags_6 >> 4) & 0xF;

    const flags_7 = rom[7];

    const vs_unisystem = bit_test(flags_7, 0);
    const playchoice_10 = bit_test(flags_7, 1);
    const ines_2_0 = ((flags_7 >> 2) & 0b11) == 2;
    const mapper_upper_nybble = (flags_7) & 0xF0;

    const mapper_id = mapper_lower_nybble | mapper_upper_nybble;
    console.log(`Mapper: ${mapper_id}`);

    const flags_8 = rom[8];

    const prg_ram_size = flags_8; // in 8 KiB units

    const flags_9 = rom[9];

    const pal = bit_test(flags_9, 0);

    const flags_10 = rom[10];

    const tv_system = flags_10 & 0b11;
    const prg_ram_present = bit_test(flags_10, 4);
    const has_bus_conflicts = bit_test(flags_10, 5);

    let read_head = 0;
    read_head += 16; // Header data
    if (trainer) {
        console.log("Trainer present");
        read_head += 512;
    } else {
        console.log("No trainer");
    }

    const prg_rom_data = new Uint8Array(prg_rom_size_bytes);
    const chr_rom_data = new Uint8Array(chr_rom_size_bytes);

    for (let i = 0; i < prg_rom_size_bytes; i++) {
        prg_rom_data[i] = rom[read_head];
        read_head++;
    }

    for (let i = 0; i < chr_rom_size_bytes; i++) {
        chr_rom_data[i] = rom[read_head];
        read_head++;
    }

    const nes = new iNES(mapper_id, prg_rom_data, chr_rom_data, vertical_mirroring);
    return nes;
}


class iNES {
    mapper_id: number;
    mapper: Mapper;

    prg_rom_data: Uint8Array;
    chr_rom_data: Uint8Array;

    vertical_mirroring: boolean;

    constructor(mapper_id: number, prg_rom_data: Uint8Array, chr_rom_data: Uint8Array, vertical_mirroring: boolean) {
        this.mapper_id = mapper_id;

        if (!mapper_table[mapper_id]) {
            throw `Mapper ${mapper_id} unimplemented`;
        }

        this.mapper = mapper_table[mapper_id]!;

        this.prg_rom_data = prg_rom_data;
        this.chr_rom_data = chr_rom_data;

        this.vertical_mirroring = vertical_mirroring;
    }
}

function generate_empty_iNES(): iNES {
    return new iNES(0, new Uint8Array(16384), new Uint8Array(8192), false);
}