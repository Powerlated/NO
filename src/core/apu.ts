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

const LENGTH = Uint8Array.of(
    10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
    12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 3
);

const NOISE_PERIOD = Uint16Array.of(
    4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068
);

const player = new SoundPlayer();

function apu_half_frame(nes: NES) {
    if (nes.apu_pulse1_sweep_div <= 0) {
        if (nes.apu_pulse1_sweep_enabled) {

            let period = ((nes.apu_pulse1_timer_high << 8) | nes.apu_pulse1_timer_low);
            let change = period >> nes.apu_pulse1_sweep_shift;
            // Pulse 1 uses one's complement for negate, so extra -1
            if (nes.apu_pulse1_sweep_negate) {
                change *= -1;
                change -= 1;
            }

            let new_period = change + period;

            nes.apu_pulse1_sweep_muted = new_period > 0x7FF;

            if (!nes.apu_pulse1_sweep_muted) {
                nes.apu_pulse1_timer_high = (new_period >> 8) & 0b111;
                nes.apu_pulse1_timer_low = (new_period >> 0) & 0xFF;
            }
        }
    }
    if (nes.apu_pulse1_sweep_div <= 0 || nes.apu_pulse1_sweep_reload) {
        nes.apu_pulse1_sweep_reload = false;
        nes.apu_pulse1_sweep_div = nes.apu_pulse1_sweep_divider_period;
    } else {
        nes.apu_pulse1_sweep_div--;
    }
    if (nes.apu_pulse2_sweep_div <= 0) {
        if (nes.apu_pulse2_sweep_enabled) {
            let period = ((nes.apu_pulse2_timer_high << 8) | nes.apu_pulse2_timer_low);
            let change = period >> nes.apu_pulse2_sweep_shift;
            if (nes.apu_pulse2_sweep_negate) {
                change *= -1;
            }

            let new_period = change + period;

            nes.apu_pulse2_sweep_muted = new_period > 0x7FF;

            if (!nes.apu_pulse2_sweep_muted) {
                nes.apu_pulse2_timer_high = (new_period >> 8) & 0b111;
                nes.apu_pulse2_timer_low = (new_period >> 0) & 0xFF;
            }
        }
    }
    if (nes.apu_pulse2_sweep_div <= 0 || nes.apu_pulse2_sweep_reload) {
        nes.apu_pulse2_sweep_reload = false;
        nes.apu_pulse2_sweep_div = nes.apu_pulse2_sweep_divider_period;
    } else {
        nes.apu_pulse2_sweep_div--;
    }

    if (!nes.apu_pulse1_env_loop_length_halt) {
        if (nes.apu_pulse1_length_counter > 0) {
            nes.apu_pulse1_length_counter--;
        }

    }
    if (!nes.apu_pulse2_env_loop_length_halt) {
        if (nes.apu_pulse2_length_counter > 0) {
            nes.apu_pulse2_length_counter--;
        }

    }
    if (!nes.apu_triangle_control) {
        if (nes.apu_triangle_length_counter > 0) {
            nes.apu_triangle_length_counter--;
        }

    }
    if (!nes.apu_noise_env_loop_length_halt) {
        if (nes.apu_noise_length_counter > 0) {
            nes.apu_noise_length_counter--;
        }

    }
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
            } else if (nes.apu_pulse1_env_loop_length_halt) {
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
            } else if (nes.apu_pulse2_env_loop_length_halt) {
                nes.apu_pulse2_volume = 15;
            }
        }

        nes.apu_pulse2_env_div--;
    }

    if (nes.apu_noise_env_start) {
        nes.apu_noise_env_start = false;

        nes.apu_noise_env_div = nes.apu_noise_volume_init;
        nes.apu_noise_volume = 15;
    } else {
        if (nes.apu_noise_env_div == 0) {
            nes.apu_noise_env_div = nes.apu_noise_volume_init;

            if (nes.apu_noise_volume != 0) {
                nes.apu_noise_volume--;
            } else if (nes.apu_noise_env_loop_length_halt) {
                nes.apu_noise_volume = 15;
            }
        }

        nes.apu_noise_env_div--;
    }

    if (nes.apu_triangle_counter_reload) {
        nes.apu_triangle_counter_reload = false;

        nes.apu_triangle_counter = nes.apu_triangle_counter_period;
    } else {
        if (nes.apu_triangle_counter > 0) {
            nes.apu_triangle_counter--;
        }
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

            if (nes.apu_triangle_length_counter != 0 && nes.apu_triangle_counter != 0) {
                nes.apu_triangle_pos--;
                nes.apu_triangle_pos &= 31;
            }
        }
    }

    if (nes.apu_noise_enable) {
        nes.apu_noise_timer -= cycles;

        if (nes.apu_noise_timer <= 0) {
            // When the timer hits zero, advance the position and reload the timer
            nes.apu_noise_timer += NOISE_PERIOD[nes.apu_noise_period_entry];

            let feedback_bit = (nes.apu_noise_short_mode ? nes.apu_noise_lfsr >> 6 : nes.apu_noise_lfsr >> 1) & 1;
            let bit_zero = nes.apu_noise_lfsr & 1;
            let final_bit = feedback_bit ^ bit_zero;

            nes.apu_noise_lfsr >>= 1;
            nes.apu_noise_lfsr |= final_bit << 14;
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
                    nes.apu_sequencer_step = 0;
                    nes.apu_sequencer_clock = 0;
                    apu_quarter_frame(nes);
                    apu_half_frame(nes);
                }
                break;
        }
    }

    // CPU clock rate divided by nominal sample rate
    nes.apu_sample_timer += cycles;
    if (nes.apu_sample_timer >= 1789773 / SAMPLE_RATE) {
        nes.apu_sample_timer -= 1789773 / SAMPLE_RATE;

        let sample = 0;
        if (nes.apu_pulse1_enable && nes.apu_pulse1_length_counter != 0 && !nes.apu_pulse1_sweep_muted) {
            if (nes.apu_pulse1_constant) {
                sample += APU_DUTY_CYCLES[nes.apu_pulse1_duty][nes.apu_pulse1_pos] * (nes.apu_pulse1_volume_init / 15);
            } else {
                sample += APU_DUTY_CYCLES[nes.apu_pulse1_duty][nes.apu_pulse1_pos] * (nes.apu_pulse1_volume / 15);
            }
        }
        if (nes.apu_pulse2_enable && nes.apu_pulse2_length_counter != 0 && !nes.apu_pulse2_sweep_muted) {
            if (nes.apu_pulse2_constant) {
                sample += APU_DUTY_CYCLES[nes.apu_pulse2_duty][nes.apu_pulse2_pos] * (nes.apu_pulse2_volume_init / 15);
            } else {
                sample += APU_DUTY_CYCLES[nes.apu_pulse2_duty][nes.apu_pulse2_pos] * (nes.apu_pulse2_volume / 15);
            }
        }
        sample += TRIANGLE_SEQ[nes.apu_triangle_pos] / 15;
        if (nes.apu_noise_enable && nes.apu_noise_length_counter != 0) {
            if (nes.apu_noise_constant) {
                sample += (nes.apu_noise_lfsr & 1) * (nes.apu_noise_volume_init / 15);
            } else {
                sample += (nes.apu_noise_lfsr & 1) * (nes.apu_noise_volume / 15);
            }
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
            nes.apu_pulse1_env_loop_length_halt = bit_test(val, 5);
            nes.apu_pulse1_duty = (val >> 6) & 0b11;
            break;
        case 0x4001:
            nes.apu_pulse1_sweep_shift = val & 0b111;
            nes.apu_pulse1_sweep_negate = bit_test(val, 3);
            nes.apu_pulse1_sweep_divider_period = (val >> 4) & 0b111;
            nes.apu_pulse1_sweep_enabled = bit_test(val, 7);

            nes.apu_pulse1_sweep_reload = true;
            break;
        case 0x4002:
            nes.apu_pulse1_timer_low = val;
            break;
        case 0x4003:
            nes.apu_pulse1_timer_high = val & 0b111;
            nes.apu_pulse1_length_load = (val >> 3) & 0b11111;

            if (!nes.apu_pulse1_env_loop_length_halt)
                nes.apu_pulse1_length_counter = LENGTH[nes.apu_pulse1_length_load & 0x1F];

            nes.apu_pulse1_env_start = true;
            nes.apu_pulse1_pos = 0;
            break;

        case 0x4004:
            nes.apu_pulse2_volume_init = val & 0b1111;
            nes.apu_pulse2_constant = bit_test(val, 4);
            nes.apu_pulse2_env_loop_length_halt = bit_test(val, 5);
            nes.apu_pulse2_duty = (val >> 6) & 0b11;
            break;
        case 0x4005:
            nes.apu_pulse2_sweep_shift = val & 0b111;
            nes.apu_pulse2_sweep_negate = bit_test(val, 3);
            nes.apu_pulse2_sweep_divider_period = (val >> 4) & 0b111;
            nes.apu_pulse2_sweep_enabled = bit_test(val, 7);

            nes.apu_pulse2_sweep_reload = true;
            break;
        case 0x4006:
            nes.apu_pulse2_timer_low = val;
            break;
        case 0x4007:
            nes.apu_pulse2_timer_high = val & 0b111;
            nes.apu_pulse2_length_load = (val >> 3) & 0b11111;

            if (!nes.apu_pulse2_env_loop_length_halt)
                nes.apu_pulse2_length_counter = LENGTH[nes.apu_pulse2_length_load & 0x1F];

            nes.apu_pulse2_env_start = true;
            nes.apu_pulse2_pos = 0;
            break;

        case 0x4008:
            nes.apu_triangle_counter_period = val & 0b1111111;
            nes.apu_triangle_control = bit_test(val, 7);
            break;
        case 0x400A:
            nes.apu_triangle_timer_low = val;
            break;
        case 0x400B:
            nes.apu_triangle_timer_high = val & 0b111;
            nes.apu_triangle_length_load = (val >> 3) & 0b11111;

            if (!nes.apu_triangle_control)
                nes.apu_triangle_length_counter = LENGTH[nes.apu_triangle_length_load & 0x1F];

            nes.apu_triangle_counter_reload = true;
            break;

        case 0x400C:
            nes.apu_noise_volume_init = val & 0b1111;
            nes.apu_noise_constant = bit_test(val, 4);
            nes.apu_noise_env_loop_length_halt = bit_test(val, 5);
            break;
        case 0x400E:
            nes.apu_noise_short_mode = bit_test(val, 7);
            nes.apu_noise_period_entry = val & 0b1111;
            break;
        case 0x400F:
            nes.apu_noise_length_load = (val >> 3) & 0b11111;

            if (!nes.apu_noise_env_loop_length_halt)
                nes.apu_noise_length_counter = LENGTH[nes.apu_noise_length_load & 0x1F];

            nes.apu_noise_env_start = true;
            break;

        case 0x4015:
            nes.apu_pulse1_enable = bit_test(val, 0);
            nes.apu_pulse2_enable = bit_test(val, 1);
            nes.apu_triangle_enable = bit_test(val, 2);
            nes.apu_noise_enable = bit_test(val, 3);
            nes.apu_dmc_enable = bit_test(val, 4);

            if (!bit_test(val, 0)) {
                nes.apu_pulse1_length_counter = 0;
            }
            if (!bit_test(val, 1)) {
                nes.apu_pulse2_length_counter = 0;
            }
            if (!bit_test(val, 2)) {
                nes.apu_triangle_length_counter = 0;
            }
            if (!bit_test(val, 3)) {
                nes.apu_noise_length_counter = 0;
            }

            break;

        case 0x4017:
            nes.apu_sequencer_5step = bit_test(val, 7);
            nes.apu_sequencer_no_interrupt = bit_test(val, 6);

            nes.apu_sequencer_step = 0;
            nes.apu_sequencer_clock = 0;

            if (nes.apu_sequencer_5step) {
                apu_quarter_frame(nes);
                apu_half_frame(nes);
            }
            break;
    }
}
