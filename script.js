/* frequencies gathered from https://pages.mtu.edu/~suits/notefreqs.html */

const NOTE_DETAILS = [
	{ note: 'C4', key: 'Z', frequency: 261.63, active: false },
	{ note: 'Db4', key: 'S', frequency: 277.18, active: false },
	{ note: 'D4', key: 'X', frequency: 293.66, active: false },
	{ note: 'Eb4', key: 'D', frequency: 311.13, active: false },
	{ note: 'E4', key: 'C', frequency: 329.63, active: false },
	{ note: 'F4', key: 'V', frequency: 349.23, active: false },
	{ note: 'Gb4', key: 'G', frequency: 369.99, active: false },
	{ note: 'G4', key: 'B', frequency: 392.0, active: false },
	{ note: 'Ab4', key: 'H', frequency: 415.3, active: false },
	{ note: 'A4', key: 'N', frequency: 440.0, active: false },
	{ note: 'Bb4', key: 'J', frequency: 466.16, active: false },
	{ note: 'B4', key: 'M', frequency: 493.883, active: false }
];

const audioContext = new AudioContext();

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
	
	midiKey.addEventListener('touchend', e => {
		if (isPlaying) stopPlaying();
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
