const debug = false;

function cpu_execute(nes: NES): number {
    const prev_cycles = nes.cycles;

    if (debug) {
        console.log(`PC: ${hex(nes.reg_pc, 4)}`);
    }

    const opcode = cpu_read_tick_inc(nes);

    if (debug) {
        console.log(hex(opcode, 2));
    }

    cpu_dispatch(nes, opcode);
    cpu_intr_check(nes);

    bounds_check(nes.reg_a, 0, 0xFF, "A");
    bounds_check(nes.reg_x, 0, 0xFF, "X");
    bounds_check(nes.reg_y, 0, 0xFF, "Y");
    bounds_check(cpu_sp_get(nes), 0x100, 0x1FF, "SP");

    return nes.cycles - prev_cycles;
}

function cpu_intr_check(nes: NES) {
    if (nes.nmi_queued) {
        nes.nmi_queued = false;

        if (debug)
            console.log("Dispatching NMI");

        cpu_push16(nes, nes.reg_pc);
        cpu_push8(nes, nes.flag_get_for_push());

        const nmi_vector = cpu_read_tick(nes, 0xFFFA) | (cpu_read_tick(nes, 0xFFFB) << 8);
        nes.reg_pc = nmi_vector;

        nes.flag_i = false;

        if (debug)
            console.log(`NMI Vector: ${hex(nmi_vector, 4)}`);
    }
}

function bounds_check(i: number, lower: number, upper: number, desc: string) {
    if (i < lower || i > upper)
        throw `
        Bounds check failed
        ${desc}
        `;
}

function cpu_dispatch(nes: NES, opcode: number): void {
    // Single-byte instructions
    switch (opcode) {
        case 0x78: SEI(nes, opcode); return;
        case 0x20: JSR(nes, opcode); return;
        case 0xEA: NOP(nes, opcode); return;
        case 0x38: SEC(nes, opcode); return;
        case 0x18: CLC(nes, opcode); return;
        case 0x60: RTS(nes, opcode); return;
        case 0xF8: SED(nes, opcode); return;
        case 0x68: PLA(nes, opcode); return;
        case 0x08: PHP(nes, opcode); return;
        case 0xD8: CLD(nes, opcode); return;
        case 0x48: PHA(nes, opcode); return;
        case 0x28: PLP(nes, opcode); return;
        case 0xB8: CLV(nes, opcode); return;
        case 0xC8: INY(nes, opcode); return;
        case 0xE8: INX(nes, opcode); return;
        case 0x88: DEY(nes, opcode); return;
        case 0xCA: DEX(nes, opcode); return;
        case 0xA8: TAY(nes, opcode); return;
        case 0x98: TYA(nes, opcode); return;
        case 0x8A: TXA(nes, opcode); return;
        case 0x9A: TXS(nes, opcode); return;
        case 0xBA: TSX(nes, opcode); return;
        case 0x40: RTI(nes, opcode); return;

        case 0x1A:
        case 0x3A:
        case 0x5A:
        case 0x7A:
        case 0xDA:
        case 0xFA:
            INVALID_NOP(nes, opcode); return;

        case 0x04:
        case 0x44:
        case 0x64:

        case 0x14:
        case 0x34:
        case 0x54:
        case 0x74:
        case 0xD4:
        case 0xF4:
        case 0x80:
            INVALID_NOP_2BYTE(nes, opcode); return;

        case 0x0C:
        case 0x1C:
        case 0x3C:
        case 0x5C:
        case 0x7C:
        case 0xDC:
        case 0xFC:
            INVALID_NOP_3BYTE(nes, opcode); return;

        case 0xAF:
        case 0xBF:
        case 0xA7:
        case 0xB7:
        case 0xA3:
        case 0xB3:
            LAX(nes, opcode); return;
    }

    // Conditional branch instructions
    if ((opcode & 0b11111) == 0b10000) {
        const condition = (opcode & 0b11000000) >> 6;
        const set = bit_test(opcode, 5);

        if (set) {
            switch (condition) {
                case 0b00: BMI(nes, opcode); return; // Negative Set
                case 0b01: BVS(nes, opcode); return; // Overflow Set
                case 0b10: BCS(nes, opcode); return; // Carry Set
                case 0b11: BEQ(nes, opcode); return; // Zero Set
            }
        } else {
            switch (condition) {
                case 0b00: BPL(nes, opcode); return; // Negative Clear
                case 0b01: BVC(nes, opcode); return; // Overflow Clear
                case 0b10: BCC(nes, opcode); return; // Carry Clear
                case 0b11: BNE(nes, opcode); return; // Zero Clear
            }
        }
    }

    if (debug) {
        console.log(`Instruction class: ${opcode & 0b11}`);
        console.log(`Addressing mode: ${(opcode & 0b11100) >> 2}`);
    }

    const a = (opcode & 0b11100000) >> 5;
    switch (opcode & 0b11) {
        case 0b00:
            switch (a) {
                case 0b001: BIT(nes, opcode); return;
                case 0b010: JMP_ABS(nes, opcode); return;
                case 0b011: JMP_REL(nes, opcode); return;
                case 0b100: STY(nes, opcode); return;
                case 0b101: LDY(nes, opcode); return;
                case 0b110: CPY(nes, opcode); return;
                case 0b111: CPX(nes, opcode); return;
            }
            break;
        case 0b01:
            switch (a) {
                case 0b000: ORA(nes, opcode); return;
                case 0b001: AND(nes, opcode); return;
                case 0b010: EOR(nes, opcode); return;
                case 0b011: ADC(nes, opcode); return;
                case 0b100: STA(nes, opcode); return;
                case 0b101: LDA(nes, opcode); return;
                case 0b110: CMP(nes, opcode); return;
                case 0b111: SBC(nes, opcode); return;
            }
            break;
        case 0b10:
            switch (a) {
                case 0b000: ASL(nes, opcode); return;
                case 0b001: ROL(nes, opcode); return;
                case 0b010: LSR(nes, opcode); return;
                case 0b011: ROR(nes, opcode); return;
                case 0b100: STX(nes, opcode); return;
                case 0b101: LDX(nes, opcode); return;
                case 0b110: DEC(nes, opcode); return;
                case 0b111: INC(nes, opcode); return;
            }
            break;
    }

    throw `Unimplemented opcode: ${hex(opcode, 2)}`;
}

function cpu_read_tick(nes: NES, addr: number): number {
    nes_tick(nes, 1);
    return mem_read(nes, addr);
}

function cpu_read_tick_inc(nes: NES): number {
    return cpu_read_tick(nes, (nes.reg_pc++) & 0xFFFF);
}

function cpu_write_tick(nes: NES, addr: number, val: number): void {
    nes_tick(nes, 1);
    mem_write(nes, addr, val);
}

// #region Read addressing modes
// #endregion

function cpu_write_zeropage(nes: NES, offs: number, val: number): void {
    cpu_write_tick(nes, (offs) & 0xFF, val);
}

function cpu_read_execute_00(nes: NES, opcode: number): number {
    const mode = (opcode & 0b11100) >> 2;
    switch (mode) {
        case 0b000: // #immediate
            {
                const imm = cpu_read_tick_inc(nes);
                return imm;
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, zeroPageIndex);
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, final);
            }
        case 0b101: // zero page,X
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF);
            }
        case 0b111: // absolute, X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_x) & 0xFFFF);
            }
        default:
            throw `cpu_read_execute_00 invalid ${mode}`;
    }
}

function cpu_read_execute_01(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // (zero page,X)
            {
                const zeroPageIndex = (cpu_read_tick_inc(nes) + nes.reg_x) & 0xFF;
                const low = cpu_read_tick(nes, (zeroPageIndex + 0) & 0xFF);
                const high = cpu_read_tick(nes, (zeroPageIndex + 1) & 0xFF);
                console.log(nes.reg_x);
                return cpu_read_tick(nes, ((high << 8) | low));
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, zeroPageIndex);
            }
        case 0b010: // #immediate
            {
                const imm = cpu_read_tick_inc(nes);
                return imm;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, final);
            }
        case 0b100: // (zero page),Y
            {
                const zeroPageIndex = (cpu_read_tick_inc(nes)) & 0xFF;
                const low = cpu_read_tick(nes, (zeroPageIndex + 0) & 0xFF);
                const high = cpu_read_tick(nes, (zeroPageIndex + 1) & 0xFF);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_y) & 0xFFFF);
            }
        case 0b101: // zero page,X 
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF);
            }
        case 0b110: // absolute,Y
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_y) & 0xFFFF);
            }
        case 0b111: // absolute,X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_x) & 0xFFFF);
            }
        default:
            throw 'cpu_read_execute_01 invalid';
    }
}

function cpu_read_execute_ldx_stx_10(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // #immediate
            {
                const imm = cpu_read_tick_inc(nes);
                return imm;
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);

                if (debug)
                    console.log(`Zero page index: ${hex(zeroPageIndex, 2)}`);

                return cpu_read_tick(nes, zeroPageIndex);
            }
        case 0b010: // accumulator
            {
                return nes.reg_a;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, final);
            }
        case 0b101: // zero page,Y
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, (zeroPageIndex + nes.reg_y) & 0xFF);
            }
        case 0b111: // absolute,Y
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_y) & 0xFFFF);
            }
        default:
            throw 'cpu_read_execute_ldx_stx_10 invalid';
    }
}

function cpu_read_execute_10(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // #immediate
            {
                const imm = cpu_read_tick_inc(nes);
                return imm;
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);

                if (debug)
                    console.log(`Zero page index: ${hex(zeroPageIndex, 2)}`);

                return cpu_read_tick(nes, zeroPageIndex);
            }
        case 0b010: // accumulator
            {
                return nes.reg_a;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, final);
            }
        case 0b101: // zero page,Y
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, (zeroPageIndex + nes.reg_y) & 0xFF);
            }
        case 0b111: // absolute, X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_x) & 0xFFFF);
            }
        default:
            throw 'cpu_read_execute_10 invalid';
    }
}

function cpu_write_execute_00(nes: NES, opcode: number, val: number): void {
    const mode = (opcode & 0b11100) >> 2;
    switch (mode) {
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_zeropage(nes, zeroPageIndex, val);
                return;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, final, val);
                return;
            }
        case 0b101: // zero page,X
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_write_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF, val);
            }
        default:
            throw `cpu_write_execute_00 invalid ${mode}`;
    }
}

function cpu_write_execute_01(nes: NES, opcode: number, val: number): void {
    const mode = (opcode & 0b11100) >> 2;
    switch (mode) {
        case 0b000: // (zero page,X)
            {
                const zeroPageIndex = (cpu_read_tick_inc(nes) + nes.reg_x) & 0xFF;
                const low = cpu_read_tick(nes, (zeroPageIndex + 0) & 0xFF);
                const high = cpu_read_tick(nes, (zeroPageIndex + 1) & 0xFF);
                console.log(nes.reg_x);
                cpu_write_tick(nes, ((high << 8) | low), val);
                return;
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_tick(nes, zeroPageIndex, val);
                return;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, final, val);
                return;
            }
        case 0b100: // (zero page),Y
            {
                const zeroPageIndex = (cpu_read_tick_inc(nes)) & 0xFF;
                const low = cpu_read_tick(nes, (zeroPageIndex + 0) & 0xFF);
                const high = cpu_read_tick(nes, (zeroPageIndex + 1) & 0xFF);
                const final = (high << 8) | low;
                cpu_write_tick(nes, (final + nes.reg_y) & 0xFFFF, val);
                return;
            }
        case 0b101: // zero page,X 
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_write_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF, val);
            }
        case 0b110: // absolute,Y
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, (final + nes.reg_y) & 0xFFFF, val);
                return;
            }
        case 0b111: // absolute,X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, (final + nes.reg_x) & 0xFFFF, val);
                return;
            }

        default:
            throw `cpu_write_execute_01 invalid ${mode}`;
    }
}

function cpu_write_execute_ldx_stx_10(nes: NES, opcode: number, val: number): void {
    const mode = (opcode & 0b11100) >> 2;
    switch (mode) {
        case 0b001:
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_zeropage(nes, zeroPageIndex, val);
                return;
            }
        case 0b010: // accumulator
            {
                nes.reg_a = val;
                break;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, final, val);
                return;
            }
        case 0b101: // zero page,Y
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_tick(nes, (zeroPageIndex + nes.reg_y) & 0xFF, val);
                return;
            }
        case 0b111: // absolute, X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, (final + nes.reg_x) & 0xFFFF, val);
                return;
            }
        default:
            throw `cpu_write_execute_ldx_stx_10 invalid ${mode}`;
    }
}

function cpu_write_execute_10(nes: NES, opcode: number, val: number): void {
    const mode = (opcode & 0b11100) >> 2;
    switch (mode) {
        case 0b001:
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_zeropage(nes, zeroPageIndex, val);
                return;
            }
        case 0b010: // accumulator
            {
                nes.reg_a = val;
                break;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, final, val);
                return;
            }
        case 0b101: // zero page,X
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF, val);
                return;
            }
        case 0b111: // absolute, X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, (final + nes.reg_x) & 0xFFFF, val);
                return;
            }
        default:
            throw `cpu_write_execute_10 invalid ${mode}`;
    }
}


function cpu_read_modify_execute_10(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // #immediate
            {
                const imm = cpu_read_tick(nes, nes.reg_pc);
                return imm;
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick(nes, nes.reg_pc);

                if (debug)
                    console.log(`Zero page index: ${hex(zeroPageIndex, 2)}`);

                return cpu_read_tick(nes, zeroPageIndex);
            }
        case 0b010: // accumulator
            {
                return nes.reg_a;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick(nes, nes.reg_pc + 0);
                const high = cpu_read_tick(nes, nes.reg_pc + 1);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, final);
            }
        case 0b101: // zero page,X
            {
                const zeroPageIndex = cpu_read_tick(nes, nes.reg_pc);
                return cpu_read_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF);
            }
        case 0b110: // absolute, Y
            {
                const low = cpu_read_tick(nes, nes.reg_pc + 0);
                const high = cpu_read_tick(nes, nes.reg_pc + 1);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_y) & 0xFFFF);
            }
        case 0b111: // absolute, X
            {
                const low = cpu_read_tick(nes, nes.reg_pc + 0);
                const high = cpu_read_tick(nes, nes.reg_pc + 1);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_x) & 0xFFFF);
            }
        default:
            throw 'cpu_read_execute_10 invalid';
    }
}

function cpu_push8(nes: NES, val: number) {
    if (debug)
        console.log(`cpu_push8: ${hex(val, 2)} addr: ${hex(cpu_sp_get(nes), 4)}`);

    cpu_write_tick(nes, cpu_sp_get(nes), val);
    cpu_sp_dec(nes);

}
function cpu_pop8(nes: NES): number {
    cpu_sp_inc(nes);
    const byte = cpu_read_tick(nes, cpu_sp_get(nes));

    if (debug)
        console.log(`cpu_pop8: ${hex(byte, 2)} addr: ${hex(cpu_sp_get(nes), 4)}`);


    return byte;
}

function cpu_push16(nes: NES, val: number) {
    const high = (val >> 8) & 0xFF;
    const low = (val >> 0) & 0xFF;

    cpu_push8(nes, high);
    cpu_push8(nes, low);
}
function cpu_pop16(nes: NES) {
    const low = cpu_pop8(nes);
    const high = cpu_pop8(nes);

    return (high << 8) | low;
}


function cpu_sp_inc(nes: NES) {
    cpu_sp_set(nes, cpu_sp_get(nes) + 1);
}

function cpu_sp_dec(nes: NES) {
    cpu_sp_set(nes, cpu_sp_get(nes) - 1);
}

function cpu_sp_get(nes: NES): number {
    return 0b100000000 | nes.reg_sp;
}

function cpu_sp_set(nes: NES, val: number) {
    nes.reg_sp = val & 0xFF;
}

function SEI(nes: NES, opcode: number) {
    nes.flag_i = true;
}

function JMP_REL(nes: NES, opcode: number) {
    console.log("Relative jump");

    const lowSrc = cpu_read_tick_inc(nes);
    const highSrc = cpu_read_tick_inc(nes);

    const lowDest = cpu_read_tick(nes, (highSrc << 8) | ((lowSrc + 0) & 0xFF));
    const highDest = cpu_read_tick(nes, (highSrc << 8) | ((lowSrc + 1) & 0xFF));

    nes.reg_pc = (highDest << 8) | lowDest;
}

function JMP_ABS(nes: NES, opcode: number) {
    if (debug)
        console.log("Absolute jump");
    const low = cpu_read_tick_inc(nes);
    const high = cpu_read_tick_inc(nes);
    const final = (high << 8) | low;
    nes.reg_pc = final;
}

function STX(nes: NES, opcode: number) {
    cpu_write_execute_ldx_stx_10(nes, opcode, nes.reg_x);
}
function STY(nes: NES, opcode: number) {
    cpu_write_execute_00(nes, opcode, nes.reg_y);
}

function JSR(nes: NES, opcode: number) {
    const low = cpu_read_tick_inc(nes);
    const high = cpu_read_tick_inc(nes);
    const final = (high << 8) | low;

    cpu_push16(nes, nes.reg_pc - 1);
    nes.reg_pc = final;
}
function RTS(nes: NES, opcode: number) {
    const val = cpu_pop16(nes);
    nes.reg_pc = val + 1;
}
function RTI(nes: NES, opcode: number) {
    const flags = cpu_pop8(nes);
    const pc = cpu_pop16(nes);

    nes.flag_set(flags);
    nes.reg_pc = pc;
}

function NOP(nes: NES, opcode: number) {

}

function SEC(nes: NES, opcode: number) {
    nes.flag_c = true;
}
function CLC(nes: NES, opcode: number) {
    nes.flag_c = false;
}

function SED(nes: NES, opcode: number) {
    nes.flag_d = true;
}
function CLD(nes: NES, opcode: number) {
    nes.flag_d = false;
}

function CLV(nes: NES, opcode: number) {
    nes.flag_v = false;
}



function cpu_read_execute_lax(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // (zero page,X)
            {
                const zeroPageIndex = (cpu_read_tick_inc(nes) + nes.reg_x) & 0xFF;
                const low = cpu_read_tick(nes, (zeroPageIndex + 0) & 0xFF);
                const high = cpu_read_tick(nes, (zeroPageIndex + 1) & 0xFF);
                console.log(nes.reg_x);
                return cpu_read_tick(nes, ((high << 8) | low));
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, zeroPageIndex);
            }
        case 0b010: // #immediate
            {
                const imm = cpu_read_tick_inc(nes);
                return imm;
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, final);
            }
        case 0b100: // (zero page),Y
            {
                const zeroPageIndex = (cpu_read_tick_inc(nes)) & 0xFF;
                const low = cpu_read_tick(nes, (zeroPageIndex + 0) & 0xFF);
                const high = cpu_read_tick(nes, (zeroPageIndex + 1) & 0xFF);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_y) & 0xFFFF);
            }
        case 0b101: // zero page,X 
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_tick(nes, (zeroPageIndex + nes.reg_x) & 0xFF);
            }
        case 0b110: // absolute,Y
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_y) & 0xFFFF);
            }
        case 0b111: // absolute,X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return cpu_read_tick(nes, (final + nes.reg_x) & 0xFFFF);
            }
        default:
            throw 'cpu_read_execute_lax invalid';
    }
}
function LAX(nes: NES, opcode: number) {
    let val = cpu_read_execute_lax(nes, opcode);

    nes.reg_a = val;
    nes.reg_x = val;

    nes.flag_z = val == 0;
    nes.flag_n = bit_test(val, 7);
}

function LDA(nes: NES, opcode: number) {
    nes.reg_a = cpu_read_execute_01(nes, opcode);

    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function BIT(nes: NES, opcode: number) {
    const mem = cpu_read_execute_00(nes, opcode);
    nes.flag_z = (nes.reg_a & mem) == 0;
    nes.flag_v = bit_test(mem, 6);
    nes.flag_n = bit_test(mem, 7);
}

function CMP(nes: NES, opcode: number) {
    const mem = cpu_read_execute_01(nes, opcode);

    const result = nes.reg_a - mem;

    nes.flag_c = nes.reg_a >= mem;
    nes.flag_z = nes.reg_a == mem;
    nes.flag_n = bit_test(result, 7);
}

function CPX(nes: NES, opcode: number) {
    const mem = cpu_read_execute_00(nes, opcode);

    const result = nes.reg_x - mem;

    nes.flag_c = nes.reg_x >= mem;
    nes.flag_z = nes.reg_x == mem;
    nes.flag_n = bit_test(result, 7);
}
function CPY(nes: NES, opcode: number) {
    const mem = cpu_read_execute_00(nes, opcode);

    const result = nes.reg_y - mem;

    nes.flag_c = nes.reg_y >= mem;
    nes.flag_z = nes.reg_y == mem;
    nes.flag_n = bit_test(result, 7);
}

function cpu_execute_branch(nes: NES, condition: boolean) {
    const imm = cpu_read_tick_inc(nes);
    if (condition) {
        const offset = two8b(imm);
        nes.reg_pc = (nes.reg_pc + offset) & 0xFFFF;
    }
}

function STA(nes: NES, opcode: number) {
    cpu_write_execute_01(nes, opcode, nes.reg_a);
}

function BCS(nes: NES, opcode: number) {
    cpu_execute_branch(nes, nes.flag_c);
}
function BCC(nes: NES, opcode: number) {
    cpu_execute_branch(nes, !nes.flag_c);
}

function BEQ(nes: NES, opcode: number) {
    cpu_execute_branch(nes, nes.flag_z);
}
function BNE(nes: NES, opcode: number) {
    cpu_execute_branch(nes, !nes.flag_z);
}

function BVS(nes: NES, opcode: number) {
    cpu_execute_branch(nes, nes.flag_v);
}
function BVC(nes: NES, opcode: number) {
    cpu_execute_branch(nes, !nes.flag_v);
}

function BMI(nes: NES, opcode: number) {
    cpu_execute_branch(nes, nes.flag_n);
}
function BPL(nes: NES, opcode: number) {
    cpu_execute_branch(nes, !nes.flag_n);
}

function PLA(nes: NES, opcode: number) {
    nes.reg_a = cpu_pop8(nes);
    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function PHP(nes: NES, opcode: number) {
    cpu_push8(nes, nes.flag_get_for_push());
}
function PLP(nes: NES, opcode: number) {
    nes.flag_set(cpu_pop8(nes));
}

function PHA(nes: NES, opcode: number) {
    cpu_push8(nes, nes.reg_a);
}

function AND(nes: NES, opcode: number) {
    const mem = cpu_read_execute_01(nes, opcode);
    nes.reg_a &= mem;
    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function ORA(nes: NES, opcode: number) {
    const mem = cpu_read_execute_01(nes, opcode);
    nes.reg_a |= mem;
    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function EOR(nes: NES, opcode: number) {
    const mem = cpu_read_execute_01(nes, opcode);
    nes.reg_a ^= mem;
    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function ADC(nes: NES, opcode: number) {
    const mem = cpu_read_execute_01(nes, opcode);

    const previous_a = nes.reg_a;
    const result = nes.reg_a + mem + (nes.flag_c ? 1 : 0);

    nes.reg_a = result & 0xFF;

    nes.flag_z = nes.reg_a == 0;
    nes.flag_v = ((~(previous_a ^ mem)) & (previous_a ^ result) & 0x80) != 0;
    nes.flag_c = result > 0xFF;
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function SBC(nes: NES, opcode: number) {
    const mem = cpu_read_execute_01(nes, opcode);

    const previous_a = nes.reg_a;
    const result = nes.reg_a - mem - (nes.flag_c ? 0 : 1);

    nes.reg_a = result & 0xFF;

    nes.flag_z = nes.reg_a == 0;
    nes.flag_v = (((previous_a ^ mem)) & (previous_a ^ result) & 0x80) != 0;
    nes.flag_c = !((result & ~0xFF) != 0);
    nes.flag_n = bit_test(nes.reg_a, 7);
}

function LDX(nes: NES, opcode: number) {
    const val = cpu_read_execute_ldx_stx_10(nes, opcode);
    nes.reg_x = val;
    nes.flag_z = nes.reg_x == 0;
    nes.flag_n = bit_test(nes.reg_x, 7);
}
function LDY(nes: NES, opcode: number) {
    const mem = cpu_read_execute_00(nes, opcode);
    nes.reg_y = mem;
    nes.flag_z = nes.reg_y == 0;
    nes.flag_n = bit_test(nes.reg_y, 7);
}

function INY(nes: NES, opcode: number) {
    nes.reg_y = (nes.reg_y + 1) & 0xFF;

    nes.flag_z = nes.reg_y == 0;
    nes.flag_n = bit_test(nes.reg_y, 7);
}
function INX(nes: NES, opcode: number) {
    nes.reg_x = (nes.reg_x + 1) & 0xFF;

    nes.flag_z = nes.reg_x == 0;
    nes.flag_n = bit_test(nes.reg_x, 7);
}

function DEY(nes: NES, opcode: number) {
    nes.reg_y = (nes.reg_y - 1) & 0xFF;

    nes.flag_z = nes.reg_y == 0;
    nes.flag_n = bit_test(nes.reg_y, 7);
}

function DEX(nes: NES, opcode: number) {
    nes.reg_x = (nes.reg_x - 1) & 0xFF;

    nes.flag_z = nes.reg_x == 0;
    nes.flag_n = bit_test(nes.reg_x, 7);
}

function TAY(nes: NES, opcode: number) {
    nes.reg_y = nes.reg_a;

    nes.flag_z = nes.reg_y == 0;
    nes.flag_n = bit_test(nes.reg_y, 7);
}
function TYA(nes: NES, opcode: number) {
    nes.reg_a = nes.reg_y;

    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}
function TXA(nes: NES, opcode: number) {
    nes.reg_a = nes.reg_x;

    nes.flag_z = nes.reg_a == 0;
    nes.flag_n = bit_test(nes.reg_a, 7);
}
function TSX(nes: NES, opcode: number) {
    nes.reg_x = nes.reg_sp;

    nes.flag_z = nes.reg_x == 0;
    nes.flag_n = bit_test(nes.reg_x, 7);
}
function TXS(nes: NES, opcode: number) {
    nes.reg_sp = nes.reg_x;
}

// #region Instructions that read and write back
function LSR(nes: NES, opcode: number) {
    const val = cpu_read_modify_execute_10(nes, opcode);

    if (debug)
        console.log(`Input val: ${hex(val, 2)}`);

    const result = val >> 1;

    nes.flag_c = (val & BIT_0) != 0;
    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    if (debug)
        console.log(`Writeback val: ${hex(result, 2)}`);
    cpu_write_execute_10(nes, opcode, result);
}

function ASL(nes: NES, opcode: number) {
    const val = cpu_read_modify_execute_10(nes, opcode);

    const result = (val << 1) & 0xFF;

    nes.flag_c = (val & BIT_7) != 0;
    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    cpu_write_execute_10(nes, opcode, result);
}

function ROR(nes: NES, opcode: number) {
    const val = cpu_read_modify_execute_10(nes, opcode);

    const result = (val >> 1) | (nes.flag_c ? BIT_7 : 0);

    nes.flag_c = (val & BIT_0) != 0;
    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    cpu_write_execute_10(nes, opcode, result);
}

function ROL(nes: NES, opcode: number) {
    const val = cpu_read_modify_execute_10(nes, opcode);

    const result = ((val << 1) & 0xFF) | (nes.flag_c ? BIT_0 : 0);

    nes.flag_c = (val & BIT_7) != 0;
    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    cpu_write_execute_10(nes, opcode, result);
}

function INC(nes: NES, opcode: number) {
    const mem = cpu_read_modify_execute_10(nes, opcode);
    const result = (mem + 1) & 0xFF;

    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    cpu_write_execute_10(nes, opcode, result);
}
function DEC(nes: NES, opcode: number) {
    const mem = cpu_read_modify_execute_10(nes, opcode);
    const result = (mem - 1) & 0xFF;

    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    cpu_write_execute_10(nes, opcode, result);
}

function INVALID_NOP(nes: NES, opcode: number) {

}

function INVALID_NOP_2BYTE(nes: NES, opcode: number) {
    cpu_read_tick_inc(nes);
}


function INVALID_NOP_3BYTE(nes: NES, opcode: number) {
    cpu_read_tick_inc(nes);
    cpu_read_tick_inc(nes);
}


// #endregion