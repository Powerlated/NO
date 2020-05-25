const debug = true;

function cpu_execute(nes: NES): void {
    if (debug) {
        console.log(`PC: ${hex(nes.reg_pc, 4)}`);
    }

    const opcode = cpu_read_tick_inc(nes);

    if (debug) {
        console.log(hex(opcode, 2));
    }

    cpu_dispatch(nes, opcode);

    if (nes.reg_x > 0xFF) console.log(hex(nes.reg_pc, 4));

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
        case 0xBA: TSX(nes, opcode); return;
        case 0x9A: TXS(nes, opcode); return;
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

    const a = (opcode & 0b11100000) >> 5;
    switch (opcode & 0b11) {
        case 0b00:
            switch (a) {
                case 0b001: BIT(nes, opcode); return;
                case 0b010: JMP(nes, opcode); return;
                case 0b011: JMP(nes, opcode); return;
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
}

function cpu_read_tick(nes: NES, addr: number): number {
    return mem_read(nes, addr);
}

function cpu_read_tick_inc(nes: NES): number {
    return cpu_read_tick(nes, (nes.reg_pc++) & 0xFFFF);
}

function cpu_write_tick(nes: NES, addr: number, val: number): void {
    mem_write(nes, addr, val);
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
                return cpu_read_zeropage(nes, zeroPageIndex);
            }
        case 0b011: // absolute
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return final;
            }
        case 0b101: // zero page,X
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_zeropage_x(nes, zeroPageIndex);
            }
        case 0b111: // absolute, X
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                return (final + nes.reg_x) & 0xFFFF;
            }
        default:
            throw `cpu_read_execute_00 invalid ${mode}`;
    }
}

function cpu_read_execute_01(nes: NES, opcode: number): number {
    switch ((opcode & 0b11100) >> 2) {
        case 0b000: // (zero page,X)
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_zeropage_x(nes, zeroPageIndex);
            }
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_zeropage(nes, zeroPageIndex);
            }
        case 0b010: // immediate
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
        case 0b100: // (zero page,Y)
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_zeropage_y(nes, zeroPageIndex);
            }
        case 0b101: // zero page,X 
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_zeropage_x(nes, zeroPageIndex);
            }
        default:
            throw 'cpu_read_execute_01 invalid';
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
                return cpu_read_zeropage(nes, zeroPageIndex);
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
        case 0b101: // zero page,X
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                return cpu_read_zeropage_x(nes, zeroPageIndex);
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
        case 0b010:

        default:
            throw `cpu_write_execute_00 invalid ${mode}`;
    }
}

function cpu_write_execute_01(nes: NES, opcode: number, val: number): void {
    const mode = (opcode & 0b11100) >> 2;
    switch (mode) {
        case 0b001: // zero page
            {
                const zeroPageIndex = cpu_read_tick_inc(nes);
                cpu_write_tick(nes, zeroPageIndex, val);
                return;
            }
        case 0b111: // absolute,Y
            {
                const low = cpu_read_tick_inc(nes);
                const high = cpu_read_tick_inc(nes);
                const final = (high << 8) | low;
                cpu_write_tick(nes, (final + nes.reg_y) & 0xFFFF, val);
                return;
            }
        default:
            throw `cpu_write_execute_01 invalid ${mode}`;
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
        default:
            throw `cpu_write_execute_10 invalid ${mode}`;
    }
}

function cpu_push8(nes: NES, val: number) {

    console.log(`cpu_push8: ${hex(val, 2)} addr: ${hex(cpu_sp_get(nes), 4)}`);
    cpu_write_tick(nes, cpu_sp_get(nes), val);
    cpu_sp_dec(nes);

}
function cpu_pop8(nes: NES): number {
    cpu_sp_inc(nes);
    const byte = cpu_read_tick(nes, cpu_sp_get(nes));
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
    nes.interrupt_disable = true;
}

function JMP(nes: NES, opcode: number) {
    const val = cpu_read_execute_00(nes, opcode);
    nes.reg_pc = val;
}



function STX(nes: NES, opcode: number) {
    cpu_write_execute_10(nes, opcode, nes.reg_x);
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
    const val = cpu_read_execute_10(nes, opcode);
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

function DEC(nes: NES, opcode: number) {
    const mem = cpu_read_execute_10(nes, opcode);
    const result = (mem - 1) & 0xFF;

    nes.flag_z = result == 0;
    nes.flag_n = bit_test(result, 7);

    cpu_write_execute_10(nes, opcode, result);
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