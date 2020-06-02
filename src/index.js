let romReq = new XMLHttpRequest();

// const rom_file = 'Mega Man (USA).nes';
// const rom_file = 'Super Mario Bros. + Duck Hunt (USA).nes';
const rom_file = 'Joust (USA).nes';

romReq.onload = function (e) {
    /** @type {ArrayBuffer} */
    let arrayBuffer = romReq.response;
    window.nes = new NES(parse_iNES(new Uint8Array(arrayBuffer)));
    console.log(`${rom_file} loaded`);
    ready();
};
romReq.open("GET", rom_file);
romReq.responseType = "arraybuffer";
romReq.send();

let logReq = new XMLHttpRequest();
logReq.onload = function (e) {
    /** @type {string} */
    let text = logReq.responseText;
    window.nestest_log = text.split('\n');
};
logReq.open("GET", 'nestest.log');
logReq.responseType = 'text';
logReq.send();

