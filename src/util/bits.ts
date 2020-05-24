const BIT_0 = 1 << 0x0;
const BIT_1 = 1 << 0x1;
const BIT_2 = 1 << 0x2;
const BIT_3 = 1 << 0x3;
const BIT_4 = 1 << 0x4;
const BIT_5 = 1 << 0x5;
const BIT_6 = 1 << 0x6;
const BIT_7 = 1 << 0x7;
const BIT_8 = 1 << 0x8;
const BIT_9 = 1 << 0x9;
const BIT_10 = 1 << 0xA;
const BIT_11 = 1 << 0xB;
const BIT_12 = 1 << 0xC;
const BIT_13 = 1 << 0xD;
const BIT_14 = 1 << 0xE;
const BIT_15 = 1 << 0xF;
const BIT_16 = 1 << 0x10;

function bit_test(val: number, bit: number) {
    return (val & (1 << bit)) !== 0;
}

function bit_set(val: number, bit: number) {
    return val | (1 << bit);
}

function bit_reset(val: number, bit: number) {
    return val & (~(1 << bit));
}

function bit_set_val(val: number, bit: number, value: boolean) {
    if (value) {
        return val | (1 << bit);
    } else {
        return val & (~(1 << bit));
    }
}