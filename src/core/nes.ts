class NES {
    constructor(cart: iNES) {
        this.cart = cart;
        this.reset();
    }

    cart: iNES;

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
        this.flag_n = bit_test(val, 7); // Negative
        this.flag_v = bit_test(val, 6); // Overflow
        // ------------
        this.flag_b = bit_test(val, 4); // NOP - B Flag
        this.flag_d = bit_test(val, 3); // Decimal
        this.flag_i = bit_test(val, 2); // Disable Interrupts
        this.flag_z = bit_test(val, 1); // Zero
        this.flag_c = bit_test(val, 0); // Carry
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

    reset() {
        this.reg_a = 0;
        this.reg_x = 0;
        this.reg_y = 0;
        this.reg_pc = 0;
        this.reg_sp = 0;

        this.flag_n = false;
        this.flag_v = false;
        this.flag_b = false;
        this.flag_d = false;
        this.flag_i = false;
        this.flag_z = false;
        this.flag_c = false;

        const resetVector = read_mapper(this, 0xFFFC) | (read_mapper(this, 0xFFFD) << 8);
        console.log(`Reset Vector: ${hex(resetVector, 4)}`);
        this.reg_pc = resetVector;
    }

    iram = new Uint8Array(0x800);
}