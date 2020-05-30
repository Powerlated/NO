function controller_poll(nes: NES) {

    nes.controller_shift[7] = nes.controller_a ? 1 : 0;
    nes.controller_shift[6] = nes.controller_b ? 1 : 0;
    nes.controller_shift[5] = nes.controller_select ? 1 : 0;
    nes.controller_shift[4] = nes.controller_start ? 1 : 0;
    nes.controller_shift[3] = nes.controller_up ? 1 : 0;
    nes.controller_shift[2] = nes.controller_down ? 1 : 0;
    nes.controller_shift[1] = nes.controller_left ? 1 : 0;
    nes.controller_shift[0] = nes.controller_right ? 1 : 0;


}

function controller_set(nes: NES, val: number): void {
    nes.controller_poll_mode = bit_test(val, 0);
    if (nes.controller_poll_mode) {
        controller_poll(nes);
        nes.controller_shift_pos = 8;
    }
}

function controller_read_port1(nes: NES): number {
    let value = 0;
    if (nes.controller_shift_pos > 0 && !nes.controller_poll_mode) {
        nes.controller_shift_pos--;
        if (nes.controller_shift[nes.controller_shift_pos] == 1)
            value |= BIT_0;
    } else {
        value |= BIT_0;
    }
    return value;
}