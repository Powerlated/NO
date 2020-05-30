const APU_DUTY_CYCLES = [
    Uint8Array.of(0, 1, 0, 0, 0, 0, 0, 0),
    Uint8Array.of(0, 1, 1, 0, 0, 0, 0, 0),
    Uint8Array.of(0, 1, 1, 1, 1, 0, 0, 0),
    Uint8Array.of(1, 0, 0, 1, 1, 1, 1, 1),
];

const TRIANGLE_SEQ = Uint8Array.of(
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
);

const player = new SoundPlayer();

function apu_half_frame(nes: NES) {

}

function apu_quarter_frame(nes: NES) {
    if (nes.apu_pulse1_env_start) {
        nes.apu_pulse1_env_start = false;

        nes.apu_pulse1_env_div = nes.apu_pulse1_volume_init;
        nes.apu_pulse1_volume = 15;
    } else {
        if (nes.apu_pulse1_env_div == 0) {
            nes.apu_pulse1_env_div = nes.apu_pulse1_volume_init;

            if (nes.apu_pulse1_volume != 0) {
                nes.apu_pulse1_volume--;
            } else if (nes.apu_pulse1_env_loop) {
                nes.apu_pulse1_volume = 15;
            }
        }

        nes.apu_pulse1_env_div--;
    }

    if (nes.apu_pulse2_env_start) {
        nes.apu_pulse2_env_start = false;

        nes.apu_pulse2_env_div = nes.apu_pulse2_volume_init;
        nes.apu_pulse2_volume = 15;
    } else {
        if (nes.apu_pulse2_env_div == 0) {
            nes.apu_pulse2_env_div = nes.apu_pulse2_volume_init;

            if (nes.apu_pulse2_volume != 0) {
                nes.apu_pulse2_volume--;
            } else if (nes.apu_pulse2_env_loop) {
                nes.apu_pulse2_volume = 15;
            }
        }

        nes.apu_pulse2_env_div--;
    }
}

// Counting in CPU cycles
function apu_advance(nes: NES, cycles: number) {
    if (nes.apu_pulse1_enable) {
        nes.apu_pulse1_timer -= cycles;

        if (nes.apu_pulse1_timer <= 0) {
            // When the timer hits zero, advance the position and reload the timer
            nes.apu_pulse1_timer += 2 * ((nes.apu_pulse1_timer_high << 8) | nes.apu_pulse1_timer_low);

            nes.apu_pulse1_pos--;
            nes.apu_pulse1_pos &= 7;
        }
    }
    if (nes.apu_pulse2_enable) {
        nes.apu_pulse2_timer -= cycles;

        if (nes.apu_pulse2_timer <= 0) {
            // When the timer hits zero, advance the position and reload the timer
            nes.apu_pulse2_timer += 2 * ((nes.apu_pulse2_timer_high << 8) | nes.apu_pulse2_timer_low);

            nes.apu_pulse2_pos--;
            nes.apu_pulse2_pos &= 7;
        }
    }
    if (nes.apu_triangle_enable) {
        nes.apu_triangle_timer -= cycles;

        if (nes.apu_triangle_timer <= 0) {
            // When the timer hits zero, advance the position and reload the timer
            nes.apu_triangle_timer += ((nes.apu_triangle_timer_high << 8) | nes.apu_triangle_timer_low);

            nes.apu_triangle_pos--;
            nes.apu_triangle_pos &= 31;
        }
    }

    nes.apu_sequencer_clock += cycles * 0.5;
    if (nes.apu_sequencer_5step) {
        switch (nes.apu_sequencer_step) {
            case 0:
                if (nes.apu_sequencer_clock >= 3728.5) {
                    nes.apu_sequencer_step++;
                    apu_quarter_frame(nes);
                }
                break;
            case 1:
                if (nes.apu_sequencer_clock >= 7456.5) {
                    nes.apu_sequencer_step++;
                    apu_quarter_frame(nes);
                    apu_half_frame(nes);
                }
                break;
            case 2:
                if (nes.apu_sequencer_clock >= 11185.5) {
                    nes.apu_sequencer_step++;
                    apu_quarter_frame(nes);
                }
                break;
            case 3:
                if (nes.apu_sequencer_clock >= 14914.5) {
                    nes.apu_sequencer_step = 0;
                    nes.apu_sequencer_clock = 0;
                    apu_quarter_frame(nes);
                    apu_half_frame(nes);
                }
                break;
        }
    } else {
        switch (nes.apu_sequencer_step) {
            case 0:
                if (nes.apu_sequencer_clock >= 3728.5) {
                    nes.apu_sequencer_step++;
                    apu_quarter_frame(nes);
                }
                break;
            case 1:
                if (nes.apu_sequencer_clock >= 7456.5) {
                    nes.apu_sequencer_step++;
                    apu_quarter_frame(nes);
                    apu_half_frame(nes);
                }
                break;
            case 2:
                if (nes.apu_sequencer_clock >= 11185.5) {
                    nes.apu_sequencer_step++;
                    apu_quarter_frame(nes);
                }
                break;
            case 3:
                if (nes.apu_sequencer_clock >= 14914.5) {
                    nes.apu_sequencer_step++;
                }
                break;
            case 4:
                if (nes.apu_sequencer_clock >= 18640.5) {
                    nes.apu_sequencer_step = 0;
                    nes.apu_sequencer_clock = 0;
                    apu_quarter_frame(nes);
                    apu_half_frame(nes);
                }

        }
    }

    // CPU clock rate divided by nominal sample rate
    nes.apu_sample_timer += cycles;
    if (nes.apu_sample_timer >= 1789773 / SAMPLE_RATE) {
        nes.apu_sample_timer -= 1789773 / SAMPLE_RATE;

        let sample = 0;

        if (nes.apu_pulse1_enable) {
            if (nes.apu_pulse1_constant) {
                sample += APU_DUTY_CYCLES[nes.apu_pulse1_duty][nes.apu_pulse1_pos] * (nes.apu_pulse1_volume_init / 15);
            } else {
                sample += APU_DUTY_CYCLES[nes.apu_pulse1_duty][nes.apu_pulse1_pos] * (nes.apu_pulse1_volume / 15);
            }
        }
        if (nes.apu_pulse2_enable) {
            if (nes.apu_pulse2_constant) {
                sample += APU_DUTY_CYCLES[nes.apu_pulse2_duty][nes.apu_pulse2_pos] * (nes.apu_pulse2_volume_init / 15);
            } else {
                sample += APU_DUTY_CYCLES[nes.apu_pulse2_duty][nes.apu_pulse2_pos] * (nes.apu_pulse2_volume / 15);
            }
        }
        if (nes.apu_triangle_enable) {
            sample += TRIANGLE_SEQ[nes.apu_triangle_pos] / 15;
        }

        nes.apu_buffer[nes.apu_buffer_pos] = sample / 5;
        nes.apu_buffer_pos++;

        if (nes.apu_buffer_pos >= nes.apu_buffer.length) {
            nes.apu_buffer_pos = 0;

            // console.log("Buffer full, queueing");
            player.queueAudio(nes.apu_buffer, nes.apu_buffer, SAMPLE_RATE);
        }
    }
}

function apu_io_write(nes: NES, addr: number, val: number) {
    switch (addr) {
        case 0x4000:
            nes.apu_pulse1_volume_init = val & 0b1111;
            nes.apu_pulse1_constant = bit_test(val, 4);
            nes.apu_pulse1_env_loop = bit_test(val, 5);
            nes.apu_pulse1_duty = (val >> 6) & 0b11;
            break;
        case 0x4001:
            nes.apu_pulse1_sweep_shift = val & 0b111;
            nes.apu_pulse1_sweep_negate = bit_test(val, 3);
            nes.apu_pulse1_sweep_divider_period = (val >> 4) & 0b111;
            nes.apu_pulse1_sweep_enabled = bit_test(val, 7);
            break;
        case 0x4002:
            nes.apu_pulse1_timer_low = val;
            break;
        case 0x4003:
            nes.apu_pulse1_timer_high = val & 0b111;
            nes.apu_pulse1_length_load = (val >> 3) & 0b11111;

            nes.apu_pulse1_env_start = true;
            nes.apu_pulse1_pos = 0;
            break;

        case 0x4004:
            nes.apu_pulse2_volume_init = val & 0b1111;
            nes.apu_pulse2_constant = bit_test(val, 4);
            nes.apu_pulse2_env_loop = bit_test(val, 5);
            nes.apu_pulse2_duty = (val >> 6) & 0b11;
            break;
        case 0x4005:
            nes.apu_pulse2_sweep_shift = val & 0b111;
            nes.apu_pulse2_sweep_negate = bit_test(val, 3);
            nes.apu_pulse2_sweep_divider_period = (val >> 4) & 0b111;
            nes.apu_pulse2_sweep_enabled = bit_test(val, 7);
            break;
        case 0x4006:
            nes.apu_pulse2_timer_low = val;
            break;
        case 0x4007:
            nes.apu_pulse2_timer_high = val & 0b111;
            nes.apu_pulse2_length_load = (val >> 3) & 0b11111;

            nes.apu_pulse2_env_start = true;
            nes.apu_pulse2_pos = 0;
            break;

        case 0x4008:
            nes.apu_triangle_counter_reload = val & 0b1111111;
            nes.apu_triangle_control = bit_test(val, 7);
            break;
        case 0x400A:
            nes.apu_triangle_timer_low = val;
            break;
        case 0x400B:
            nes.apu_triangle_timer_high = val & 0b111;
            nes.apu_triangle_length_load = (val >> 3) & 0b11111;
            break;

        case 0x4015:
            nes.apu_pulse1_enable = bit_test(val, 0);
            nes.apu_pulse2_enable = bit_test(val, 1);
            nes.apu_triangle_enable = bit_test(val, 2);
            nes.apu_noise_enable = bit_test(val, 3);
            nes.apu_dmc_enable = bit_test(val, 4);
            break;

        case 0x4017:
            nes.apu_sequencer_5step = bit_test(val, 7);
            nes.apu_sequencer_no_interrupt = bit_test(val, 6);
            break;
    }
}
