let romReq = new XMLHttpRequest();

romReq.onload = function (e) {
    /** @type {ArrayBuffer} */
    let arrayBuffer = romReq.response;
    window.nes = new NES(parse_iNES(new Uint8Array(arrayBuffer)));
    console.log("nestest loaded");
    ready();
};
romReq.open("GET", 'Donkey Kong.nes');
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

