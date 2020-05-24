function cpu_execute(nes: NES): void {
    const opcode = cpu_read_tick(nes, nes.reg_pc);

    switch (opcode & 0b11) {
        case 0b01:
            switch ((opcode & 0b11100000) >> 5) {
                case 0b000: ORA(nes); break;
                case 0b001: AND(nes); break;
                case 0b010: EOR(nes); break;
                case 0b011: ADC(nes); break;
                case 0b100: STA(nes); break;
                case 0b101: LDA(nes); break;
                case 0b110: CMP(nes); break;
                case 0b111: SBC(nes); break;
            }
            break;
    }
}

function cpu_read_tick(nes: NES, addr: number): number {

}

function cpu_write_tick(nes: NES, addr: number, val: number): void {

}

// #region Read addressing modes

function cpu_read_zeropage(nes: NES, offs: number): number {
    return cpu_read_tick(nes, (offs) & 0xFF);
}

function cpu_read_zeropage_x(nes: NES, offs: number): number {
    return cpu_read_tick(nes, (offs + nes.reg_x) & 0xFF);
}

function cpu_read_zeropage_y(nes: NES, offs: number): number {
    return cpu_read_tick(nes, (offs + nes.reg_y) & 0xFF);
}
// #endregion

function cpu_read_addressing_01(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // (zero page,X)
            {
                const zeroPageIndex = cpu_read_tick(nes, (nes.reg_pc + 1) & 0xFFFF);
                return cpu_read_zeropage_x(nes, zeroPageIndex);
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick(nes, (nes.reg_pc + 1) & 0xFFFF);
                return cpu_read_zeropage(nes, zeroPageIndex);
            }
        case 0b010: // immediate
            {
                const imm = cpu_read_tick(nes, (nes.reg_pc + 1) & 0xFFFF);
                return imm;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick(nes, (nes.reg_pc + 1) & 0xFFFF);
                const high = cpu_read_tick(nes, (nes.reg_pc + 2) & 0xFFFF);
                const ptr = (high << 8) | low;
                return cpu_read_tick(nes, ptr);
            }
        case 0b100: // (zero page,Y)
            {
                const zeroPageIndex = cpu_read_tick(nes, (nes.reg_pc + 1) & 0xFFFF);
                return cpu_read_zeropage_y(nes, zeroPageIndex);
            }
        case 0b101: // zero page,X 
            {
                const zeroPageIndex = cpu_read_tick(nes, (nes.reg_pc + 1) & 0xFFFF);
                
            }
    }
}

function ORA(nes: NES) {

}