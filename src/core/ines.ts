function parse_iNES(rom: Uint8Array) {
    console.log(`File length: ${rom.length}`)

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
        console.log(`Cartridge uses CHR RAM`)
    }

    

}