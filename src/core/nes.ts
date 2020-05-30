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
        // console.log("Flag for push");
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

    ppu_oamaddr = 0;
    ppu_oam = new Uint8Array(0x100);

    ppu_ppuscroll_latch = false;
    ppu_ppuscroll_x = 0;
    ppu_ppuscroll_y = 0;

    ppu_nametable_a = new Uint8Array(1024).fill(0xFF);
    ppu_nametable_b = new Uint8Array(1024).fill(0xFF);

    ppu_fetcher_state = 0;
    ppu_pattern_shift = new Uint8Array(16);
    ppu_pattern_shift_pos = 0;
    ppu_attribute_shift = new Uint8Array(8);
    ppu_attribute_shift_pos = 0;
    ppu_pixel_x = 0;

    ppu_nametable_index = 0;
    ppu_nametable_val = 0;
    ppu_attribute_val = 0;
    ppu_attribute_index = 0;
    ppu_pattern_lower_byte = 0;
    ppu_pattern_upper_byte = 0;

    ppu_universal_bg_col = new Uint8Array(3);

    ppu_bg_palette = [
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
    ];

    ppu_obj_palette = [
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
        [new Uint8Array(3), new Uint8Array(3), new Uint8Array(3),],
    ];
    ppu_img = new ImageData(new Uint8ClampedArray(256 * 240 * 4).fill(0xFF), 256, 240);

    apu_buffer = new Float32Array(2048);
    apu_buffer_pos = 0;
    apu_sample_timer = 0;

    apu_cycle = false;

    apu_pulse1_volume = 0;
    apu_pulse1_constant = false;
    apu_pulse1_halt_length = false;
    apu_pulse1_duty = 0;
    apu_pulse1_sweep_shift = 0;
    apu_pulse1_sweep_negate = false;
    apu_pulse1_sweep_divider_period = 0;
    apu_pulse1_sweep_enabled = false;
    apu_pulse1_timer_low = 0;
    apu_pulse1_timer_high = 0;
    apu_pulse1_length_load = 0;

    apu_pulse1_timer = 0;
    apu_pulse1_pos = 0;

    apu_pulse2_volume = 0;
    apu_pulse2_constant = false;
    apu_pulse2_halt_length = false;
    apu_pulse2_duty = 0;
    apu_pulse2_sweep_shift = 0;
    apu_pulse2_sweep_negate = false;
    apu_pulse2_sweep_divider_period = 0;
    apu_pulse2_sweep_enabled = false;
    apu_pulse2_timer_low = 0;
    apu_pulse2_timer_high = 0;
    apu_pulse2_length_load = 0;

    apu_pulse2_timer = 0;
    apu_pulse2_pos = 0;

    apu_triangle_counter_reload = 0;
    apu_triangle_control = false;
    apu_triangle_timer_low = 0;
    apu_triangle_timer_high = 0;
    apu_triangle_length_load = 0;

    apu_triangle_timer = 0;
    apu_triangle_pos = 0;

    apu_pulse1_enable = false;
    apu_pulse2_enable = false;
    apu_triangle_enable = false;
    apu_noise_enable = false;
    apu_dmc_enable = false;

    controller_shift = new Uint8Array(8);
    controller_shift_pos = 0;

    controller_poll_mode = false;

    controller_a = false;
    controller_b = false;
    controller_select = false;
    controller_start = false;
    controller_up = false;
    controller_down = false;
    controller_left = false;
    controller_right = false;


    patterns_img = new ImageData(new Uint8ClampedArray(256 * 128 * 4).fill(0xFF), 256, 128);

    iram = new Uint8Array(0x800);



}

function nes_tick(nes: NES, cycles: number) {
    nes.cycles += cycles;
    ppu_advance(nes, cycles * 3);
    apu_advance(nes, cycles);
}