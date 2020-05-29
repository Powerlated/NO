class NES {
    constructor(cart: iNES) {
        this.cart = cart;
        this.reset();
    }

    cart: iNES;

    cycles = 0;

    reg_a = 0;
    reg_x = 0;
    reg_y = 0;
    reg_pc = 0;
    reg_sp = 0;

    nmi_line = true;
    nmi_queued = false;

    flag_n = false; // Negative
    flag_v = false; // Overflow
    // ------------
    flag_b = false; // NOP - B Flag
    flag_d = false; // Decimal
    flag_i = true; // Disable Interrupts
    flag_z = false; // Zero
    flag_c = false; // Carry

    flag_set(val: number): void {
        this.flag_n = bit_test(val, 7); // Negative
        this.flag_v = bit_test(val, 6); // Overflow
        this.flag_b = bit_test(val, 5); // NOP - B Flag
        // ------------
        this.flag_d = bit_test(val, 3); // Decimal
        this.flag_i = bit_test(val, 2); // Disable Interrupts
        this.flag_z = bit_test(val, 1); // Zero
        this.flag_c = bit_test(val, 0); // Carry
    }

    flag_get(): number {
        let val = 0;
        if (this.flag_n) val |= BIT_7; // Negative
        if (this.flag_v) val |= BIT_6; // Overflow
        val |= BIT_5; // NOP - B Flag    
        // val |= BIT_4; // NOP - B Flag    
        if (this.flag_d) val |= BIT_3; // Decimal
        if (this.flag_i) val |= BIT_2; // Disable Interrupts
        if (this.flag_z) val |= BIT_1; // Zero
        if (this.flag_c) val |= BIT_0; // Carry
        return val;
    }

    flag_get_for_push(): number {
        console.log("Flag for push");
        let val = 0;
        if (this.flag_n) val |= BIT_7; // Negative
        if (this.flag_v) val |= BIT_6; // Overflow
        val |= BIT_5; // NOP - B Flag    
        val |= BIT_4; // NOP - B Flag    
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

        const resetVector = read_mapper(this, 0xFFFC) | (read_mapper(this, 0xFFFD) << 8);
        console.log(`Reset Vector: ${hex(resetVector, 4)}`);
        this.reg_pc = resetVector;

        this.reg_sp = 0xFD;
        this.flag_set(0x24);
    }

    // PPUSTATUS
    ppu_sprite0hit = false;
    ppu_spriteoverflow = false;
    ppu_nmi_occurred = false;

    // PPUMASK
    ppu_grayscale = false;
    ppu_mask_left_bg = false;
    ppu_mask_left_obj = false;
    ppu_render_bg = false;
    ppu_render_obj = false;
    ppu_emphasize_red = false;
    ppu_emphasize_green = false;
    ppu_emphasize_blue = false;

    // PPUCTRL
    ppu_nametable_base_id = 0;
    ppu_ppudata_access_inc = false;
    ppu_small_obj_pattern_addr = false;
    ppu_bg_pattern_table_addr = false;
    ppu_obj_size = false;
    ppu_master_slave_sel = false;
    ppu_enable_nmi = false;

    ppu_line = 0;
    ppu_line_clock = 0;

    ppu_ppuaddr_latch = false;
    ppu_ppudata_head = 0;
    ppu_vram = new Uint8Array(0x4000);

    ppu_oamaddr = 0;
    ppu_oam = new Uint8Array(0x100);

    ppu_ppuscroll_latch = false;
    ppu_ppuscroll_x = 0;
    ppu_ppuscroll_y = 0;

    ppu_nametable_a = new Uint8Array(1024);
    ppu_nametable_b = new Uint8Array(1024);

    ppu_fetcher_state = 0;
    ppu_pattern_shift = new Uint8Array(16);
    ppu_pattern_shift_pos = 0;
    ppu_palette_shift = new Uint8Array(8);
    ppu_palette_shift_pos = 0;
    ppu_pixel_x = 0;

    ppu_nametable_index = 0;
    ppu_nametable_byte = 0;
    ppu_attribute_byte = 0;
    ppu_pattern_lower_byte = 0;
    ppu_pattern_upper_byte = 0;

    ppu_img = new ImageData(new Uint8ClampedArray(256 * 240 * 4).fill(0xFF), 256, 240);

    patterns_img = new ImageData(new Uint8ClampedArray(256 * 128 * 4).fill(0xFF), 256, 128);

    iram = new Uint8Array(0x800);


}

function nes_tick(nes: NES, cycles: number) {
    nes.cycles += cycles;
    ppu_advance(nes, cycles * 3);
}