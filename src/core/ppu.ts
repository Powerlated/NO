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
    if (nes.ppu_pattern_shift_pos > 0) {
        nes.ppu_pattern_shift_pos--;

        let val = nes.ppu_pattern_shift[nes.ppu_pattern_shift_pos];

        let index = 4 * (nes.ppu_pixel_x + (256 * nes.ppu_line));

        if (val != 0) {
            nes.ppu_img.data[index + 0] = nes.ppu_bg_palette[0][val - 1][0];
            nes.ppu_img.data[index + 1] = nes.ppu_bg_palette[0][val - 1][1];
            nes.ppu_img.data[index + 2] = nes.ppu_bg_palette[0][val - 1][2];
        } else {
            nes.ppu_img.data[index + 0] = nes.ppu_universal_bg_col[0];
            nes.ppu_img.data[index + 1] = nes.ppu_universal_bg_col[1];
            nes.ppu_img.data[index + 2] = nes.ppu_universal_bg_col[2];
        }
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

                    nes.ppu_nametable_index++;
                }
                if (nes.ppu_attribute_shift_pos == 0) {
                    for (let pixel = 0; pixel < 8; pixel++) {
                        nes.ppu_attribute_shift[nes.ppu_attribute_shift_pos] = nes.ppu_attribute_val;
                        nes.ppu_attribute_shift_pos++;
                    }
                    nes.ppu_attribute_index++;
                }

                let nametable_base = [0x2000, 0x2400, 0x2800, 0x2C00][nes.ppu_nametable_base_id];
                nes.ppu_nametable_val = ppu_read_vram(nes, nametable_base + nes.ppu_nametable_index);
            }
            break;
        // Attribute table byte
        case 2:
            {
                let attrtable_base = [0x23C0, 0x27C0, 0x2BC0, 0x2FC0][nes.ppu_nametable_base_id];
                let attrtable_val = ppu_read_vram(nes, attrtable_base + nes.ppu_attribute_index);

                nes.ppu_attribute_val = attrtable_val & 3;
            }
            break;
        // Pattern table tile lower
        case 4:
            {
                let tileBase = (nes.ppu_nametable_val * 16) + 0;
                tileBase += nes.ppu_line & 7;

                let bg_pattern_table_addr = nes.ppu_bg_pattern_table_addr ? 0x1000 : 0x0000;
                nes.ppu_pattern_lower_byte = ppu_read_vram(nes, bg_pattern_table_addr + tileBase + 0);
                nes.ppu_pattern_upper_byte = ppu_read_vram(nes, bg_pattern_table_addr + tileBase + 8);

            }
            break;
        // Pattern table tile upper
        case 6:
            {


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

    nes.ppu_nametable_index = ((nes.ppu_line >> 3) * 32) + (nes.ppu_ppuscroll_x >> 3);
    nes.ppu_pattern_shift_pos = 0;

    nes.ppu_attribute_index = ((nes.ppu_line >> 5) * 8) + (nes.ppu_ppuscroll_x >> 5);
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
            }

            if (nes.ppu_line_clock == 320) ppu_fetcher_reset(nes);
            if (nes.ppu_line_clock >= 321 && nes.ppu_line_clock <= 336) {
                ppu_advance_fetcher(nes);
            }

            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock -= 341;
                nes.ppu_line = 0;
            }
        }
    }
    // Visible scanlines
    else if (nes.ppu_line >= 0 && nes.ppu_line <= 239) {
        while (cycles > 0) {
            cycles--;

            if (nes.ppu_line_clock > 0 && nes.ppu_line_clock < 257) {
                ppu_advance_fetcher(nes);
                ppu_shift_out(nes);
            }

            if (nes.ppu_line_clock == 320) {
                nes.ppu_line++;
                ppu_fetcher_reset(nes);
            }
            if (nes.ppu_line_clock >= 321 && nes.ppu_line_clock <= 336) {
                ppu_advance_fetcher(nes);
            }

            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock -= 341;

            }
        }
    }
    // Post-render scanline
    else if (nes.ppu_line == 240) {
        while (cycles > 0) {
            cycles--;
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock -= 341;
                nes.ppu_line++;
            }
        }
    }
    // Vblank
    else if (nes.ppu_line >= 241 && nes.ppu_line <= 260) {
        while (cycles > 0) {
            cycles--;
            if (nes.ppu_line == 241 && nes.ppu_line_clock == 1) {
                // console.log("Vblank hit");
                nes.ppu_nmi_occurred = true;
                ppu_check_nmi(nes);

                // Draw the image here
                ppu_draw(nes);
            }
            nes.ppu_line_clock++;
            if (nes.ppu_line_clock >= 341) {
                nes.ppu_line_clock -= 341;
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

    console.log("Drawing to Canvas");
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

const PALETTE_RGB_TABLE = [
    new Uint8Array([152, 150, 152]),
    new Uint8Array([8, 76, 196]),
    new Uint8Array([48, 50, 236]),
    new Uint8Array([92, 30, 228]),
    new Uint8Array([136, 20, 176]),
    new Uint8Array([160, 20, 100]),
    new Uint8Array([152, 34, 32]),
    new Uint8Array([120, 60, 0]),
    new Uint8Array([84, 90, 0]),
    new Uint8Array([40, 114, 0,]),
    new Uint8Array([8, 124, 0]),
    new Uint8Array([0, 118, 40,]),
    new Uint8Array([0, 102, 120]),
    new Uint8Array([0, 0, 0]),
    new Uint8Array([84, 84, 84]),
    new Uint8Array([0, 30, 116]),
    new Uint8Array([8, 16, 144]),
    new Uint8Array([48, 0, 136]),
    new Uint8Array([68, 0, 100]),
    new Uint8Array([92, 0, 48]),
    new Uint8Array([84, 4, 0]),
    new Uint8Array([60, 24, 0]),
    new Uint8Array([32, 42, 0]),
    new Uint8Array([8, 58, 0,]),
    new Uint8Array([0, 64, 0]),
    new Uint8Array([0, 60, 0,]),
    new Uint8Array([0, 50, 60]),
    new Uint8Array([0, 0, 0]),
    new Uint8Array([236, 238, 236]),
    new Uint8Array([76, 154, 236]),
    new Uint8Array([120, 124, 236]),
    new Uint8Array([176, 98, 236]),
    new Uint8Array([228, 84, 236]),
    new Uint8Array([236, 88, 180]),
    new Uint8Array([236, 106, 100]),
    new Uint8Array([212, 136, 32]),
    new Uint8Array([160, 170, 0]),
    new Uint8Array([116, 196, 0,]),
    new Uint8Array([76, 208, 32]),
    new Uint8Array([56, 204, 108,]),
    new Uint8Array([56, 180, 204]),
    new Uint8Array([60, 60, 60]),
    new Uint8Array([236, 238, 236]),
    new Uint8Array([168, 204, 236]),
    new Uint8Array([188, 188, 236]),
    new Uint8Array([212, 178, 236]),
    new Uint8Array([236, 174, 236]),
    new Uint8Array([236, 174, 212]),
    new Uint8Array([236, 180, 176]),
    new Uint8Array([228, 196, 144]),
    new Uint8Array([204, 210, 120]),
    new Uint8Array([180, 222, 120,]),
    new Uint8Array([168, 226, 144]),
    new Uint8Array([152, 226, 180,]),
    new Uint8Array([160, 214, 228]),
    new Uint8Array([160, 162, 160])
];