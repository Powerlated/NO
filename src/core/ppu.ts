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
        case 0x2003: ppu_write_oamaddr(nes, val); return;
        case 0x2004: ppu_write_oamdata(nes, val); return;
        case 0x2005: ppu_write_ppuscroll(nes, val); return;
        case 0x2006: ppu_write_ppuaddr(nes, val); return;
        case 0x2007: ppu_write_ppudata(nes, val); return;
    }
    throw `ppu_reg_write not implemented addr:${hex(addr, 4)} val:${hex(val, 2)}`;
}

function ppu_write_oamdata(nes: NES, val: number) {
    nes.ppu_oam[nes.ppu_oamaddr] = val;
    nes.ppu_oamaddr = (nes.ppu_oamaddr) & 0xFF;
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

    ppu_check_nmi(nes);
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
    const val = ppu_read_vram(nes, nes.ppu_ppudata_head & 0x3FFF);
    if (nes.ppu_ppudata_access_inc) {
        nes.ppu_ppudata_head += 32;
        nes.ppu_ppudata_head &= 0x3FFF;
    } else {
        nes.ppu_ppudata_head++;
        nes.ppu_ppudata_head &= 0x3FFF;
    }
    return val;
}

function ppu_write_ppudata(nes: NES, val: number) {
    ppu_write_vram(nes, nes.ppu_ppudata_head & 0x3FFF, val);
    if (nes.ppu_ppudata_access_inc) {
        nes.ppu_ppudata_head += 32;
        nes.ppu_ppudata_head &= 0x3FFF;
    } else {
        nes.ppu_ppudata_head++;
        nes.ppu_ppudata_head &= 0x3FFF;
    }
}

function ppu_read_vram(nes: NES, addr: number): number {
    // console.log(`ppu_read_vram addr:${hex(addr, 4)}`);
    if (addr >= 0x0000 && addr <= 0x1FFF) {
        switch (nes.cart.mapper) {
            case 0:
                return nes.cart.chr_rom_data[addr];
            default:
                throw `ppu_read_vram: Mapper ${nes.cart.mapper} not implemented`;
        }
    }

    else if (addr >= 0x2000 && addr <= 0x2FFF) {
        if (nes.cart.vertical_mirroring) {
            if (addr >= 0x2000 && addr <= 0x23FF) {
                return nes.ppu_nametable_a[addr & 0x3FF];
            } else if (addr >= 0x2400 && addr <= 0x27FF) {
                return nes.ppu_nametable_b[addr & 0x3FF];
            } else if (addr >= 0x2800 && addr <= 0x2BFF) {
                return nes.ppu_nametable_a[addr & 0x3FF];
            } else if (addr >= 0x2C00 && addr <= 0x2FFF) {
                return nes.ppu_nametable_b[addr & 0x3FF];
            }
        } else {
            if (addr >= 0x2000 && addr <= 0x23FF) {
                return nes.ppu_nametable_a[addr & 0x3FF];
            } else if (addr >= 0x2400 && addr <= 0x27FF) {
                return nes.ppu_nametable_a[addr & 0x3FF];
            } else if (addr >= 0x2800 && addr <= 0x2BFF) {
                return nes.ppu_nametable_b[addr & 0x3FF];
            } else if (addr >= 0x2C00 && addr <= 0x2FFF) {
                return nes.ppu_nametable_b[addr & 0x3FF];
            }
        }
    }

    return 0;
}

function ppu_write_vram(nes: NES, addr: number, val: number) {
    // console.log(`ppu_write_vram addr:${hex(addr, 4)} val:${hex(val, 2)}`);

    if (addr >= 0x0000 && addr <= 0x1FFF) {

    }

    else if (addr >= 0x2000 && addr <= 0x2FFF) {
        if (nes.cart.vertical_mirroring) {
            if (addr >= 0x2000 && addr <= 0x23FF) {
                nes.ppu_nametable_a[addr & 0x3FF] = val;
            } else if (addr >= 0x2400 && addr <= 0x27FF) {
                nes.ppu_nametable_b[addr & 0x3FF] = val;
            } else if (addr >= 0x2800 && addr <= 0x2BFF) {
                nes.ppu_nametable_a[addr & 0x3FF] = val;
            } else if (addr >= 0x2C00 && addr <= 0x2FFF) {
                nes.ppu_nametable_b[addr & 0x3FF] = val;
            }
        } else {
            if (addr >= 0x2000 && addr <= 0x23FF) {
                nes.ppu_nametable_a[addr & 0x3FF] = val;
            } else if (addr >= 0x2400 && addr <= 0x27FF) {
                nes.ppu_nametable_a[addr & 0x3FF] = val;
            } else if (addr >= 0x2800 && addr <= 0x2BFF) {
                nes.ppu_nametable_b[addr & 0x3FF] = val;
            } else if (addr >= 0x2C00 && addr <= 0x2FFF) {
                nes.ppu_nametable_b[addr & 0x3FF] = val;
            }
        }
    }

    else if (addr >= 0x3F00 && addr <= 0x3F1F) {
        switch (addr) {
            case 0x3F10: case 0x3F00: ppu_set_universal_bg_palette(nes, val); break;

            case 0x3F01: ppu_set_bg_palette(nes, 0, 0, val); break;
            case 0x3F02: ppu_set_bg_palette(nes, 0, 1, val); break;
            case 0x3F03: ppu_set_bg_palette(nes, 0, 2, val); break;

            case 0x3F05: ppu_set_bg_palette(nes, 1, 0, val); break;
            case 0x3F06: ppu_set_bg_palette(nes, 1, 1, val); break;
            case 0x3F07: ppu_set_bg_palette(nes, 1, 2, val); break;

            case 0x3F09: ppu_set_bg_palette(nes, 2, 0, val); break;
            case 0x3F0A: ppu_set_bg_palette(nes, 2, 1, val); break;
            case 0x3F0B: ppu_set_bg_palette(nes, 2, 2, val); break;

            case 0x3F0D: ppu_set_bg_palette(nes, 3, 0, val); break;
            case 0x3F0E: ppu_set_bg_palette(nes, 3, 1, val); break;
            case 0x3F0F: ppu_set_bg_palette(nes, 3, 2, val); break;

        }
    }
}

// Four palettes, and 3 colors for each palette, 12 colors total
function ppu_set_bg_palette(nes: NES, pal: number, col: number, byte: number) {
    if (byte < PALETTE_RGB_TABLE.length)
        nes.ppu_bg_palette[pal][col].set(PALETTE_RGB_TABLE[byte]);
}

function ppu_set_universal_bg_palette(nes: NES, byte: number) {
    if (byte < PALETTE_RGB_TABLE.length)
        nes.ppu_universal_bg_col.set(PALETTE_RGB_TABLE[byte]);
}

function ppu_write_ppuscroll(nes: NES, val: number) {
    if (!nes.ppu_ppuscroll_latch) {
        nes.ppu_ppuscroll_x = val;
    } else {
        nes.ppu_ppuscroll_y = val;
    }
    nes.ppu_ppuscroll_latch = true;
}

function ppu_write_oamaddr(nes: NES, val: number) {
    nes.ppu_oamaddr = val;
}

function ppu_shift_out(nes: NES) {
    if (nes.ppu_pattern_shift_pos > 0 && nes.ppu_attribute_shift_pos > 0) {
        nes.ppu_pattern_shift_pos--;
        nes.ppu_attribute_shift_pos--;

        let pattern_val = nes.ppu_pattern_shift[nes.ppu_pattern_shift_pos];
        let attribute_val = nes.ppu_attribute_shift[nes.ppu_attribute_shift_pos];


        let index = 4 * (nes.ppu_pixel_x + (256 * nes.ppu_line));

        if (nes.ppu_pixel_x < 256) {
            if (pattern_val != 0) {
                nes.ppu_img.data[index + 0] = nes.ppu_bg_palette[attribute_val][pattern_val - 1][0];
                nes.ppu_img.data[index + 1] = nes.ppu_bg_palette[attribute_val][pattern_val - 1][1];
                nes.ppu_img.data[index + 2] = nes.ppu_bg_palette[attribute_val][pattern_val - 1][2];
            } else {
                nes.ppu_img.data[index + 0] = nes.ppu_universal_bg_col[0];
                nes.ppu_img.data[index + 1] = nes.ppu_universal_bg_col[1];
                nes.ppu_img.data[index + 2] = nes.ppu_universal_bg_col[2];
            }
        }

        // nes.ppu_img.data[index + 0] = table_2bpp_to_8bpp[pattern_val];
        // nes.ppu_img.data[index + 1] = table_2bpp_to_8bpp[pattern_val];
        // nes.ppu_img.data[index + 2] = table_2bpp_to_8bpp[pattern_val];

        nes.ppu_pixel_x++;
    }
}

function ppu_advance_fetcher(nes: NES) {
    switch (nes.ppu_fetcher_state) {
        // Nametable byte
        case 0:
            {
                if (nes.ppu_pattern_shift_pos < 8) {
                    for (let pixel = 0; pixel < 8; pixel++) {
                        let pixelLower = bit_test(nes.ppu_pattern_lower_byte, pixel);
                        let pixelUpper = bit_test(nes.ppu_pattern_upper_byte, pixel);

                        nes.ppu_pattern_shift[nes.ppu_pattern_shift_pos] = (pixelUpper ? 2 : 0) + (pixelLower ? 1 : 0);
                        nes.ppu_pattern_shift_pos++;
                    }

                }
                if (nes.ppu_attribute_shift_pos == 0) {

                    for (let pixel = 0; pixel < 8; pixel++) {
                        nes.ppu_attribute_shift[nes.ppu_attribute_shift_pos] = nes.ppu_attribute_val;
                        nes.ppu_attribute_shift_pos++;
                    }
                }

                let nametable_base = [0x2000, 0x2400, 0x2800, 0x2C00][nes.ppu_nametable_base_id];
                nes.ppu_nametable_val = ppu_read_vram(nes, nametable_base + nes.ppu_nametable_index_start + nes.ppu_nametable_index_offset);


                nes.ppu_nametable_index_offset++;
                if (nes.ppu_nametable_index_offset > 31) {
                    nes.ppu_nametable_index_offset = 0;
                    nes.ppu_nametable_index_start += 0x400;
                }
            }
            break;
        // Attribute table byte
        case 2:
            {
                let attrtable_base = [0x23C0, 0x27C0, 0x2BC0, 0x2FC0][nes.ppu_nametable_base_id];
                let attrtable_byte = ppu_read_vram(nes, attrtable_base + nes.ppu_attribute_index_start + (nes.ppu_attribute_index_offset >> 3));


                nes.ppu_attribute_index_offset++;
                if (nes.ppu_attribute_index_offset > 31) {
                    nes.ppu_attribute_index_offset = 0;
                    nes.ppu_attribute_index_start += 0x400;
                }

                // if ((nes.ppu_line & 0b1111) >= 8) attrtable_byte >>= 4;
                // if ((nes.ppu_pixel_x & 0b1111) >= 8) attrtable_byte >>= 2;

                nes.ppu_attribute_val = attrtable_byte & 3;
            }
            break;
        // Pattern table tile lower
        case 4:
            {
                let tileBase = (nes.ppu_nametable_val * 16) + 0;
                tileBase += nes.ppu_line & 7;

                let bg_pattern_table_addr = nes.ppu_bg_pattern_table_addr ? 0x1000 : 0x0000;
                nes.ppu_pattern_lower_byte = ppu_read_vram(nes, bg_pattern_table_addr + tileBase);

            }
            break;
        // Pattern table tile upper
        case 6:
            {
                let tileBase = (nes.ppu_nametable_val * 16) + 8;
                tileBase += nes.ppu_line & 7;

                let bg_pattern_table_addr = nes.ppu_bg_pattern_table_addr ? 0x1000 : 0x0000;
                nes.ppu_pattern_upper_byte = ppu_read_vram(nes, bg_pattern_table_addr + tileBase);
            }
            break;

        // Sleep
        case 1: break;
        case 3: break;
        case 5: break;
        case 7: break;
    }

    nes.ppu_fetcher_state++;
    nes.ppu_fetcher_state &= 7;

}

function ppu_fetcher_reset(nes: NES) {
    nes.ppu_fetcher_state = 0;

    nes.ppu_nametable_index_start = ((nes.ppu_line >> 3) * 32);
    nes.ppu_nametable_index_offset = (nes.ppu_ppuscroll_x >> 3);

    nes.ppu_attribute_index_start = ((nes.ppu_line >> 5) * 8);
    nes.ppu_attribute_index_offset = (nes.ppu_pixel_x + nes.ppu_ppuscroll_x >> 5);

    nes.ppu_pattern_shift_pos = 0;
    nes.ppu_attribute_shift_pos = 0;

    nes.ppu_pixel_x = 0;
}

function ppu_advance(nes: NES, cycles: number) {
    // Pre-render scanline
    if (nes.ppu_line == 261) {
        while (cycles > 0) {
            cycles--;

            if (nes.ppu_line_clock == 1) {
                if (debug)
                    console.log("NMI flag clear");

                nes.ppu_nmi_occurred = false;
                ppu_check_nmi(nes);
                nes.ppu_sprite0hit = false;
            }

            else if (nes.ppu_line_clock == 320) ppu_fetcher_reset(nes);
            else if (nes.ppu_line_clock >= 321 && nes.ppu_line_clock <= 336) {
                ppu_advance_fetcher(nes);
            }

            else if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock = 0;
                nes.ppu_line = 0;
            }
            nes.ppu_line_clock++;

        }
    }
    // Visible scanlines
    else if (nes.ppu_line >= 0 && nes.ppu_line <= 239) {
        while (cycles > 0) {
            cycles--;

            nes.ppu_line_clock++;

            // TODO: Remove mock sprite 0
            if (nes.ppu_line == 32 && nes.ppu_line_clock == 1) nes.ppu_sprite0hit = true;

            if (nes.ppu_line_clock > 0 && nes.ppu_line_clock < 257) {
                ppu_advance_fetcher(nes);
                ppu_shift_out(nes);
            }

            else if (nes.ppu_line_clock == 320) {
                nes.ppu_line++;
                ppu_fetcher_reset(nes);
            }
            else if (nes.ppu_line_clock >= 321 && nes.ppu_line_clock <= 336) {
                ppu_advance_fetcher(nes);
            }

            else if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock = 0;

            }
        }
    }
    // Post-render scanline
    else if (nes.ppu_line == 240) {
        while (cycles > 0) {
            cycles--;
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock = 0;
                nes.ppu_line++;
            }
        }
    }
    // Vblank
    else if (nes.ppu_line >= 241 && nes.ppu_line <= 260) {
        while (cycles > 0) {
            cycles--;
            nes.ppu_line_clock++;
            if (nes.ppu_line == 241 && nes.ppu_line_clock == 1) {
                // console.log("Vblank hit");
                nes.ppu_nmi_occurred = true;
                ppu_check_nmi(nes);

                // Draw the image here
                ppu_draw(nes);
            }
            else if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock = 0;
                nes.ppu_line++;
            }
        }
    }
}

const table_2bpp_to_8bpp = Uint8Array.of(
    0 * (255 / 3),
    1 * (255 / 3),
    2 * (255 / 3),
    3 * (255 / 3),
);

function ppu_draw(nes: NES) {
    let pixels = new Uint8Array(8);

    // for (let tile = 0; tile < 256; tile++) {
    //     let tileBase = tile * 16;
    //     for (let row = 0; row < 8; row++) {

    //         let lower = ppu_read_vram(nes, tileBase + 0 + row);
    //         let upper = ppu_read_vram(nes, tileBase + 8 + row);

    //         let index = nes.patterns_img.width * 4 * (row + (tile * 8));

    //         for (let pixel = 0; pixel < 8; pixel++) {
    //             let pixelLower = bit_test(lower, pixel);
    //             let pixelUpper = bit_test(upper, pixel);

    //             pixels[pixel] = (pixelUpper ? 2 : 0) + (pixelLower ? 1 : 0);

    //             nes.patterns_img.data[index + 0] = table_2bpp_to_8bpp[pixels[pixel]];
    //             nes.patterns_img.data[index + 1] = table_2bpp_to_8bpp[pixels[pixel]];
    //             nes.patterns_img.data[index + 2] = table_2bpp_to_8bpp[pixels[pixel]];
    //             index += 4;
    //         }
    //     }
    // }

    // console.log("Drawing to Canvas");
    let nes_canvas = (document.getElementById('nes-canvas')! as HTMLCanvasElement);
    nes_canvas.getContext('2d')!.putImageData(nes.ppu_img, 0, 0);

    let pattern_canvas = (document.getElementById('pattern-canvas')! as HTMLCanvasElement);
    pattern_canvas.getContext('2d')!.putImageData(nes.patterns_img, 0, 0);
}

function ppu_check_nmi(nes: NES) {
    const prev = nes.nmi_line;
    const now = !(nes.ppu_enable_nmi && nes.ppu_nmi_occurred);
    if (prev == true && now == false) {
        nes.nmi_queued = true;
    }
    nes.nmi_line = now;
}

const PALETTE_RGB_TABLE: Uint8Array[] = [
    Uint8Array.of(0x66, 0x66, 0x66),
    Uint8Array.of(0x00, 0x2A, 0x88),
    Uint8Array.of(0x14, 0x12, 0xA7),
    Uint8Array.of(0x3B, 0x00, 0xA4),
    Uint8Array.of(0x5C, 0x00, 0x7E),
    Uint8Array.of(0x6E, 0x00, 0x40),
    Uint8Array.of(0x6C, 0x06, 0x00),
    Uint8Array.of(0x56, 0x1D, 0x00),
    Uint8Array.of(0x33, 0x35, 0x00),
    Uint8Array.of(0x0B, 0x48, 0x00),
    Uint8Array.of(0x00, 0x52, 0x00),
    Uint8Array.of(0x00, 0x4F, 0x08),
    Uint8Array.of(0x00, 0x40, 0x4D),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0xAD, 0xAD, 0xAD),
    Uint8Array.of(0x15, 0x5F, 0xD9),
    Uint8Array.of(0x42, 0x40, 0xFF),
    Uint8Array.of(0x75, 0x27, 0xFE),
    Uint8Array.of(0xA0, 0x1A, 0xCC),
    Uint8Array.of(0xB7, 0x1E, 0x7B),
    Uint8Array.of(0xB5, 0x31, 0x20),
    Uint8Array.of(0x99, 0x4E, 0x00),
    Uint8Array.of(0x6B, 0x6D, 0x00),
    Uint8Array.of(0x38, 0x87, 0x00),
    Uint8Array.of(0x0C, 0x93, 0x00),
    Uint8Array.of(0x00, 0x8F, 0x32),
    Uint8Array.of(0x00, 0x7C, 0x8D),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0xFF, 0xFE, 0xFF),
    Uint8Array.of(0x64, 0xB0, 0xFF),
    Uint8Array.of(0x92, 0x90, 0xFF),
    Uint8Array.of(0xC6, 0x76, 0xFF),
    Uint8Array.of(0xF3, 0x6A, 0xFF),
    Uint8Array.of(0xFE, 0x6E, 0xCC),
    Uint8Array.of(0xFE, 0x81, 0x70),
    Uint8Array.of(0xEA, 0x9E, 0x22),
    Uint8Array.of(0xBC, 0xBE, 0x00),
    Uint8Array.of(0x88, 0xD8, 0x00),
    Uint8Array.of(0x5C, 0xE4, 0x30),
    Uint8Array.of(0x45, 0xE0, 0x82),
    Uint8Array.of(0x48, 0xCD, 0xDE),
    Uint8Array.of(0x4F, 0x4F, 0x4F),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0xFF, 0xFE, 0xFF),
    Uint8Array.of(0xC0, 0xDF, 0xFF),
    Uint8Array.of(0xD3, 0xD2, 0xFF),
    Uint8Array.of(0xE8, 0xC8, 0xFF),
    Uint8Array.of(0xFB, 0xC2, 0xFF),
    Uint8Array.of(0xFE, 0xC4, 0xEA),
    Uint8Array.of(0xFE, 0xCC, 0xC5),
    Uint8Array.of(0xF7, 0xD8, 0xA5),
    Uint8Array.of(0xE4, 0xE5, 0x94),
    Uint8Array.of(0xCF, 0xEF, 0x96),
    Uint8Array.of(0xBD, 0xF4, 0xAB),
    Uint8Array.of(0xB3, 0xF3, 0xCC),
    Uint8Array.of(0xB5, 0xEB, 0xF2),
    Uint8Array.of(0xB8, 0xB8, 0xB8),
    Uint8Array.of(0x00, 0x00, 0x00),
    Uint8Array.of(0x00, 0x00, 0x00)
];