function ppu_reg_read(nes: NES, addr: number): number {
    switch (addr) {
        case 0x2000: return 0xFF;
        case 0x2001: return 0xFF;
        case 0x2002: return ppu_read_ppustatus(nes);
        case 0x2005: return 0xFF;
        case 0x2006: return 0xFF;
        case 0x2007: return ppu_read_ppudata(nes);
    }
    throw `ppu_reg_read not implemented addr:${hex(addr, 2)}`;
}

function ppu_reg_write(nes: NES, addr: number, val: number): void {
    switch (addr) {
        case 0x2000: ppu_write_ppuctrl(nes, val); return;
        case 0x2001: ppu_write_ppumask(nes, val); return;
        case 0x2005: ppu_write_ppuscroll(nes, val); return;
        case 0x2006: ppu_write_ppuaddr(nes, val); return;
        case 0x2007: ppu_write_ppudata(nes, val); return;
    }
    throw `ppu_reg_write not implemented addr:${hex(addr, 4)} val:${hex(val, 2)}`;
}

function ppu_write_ppuctrl(nes: NES, val: number) {
    nes.ppu_nametable_base_id = val & 0b11;
    nes.ppu_ppudata_access_inc = bit_test(val, 2);
    nes.ppu_small_obj_pattern_addr = bit_test(val, 3);
    nes.ppu_bg_pattern_table_addr = bit_test(val, 4);
    nes.ppu_obj_size = bit_test(val, 5);
    nes.ppu_master_slave_sel = bit_test(val, 6);
    nes.ppu_enable_nmi = bit_test(val, 7);
}

function ppu_write_ppumask(nes: NES, val: number) {
    nes.ppu_grayscale = bit_test(val, 0);
    nes.ppu_mask_left_bg = bit_test(val, 1);
    nes.ppu_mask_left_obj = bit_test(val, 2);
    nes.ppu_render_bg = bit_test(val, 3);
    nes.ppu_render_obj = bit_test(val, 4);
    nes.ppu_emphasize_red = bit_test(val, 5);
    nes.ppu_emphasize_green = bit_test(val, 6);
    nes.ppu_emphasize_blue = bit_test(val, 7);
}

function ppu_read_ppustatus(nes: NES): number {
    let i = 0;
    if (nes.ppu_nmi_occurred) i |= BIT_7;
    if (nes.ppu_sprite0hit) i |= BIT_6;
    if (nes.ppu_spriteoverflow) i |= BIT_5;

    nes.ppu_nmi_occurred = false;
    nes.ppu_ppuaddr_latch = false;
    nes.ppu_ppuscroll_latch = false;
    return i;
}

function ppu_write_ppuaddr(nes: NES, val: number) {
    if (!nes.ppu_ppuaddr_latch) {
        nes.ppu_ppudata_head &= 0x00FF;
        nes.ppu_ppudata_head |= val << 8;
    } else {
        nes.ppu_ppudata_head &= 0xFF00;
        nes.ppu_ppudata_head |= val;
    }
    nes.ppu_ppuaddr_latch = true;
}

function ppu_read_ppudata(nes: NES): number {
    const val = nes.ppu_vram[nes.ppu_ppudata_head & 0x3FFF];
    if (nes.ppu_ppudata_access_inc) {
        nes.ppu_ppudata_head++;
        nes.ppu_ppudata_head &= 0x3FFF;
    }
    return val;
}

function ppu_write_ppudata(nes: NES, val: number) {
    nes.ppu_vram[nes.ppu_ppudata_head & 0x3FFF] = val;
    if (nes.ppu_ppudata_access_inc) {
        nes.ppu_ppudata_head++;
        nes.ppu_ppudata_head &= 0x3FFF;
    }
}

function ppu_write_ppuscroll(nes: NES, val: number) {
    if (!nes.ppu_ppuscroll_latch) {
        nes.ppu_ppuscroll_x = val;
    } else {
        nes.ppu_ppuscroll_y = val;
    }
    nes.ppu_ppuscroll_latch = true;
}

function ppu_advance(nes: NES, cycles: number) {
    // Visible scanlines
    if (nes.ppu_line >= 0 && nes.ppu_line <= 239) {
        while (cycles > 0) {
            cycles--;
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 342) {
                nes.ppu_line_clock -= 342;
                nes.ppu_line++;
            }
        }
    }
    // Post-render scanline
    else if (nes.ppu_line == 240) {
        while (cycles > 0) {
            cycles--;
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 342) {
                nes.ppu_line_clock -= 342;
                nes.ppu_line++;
            }
        }
    }
    else if (nes.ppu_line >= 241 && nes.ppu_line <= 260) {
        while (cycles > 0) {
            cycles--;
            if (nes.ppu_line == 241 && nes.ppu_line_clock == 1) {
                nes.ppu_nmi_occurred = true;
                ppu_check_nmi(nes);
            }
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 342) {
                nes.ppu_line_clock -= 342;
                nes.ppu_line++;
            }
        }
    }
    else if (nes.ppu_line == 261) {
        while (cycles > 0) {
            cycles--;
            if (nes.ppu_line == 241 && nes.ppu_line_clock == 1) {
                nes.ppu_nmi_occurred = false;
            }
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 342) {
                nes.ppu_line_clock -= 342;
                nes.ppu_line = 0;
            }
        }
    }
}

function ppu_check_nmi(nes: NES) {
    const prev = nes.nmi_line;
    const now = !(nes.ppu_enable_nmi && nes.ppu_nmi_occurred);
    if (prev == true && now == false) {
        nes.nmi_queued = true;
    }
    nes.nmi_line = now;
}