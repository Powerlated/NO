declare let nes: NES;

window.onkeydown = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
        case 's':
            console.log('Step')
            cpu_execute(nes);
            break;
    }
};