let req = new XMLHttpRequest();

req.onload = function (e) {
    /** @type {ArrayBuffer} */
    let arrayBuffer = req.response;
    window.nes = new NES(parse_iNES(new Uint8Array(arrayBuffer)));
};
req.open("GET", 'nestest.nes');
req.responseType = "arraybuffer";
req.send();

