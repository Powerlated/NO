declare let nes: NES;
declare let nestest_log: string[];

let errored = false;

window.onkeydown = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
        case 's':
            step();
            break;
        case 'd':
            while (!errored) {
                step();
            }
    }
};

let logLine = 1;
function step() {
    cpu_execute(nes);

    let logPc = `0x${nestest_log[logLine].slice(0, 4)}`;
    let pc = hex(nes.reg_pc, 4);
    if (logPc !== pc) {
        console.error(`Line ${logLine + 1}: nestest PC mismatch
        Expected: ${logPc}, Actual: ${pc}`);
        errored = true;
    }

    let logP = `0x${nestest_log[logLine].slice(65, 67)}`;
    let p = hex(nes.flag_get(), 2);
    if (logP !== p) {
        console.error(`Line ${logLine + 1}: nestest P mismatch
        Expected: ${logP}, Actual: ${p}`);
        errored = true;
    }

    let logSp = `0x${nestest_log[logLine].slice(71, 73)}`;
    let sp = hex(nes.reg_sp, 2);
    if (logSp !== sp) {
        console.error(`Line ${logLine + 1}: nestest SP mismatch
        Expected: ${logSp}, Actual: ${sp}`);
        errored = true;
    }


    logLine++;
}

let debugElement = document.getElementById('debug')!;

function ready() {
    updateDebug();
}

function updateDebug() {
    requestAnimationFrame(updateDebug);

    debugElement.innerText = `
    PC: ${hex(nes.reg_pc, 4)}
    [PC]: ${hex(mem_read(nes, nes.reg_pc), 2)}
    SP: ${hex(cpu_sp_get(nes), 4)}

    A: ${hex(nes.reg_a, 2)}
    X: ${hex(nes.reg_x, 2)}
    Y: ${hex(nes.reg_y, 2)}

    Log Line: ${logLine}
    `;
}