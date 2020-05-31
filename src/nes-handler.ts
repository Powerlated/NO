declare let nes: NES;
declare let nestest_log: string[];

let errored = false;

window.onkeydown = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
        case 's':
            step();
            break;
        case 'd':
            const scanlineMax = 341 / 3;
            let cycles = 0;
            while (cycles <= scanlineMax) {
                cycles += cpu_execute(nes);
            }
            break;
        case 'f':
            runFrame();
    }

    switch (e.key.toLowerCase()) {
        case "arrowleft":
            nes.controller_left = true;
            e.preventDefault();
            break;
        case "arrowup":
            nes.controller_up = true;
            e.preventDefault();
            break;
        case "arrowright":
            nes.controller_right = true;
            e.preventDefault();
            break;
        case "arrowdown":
            nes.controller_down = true;
            e.preventDefault();
            break;

        case "x":
            nes.controller_a = true;
            e.preventDefault();
            break;
        case "z":
            nes.controller_b = true;
            e.preventDefault();
            break;
        case "enter":
            nes.controller_start = true;
            e.preventDefault();
            break;
        case "\\":
            nes.controller_select = true;
            e.preventDefault();
            break;
    }
};

window.onkeyup = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
        case "arrowleft":
            nes.controller_left = false;
            e.preventDefault();
            break;
        case "arrowup":
            nes.controller_up = false;
            e.preventDefault();
            break;
        case "arrowright":
            nes.controller_right = false;
            e.preventDefault();
            break;
        case "arrowdown":
            nes.controller_down = false;
            e.preventDefault();
            break;

        case "x":
            nes.controller_a = false;
            e.preventDefault();
            break;
        case "z":
            nes.controller_b = false;
            e.preventDefault();
            break;
        case "enter":
            nes.controller_start = false;
            e.preventDefault();
            break;
        case "\\":
            nes.controller_select = false;
            e.preventDefault();
            break;
    }
};

function exec_num(max: number) {
    for (let i = 0; i < max; i++)
        cpu_execute(nes);
}

function exec_cycles(max: number) {
    let cycles = 0;
    while (cycles < max) {
        cycles += cpu_execute(nes);
    }
}

let checkErrors = false;
let logLine = 1;
function step() {
    let cycles = cpu_execute(nes);

    if (checkErrors) {
        let logPc = `0x${nestest_log[logLine].slice(0, 4)}`;
        let pc = hex(nes.reg_pc, 4);
        if (logPc !== pc) {
            console.error(`Line ${logLine}: nestest PC mismatch
        Expected: ${logPc}, Actual: ${pc}`);
            errored = true;
        }

        let logP = `0x${nestest_log[logLine].slice(65, 67)}`;
        let p = hex(nes.flag_get(), 2);
        if (logP !== p) {
            console.error(`Line ${logLine}: nestest P mismatch
        Expected: ${logP}, Actual: ${p}`);
            errored = true;
        }

        let logSp = `0x${nestest_log[logLine].slice(71, 73)}`;
        let sp = hex(nes.reg_sp, 2);
        if (logSp !== sp) {
            console.error(`Line ${logLine}: nestest SP mismatch
        Expected: ${logSp}, Actual: ${sp}`);
            errored = true;
        }

        let logA = `0x${nestest_log[logLine].slice(50, 52)}`;
        let a = hex(nes.reg_a, 2);
        if (logA !== a) {
            console.error(`Line ${logLine}: nestest A mismatch
        Expected: ${logA}, Actual: ${a}`);
            errored = true;
        }

        let logX = `0x${nestest_log[logLine].slice(55, 57)}`;
        let x = hex(nes.reg_x, 2);
        if (logX !== x) {
            console.error(`Line ${logLine}: nestest X mismatch
        Expected: ${logX}, Actual: ${x}`);
            errored = true;
        }
        let logY = `0x${nestest_log[logLine].slice(60, 62)}`;
        let y = hex(nes.reg_y, 2);
        if (logY !== y) {
            console.error(`Line ${logLine}: nestest Y mismatch
        Expected: ${logY}, Actual: ${y}`);
            errored = true;
        }

        logLine++;
    }

    return cycles;
}

let disasmElement = document.getElementById('disasm')!;
let debugElement = document.getElementById('debug')!;

function ready() {
    updateDebug();
}

function runFrame() {
    const frameMax = 89341.5 / 3;
    let cycles = 0;
    while (cycles <= frameMax && !errored) {
        cycles += step();
    }
}

let frame = 0;
function updateDebug() {
    requestAnimationFrame(updateDebug);
    runEmulator();

    disasmElement.innerHTML = disassemble(nes);

    debugElement.innerText = `
    Cycles: ${nes.cycles}
    NMI Ready: ${nes.nmi_queued}

    PC: ${hex(nes.reg_pc, 4)}
    SP: ${hex(cpu_sp_get(nes), 4)}

    A: ${hex(nes.reg_a, 2)}
    X: ${hex(nes.reg_x, 2)}
    Y: ${hex(nes.reg_y, 2)}

    PPU Addr Head: ${hex(nes.ppu_ppudata_head, 4)}

    PPU Line: ${nes.ppu_line}
    PPU Line Dot: ${nes.ppu_line_clock}

    PPU NMI Enable: ${nes.ppu_enable_nmi}
    PPU NMI Occurred: ${nes.ppu_nmi_occurred}

    PPU Sprite 0 Hit: ${nes.ppu_sprite0hit}

    PPU ScrX/Y ${nes.ppu_ppuscroll_x}/${nes.ppu_ppuscroll_y}

    PPU Nametable Base: ${['0x2000', '0x2400', '0x2800', '0x2C00'][nes.ppu_nametable_base_id]}
    `;
}

let lastTime = 0;
function runEmulator() {
    const now = performance.now();
    let deltaMs = now - lastTime;
    if (deltaMs > 17) {
        deltaMs = 17;
    }
    lastTime = now;

    let max = 1789.773 * deltaMs;

    exec_cycles(max);
}





function download_log() {
    let string = log.join('\n');
    download('nes-optime.log', string);
}

function download(filename: string, text: string) {
    let anchor = document.createElement('a');
    anchor.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    anchor.setAttribute('download', filename);

    anchor.style.display = 'none';
    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);
}