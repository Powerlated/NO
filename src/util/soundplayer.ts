let safariHax = false;
if (!AudioBuffer.prototype.copyToChannel) safariHax = true;

let firefoxHax = false;
try {
    new AudioContext({ sampleRate: 262144 });
} catch {
    if (!safariHax)
        firefoxHax = true;
}

const NORMAL_SAMPLE_RATE = 262144;
const SAMPLE_RATE = firefoxHax ? 131072 : (safariHax ? 65536 : NORMAL_SAMPLE_RATE);
const LATENCY = firefoxHax ? 4096 : (safariHax ? 2048 : 8192);
const LATENCY_SEC = LATENCY / SAMPLE_RATE;

class SoundPlayer {

    constructor() {
        const AudioContext = window.AudioContext   // Normal browsers
            || (window as any).webkitAudioContext; // Sigh... Safari

        this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });

        const fixAudioContext = () => {
            // Create empty buffer
            let buffer = this.ctx.createBuffer(1, 1, 22050);
            let source = this.ctx.createBufferSource();
            source.buffer = buffer;
            // Connect to output (speakers)
            source.connect(this.ctx.destination);
            // Play sound
            if (source.start) {
                source.start(0);
            } else if ((source as any).play) {
                (source as any).play(0);
            } else if ((source as any).noteOn) {
                (source as any).noteOn(0);
            }
        };
        // iOS 6-8
        document.addEventListener('touchstart', fixAudioContext);
        // iOS 9
        document.addEventListener('touchend', fixAudioContext);

        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
    }

    gain: GainNode;

    ctx: AudioContext;
    sources: AudioBufferSourceNode[] = [];

    sampleRate = SAMPLE_RATE;

    queueAudio(bufferLeft: Float32Array, bufferRight: Float32Array, sampleRate: number) {
        const length = Math.max(bufferLeft.length, bufferRight.length);
        let buffer = this.ctx.createBuffer(2, length, sampleRate);

        if (!safariHax) {
            buffer.copyToChannel(bufferLeft, 0);
            buffer.copyToChannel(bufferRight, 1);
        } else {
            buffer.getChannelData(0).set(bufferLeft);
            buffer.getChannelData(1).set(bufferRight);
        }

        let bufferSource = this.ctx.createBufferSource();

        bufferSource.onended = () => { this.sources.shift(); };

        bufferSource.buffer = buffer;
        bufferSource.connect(this.gain);
        bufferSource.start(this.audioSec);

        if (this.audioSec <= this.ctx.currentTime + 0.02) {
            // Reset time if close to buffer underrun
            this.audioSec = this.ctx.currentTime + 0.06;
        }

        this.sampleRate = sampleRate;
        this.audioSec += length / sampleRate;


        this.sources.push(bufferSource);
    }

    audioSec = 0;

    reset() {
        // Stop all sounds
        this.sources.forEach((v, i, a) => {
            v.stop();
        });
        this.sources = [];

        // 100 ms buffer
        this.audioSec = this.ctx.currentTime + 0.1;
        // console.log(`Latency in seconds: ${(LATENCY / this.sampleRate)}`)
    }
}