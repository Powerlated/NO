class NES {
    reg_a = 0;
    reg_x = 0;
    reg_y = 0;
    reg_pc = 0;
    reg_sp = 0;

    flag_n = false; // Negative
    flag_v = false; // Overflow
    // ------------
    flag_b = false; // NOP - B Flag
    flag_d = false; // Decimal
    flag_i = false; // Disable Interrupts
    flag_z = false; // Zero
    flag_c = false; // Carry

    flag_set(val: number): void {
        this.flag_n = bit_get(val, 7); // Negative
        this.flag_v = bit_get(val, 6); // Overflow
        // ------------
        this.flag_b = bit_get(val, 4); // NOP - B Flag
        this.flag_d = bit_get(val, 3); // Decimal
        this.flag_i = bit_get(val, 2); // Disable Interrupts
        this.flag_z = bit_get(val, 1); // Zero
        this.flag_c = bit_get(val, 0); // Carry
    }

    flag_get(): number {
        let val = 0;
        if (this.flag_n) val |= BIT_7; // Negative
        if (this.flag_v) val |= BIT_6; // Overflow
        // ------------
        if (this.flag_b) val |= BIT_4; // NOP - B Flag
        if (this.flag_d) val |= BIT_3; // Decimal
        if (this.flag_i) val |= BIT_2; // Disable Interrupts
        if (this.flag_z) val |= BIT_1; // Zero
        if (this.flag_c) val |= BIT_0; // Carry
        return val;
    }


    iram = new Uint8Array(0x800);
}