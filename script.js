/* frequencies gathered from https://pages.mtu.edu/~suits/notefreqs.html */

// 37-key range matching iRig Keys 37 Pro (F2 to F5)
const NOTE_DETAILS = [
	// Octave 2
	{ note: 'F2', key: 'Q', frequency: 87.31, active: false },
	{ note: 'Gb2', key: '2', frequency: 92.50, active: false },
	{ note: 'G2', key: 'W', frequency: 98.00, active: false },
	{ note: 'Ab2', key: '3', frequency: 103.83, active: false },
	{ note: 'A2', key: 'E', frequency: 110.00, active: false },
	{ note: 'Bb2', key: '4', frequency: 116.54, active: false },
	{ note: 'B2', key: 'R', frequency: 123.47, active: false },
	
	// Octave 3
	{ note: 'C3', key: 'T', frequency: 130.81, active: false },
	{ note: 'Db3', key: '6', frequency: 138.59, active: false },
	{ note: 'D3', key: 'Y', frequency: 146.83, active: false },
	{ note: 'Eb3', key: '7', frequency: 155.56, active: false },
	{ note: 'E3', key: 'U', frequency: 164.81, active: false },
	{ note: 'F3', key: 'I', frequency: 174.61, active: false },
	{ note: 'Gb3', key: '9', frequency: 185.00, active: false },
	{ note: 'G3', key: 'O', frequency: 196.00, active: false },
	{ note: 'Ab3', key: '0', frequency: 207.65, active: false },
	{ note: 'A3', key: 'P', frequency: 220.00, active: false },
	{ note: 'Bb3', key: '-', frequency: 233.08, active: false },
	{ note: 'B3', key: '=', frequency: 246.94, active: false },
	
	// Octave 4 (main octave)
	{ note: 'C4', key: 'Z', frequency: 261.63, active: false },
	{ note: 'Db4', key: 'S', frequency: 277.18, active: false },
	{ note: 'D4', key: 'X', frequency: 293.66, active: false },
	{ note: 'Eb4', key: 'D', frequency: 311.13, active: false },
	{ note: 'E4', key: 'C', frequency: 329.63, active: false },
	{ note: 'F4', key: 'V', frequency: 349.23, active: false },
	{ note: 'Gb4', key: 'G', frequency: 369.99, active: false },
	{ note: 'G4', key: 'B', frequency: 392.00, active: false },
	{ note: 'Ab4', key: 'H', frequency: 415.30, active: false },
	{ note: 'A4', key: 'N', frequency: 440.00, active: false },
	{ note: 'Bb4', key: 'J', frequency: 466.16, active: false },
	{ note: 'B4', key: 'M', frequency: 493.88, active: false },
	
	// Octave 5
	{ note: 'C5', key: ',', frequency: 523.25, active: false },
	{ note: 'Db5', key: 'L', frequency: 554.37, active: false },
	{ note: 'D5', key: '.', frequency: 587.33, active: false },
	{ note: 'Eb5', key: ';', frequency: 622.25, active: false },
	{ note: 'E5', key: '/', frequency: 659.25, active: false },
	{ note: 'F5', key: null, frequency: 698.46, active: false } // No keyboard mapping for highest note
];

const audioContext = new AudioContext();

// MIDI support variables
let midiAccess = null;
let selectedMidiDevice = null;
const connectedDevices = new Map();

// Initialize MIDI support
async function initializeMIDI() {
	if (navigator.requestMIDIAccess) {
		try {
			midiAccess = await navigator.requestMIDIAccess();
			console.log('MIDI Access granted');
			
			// Listen for device connections/disconnections
			midiAccess.onstatechange = handleMIDIStateChange;
			
			// Scan for existing devices
			scanMIDIDevices();
			updateMidiDeviceUI();
		} catch (error) {
			console.warn('MIDI access denied or not supported:', error);
			showMidiStatus('MIDI not supported in this browser');
		}
	} else {
		console.warn('Web MIDI API not supported');
		showMidiStatus('MIDI not supported in this browser');
	}
}

function scanMIDIDevices() {
	if (!midiAccess) return;
	
	// Clear existing devices
	connectedDevices.clear();
	
	// Scan inputs (keyboards)
	for (let input of midiAccess.inputs.values()) {
		connectedDevices.set(input.id, {
			device: input,
			type: 'input',
			name: input.name,
			connected: input.state === 'connected'
		});
		
		// Set up message handler
		input.onmidimessage = handleMIDIMessage;
		console.log(`MIDI Input detected: ${input.name}`);
	}
}

function handleMIDIStateChange(event) {
	console.log(`MIDI device ${event.port.state}: ${event.port.name}`);
	scanMIDIDevices();
	updateMidiDeviceUI();
}

function handleMIDIMessage(message) {
	const [command, note, velocity] = message.data;
	
	// Note on: command 144 (0x90), Note off: command 128 (0x80)
	const isNoteOn = (command & 0xF0) === 0x90 && velocity > 0;
	const isNoteOff = (command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && velocity === 0);
	
	if (isNoteOn || isNoteOff) {
		let noteDetail = getNoteDetailsFromMIDI(note);
		if (noteDetail) {
			// Handle temporary MIDI notes
			if (noteDetail.isMidiOnly) {
				if (isNoteOn) {
					tempMidiNotes.set(note, noteDetail);
				} else {
					tempMidiNotes.delete(note);
				}
			}
			
			noteDetail.active = isNoteOn;
			handleMidiAudio(noteDetail, isNoteOn, velocity);
		}
	}
}

// Enhanced audio handling for MIDI with velocity support
function handleMidiAudio(noteDetail, isNoteOn, velocity = 127) {
	// Update visual for visible keys only
	if (!noteDetail.isMidiOnly) {
		toggleNoteVisual(noteDetail);
	}
	
	// Handle audio
	stopPlayingNote(noteDetail);
	
	if (isNoteOn) {
		// Convert MIDI velocity (0-127) to gain (0-1)
		const velocityGain = velocity / 127;
		const totalActiveNotes = NOTE_DETAILS.filter(n => n.active).length + tempMidiNotes.size;
		const gain = velocityGain / Math.max(totalActiveNotes, 1);
		
		startPlayingNote(noteDetail, gain);
	}
}

// Map MIDI note numbers to our NOTE_DETAILS
// MIDI C4 = 60, support wider range for MIDI keyboards
function getNoteDetailsFromMIDI(midiNote) {
	const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	const octave = Math.floor(midiNote / 12) - 1;
	const noteIndex = midiNote % 12;
	const noteName = noteNames[noteIndex] + octave;
	
	// Try to find exact match first
	let noteDetail = NOTE_DETAILS.find(n => n.note === noteName);
	
	// If not found, create a temporary note detail for the MIDI note
	if (!noteDetail) {
		noteDetail = createTempNoteFromMIDI(midiNote, noteName);
	}
	
	return noteDetail;
}

// Create temporary note details for MIDI notes outside our visible range
function createTempNoteFromMIDI(midiNote, noteName) {
	// Calculate frequency from MIDI note number
	// A4 (440 Hz) = MIDI note 69
	const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
	
	return {
		note: noteName,
		key: null, // No keyboard key mapping
		frequency: frequency,
		active: false,
		isMidiOnly: true // Flag to identify MIDI-only notes
	};
}

// Track temporary MIDI notes
const tempMidiNotes = new Map();

function showMidiStatus(message) {
	const statusElement = document.getElementById('midi-status');
	if (statusElement) {
		statusElement.textContent = message;
	}
}

function updateMidiDeviceUI() {
	const deviceSelect = document.getElementById('midi-device-select');
	if (!deviceSelect) return;
	
	// Clear existing options
	deviceSelect.innerHTML = '<option value="">No MIDI device</option>';
	
	// Add connected devices
	const inputDevices = Array.from(connectedDevices.values())
		.filter(device => device.type === 'input' && device.connected);
	
	inputDevices.forEach(device => {
		const option = document.createElement('option');
		option.value = device.device.id;
		option.textContent = device.name;
		deviceSelect.appendChild(option);
	});
	
	// Update status
	if (inputDevices.length > 0) {
		showMidiStatus(`${inputDevices.length} MIDI device(s) connected`);
	} else {
		showMidiStatus('No MIDI devices connected');
	}
}

// Handle MIDI device selection
function handleMidiDeviceSelection() {
	const deviceSelect = document.getElementById('midi-device-select');
	if (!deviceSelect) return;
	
	deviceSelect.addEventListener('change', (e) => {
		const deviceId = e.target.value;
		if (deviceId) {
			selectedMidiDevice = connectedDevices.get(deviceId);
			showMidiStatus(`Connected to: ${selectedMidiDevice.name}`);
		} else {
			selectedMidiDevice = null;
			showMidiStatus('No MIDI device selected');
		}
	});
}

// Initialize MIDI when page loads
document.addEventListener('DOMContentLoaded', () => {
	initializeMIDI();
	handleMidiDeviceSelection();
});

document.addEventListener('keydown', ({ repeat, code }) => {
	if (repeat) return;
	updateSingleNoteDetails(code, true);
	handleAudio();
});

document.addEventListener('keyup', ({ code }) => {
	updateSingleNoteDetails(code, false);
	handleAudio();
});

const KEYS = document.querySelectorAll('.key');

KEYS.forEach(midiKey => {
	const note = NOTE_DETAILS.find(n => n.note === midiKey.dataset.note);
	const code = `Key${note.key}`;

	let isPlaying = false;

	const startPlaying = () => {
		updateSingleNoteDetails(code, true);
		handleAudio();
		isPlaying = true;
	};

	const stopPlaying = () => {
		updateSingleNoteDetails(code, false);
		handleAudio();
		isPlaying = false;
	};

	midiKey.addEventListener('mousedown', e => startPlaying());
	midiKey.addEventListener('mouseup', e => stopPlaying());
	midiKey.addEventListener('mouseout', e => { 
		if (isPlaying) stopPlaying();
	});

	midiKey.addEventListener('touchstart', e => {
		startPlaying()
		midiKey.addEventListener('touchmove', e => {
			if (isPlaying) stopPlaying();
		});
		midiKey.addEventListener('touchend', e => stopPlaying());
		midiKey.addEventListener('touchcancel', e => stopPlaying());
	});
	
});

let oscillatorType = 'sine';

const oscillatorSelector = document.querySelector('#oscillator-type');

oscillatorSelector.addEventListener('change', e => {
	oscillatorType = e.target.value;
});

function updateSingleNoteDetails(code, isActive) {
	const noteDetail = getNoteDetails(code);
	if (noteDetail == null) return;
	noteDetail.active = isActive;
}

function getNoteDetails(code) {
	return NOTE_DETAILS.find(n => `Key${n.key}` === code);
}

function toggleNoteVisual(n) {
	const keyElement = document.querySelector(`[data-note="${n.note}"]`);
	keyElement.classList.toggle('active', n.active);
}

function stopPlayingNote(n) {
	if (n.oscillator != null) {
		n.oscillator.stop();
		n.oscillator.disconnect();
	}
}

function playActiveNotes() {
	const activeNotes = NOTE_DETAILS.filter(n => n.active);
	const gain = 1 / activeNotes.length;
	activeNotes.forEach(n => startPlayingNote(n, gain));
}

function handleAudio() {
	NOTE_DETAILS.forEach(n => {
		toggleNoteVisual(n);
		stopPlayingNote(n);
	});
	playActiveNotes();
}

function startPlayingNote(noteDetail, gain) {
	const gainNode = audioContext.createGain();
	gainNode.gain.value = gain;
	appendOscillatorToNoteDetails(noteDetail, gainNode);
}

function appendOscillatorToNoteDetails(noteDetail, gainNode) {
	const oscillator = audioContext.createOscillator();
	oscillator.frequency.value = noteDetail.frequency;
	oscillator.type = oscillatorType;
	oscillator.connect(gainNode).connect(audioContext.destination);
	oscillator.start();
	noteDetail.oscillator = oscillator;
}
