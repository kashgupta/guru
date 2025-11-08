import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const waveEl = document.getElementById('wave');

// Create visualization bars
for (let i = 0; i < 20; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = '10px';
    waveEl.appendChild(bar);
}

let session = null;
let isConnected = false;

// Update status display
function updateStatus(status, message) {
    statusEl.className = `status ${status}`;
    statusEl.textContent = message;
}

// Add message to transcript
function addTranscript(speaker, message) {
    // Remove placeholder if it exists
    if (transcriptEl.children.length === 1 && transcriptEl.children[0].style.color === 'rgb(153, 153, 153)') {
        transcriptEl.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = `transcript-item ${speaker}`;

    const speakerLabel = document.createElement('div');
    speakerLabel.className = 'speaker';
    speakerLabel.textContent = speaker === 'user' ? 'You' : 'Assistant';

    const messageText = document.createElement('div');
    messageText.className = 'message';
    messageText.textContent = message;

    item.appendChild(speakerLabel);
    item.appendChild(messageText);
    transcriptEl.appendChild(item);

    // Auto-scroll to bottom
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

// Animate audio visualization
function animateWave(intensity = 0.5) {
    const bars = waveEl.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
        const height = Math.random() * 80 * intensity + 10;
        bar.style.height = `${height}px`;
    });
}

// Stop wave animation
function stopWave() {
    const bars = waveEl.querySelectorAll('.bar');
    bars.forEach(bar => {
        bar.style.height = '10px';
    });
}

let waveInterval = null;

// Debug: Intercept fetch to monitor WebRTC SDP exchange
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const [url, options] = args;

    // Log WebRTC realtime endpoint requests (both /realtime and /realtime/calls)
    if (typeof url === 'string' && (url.includes('realtime/calls') || url.includes('/v1/realtime'))) {
        console.log('🔵 WebRTC POST to Realtime API');
        console.log('Request URL:', url);
        console.log('Request headers:', options?.headers);
        console.log('Request body type:', options?.headers?.['Content-Type'] || options?.headers?.['content-type']);

        const response = await originalFetch(...args);
        const clone = response.clone();
        const text = await clone.text();

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        console.log('Response body length:', text.length);

        // Handle error responses (400, 401, etc.)
        if (response.status >= 400) {
            console.error(`❌ ERROR: ${response.status} ${response.statusText}`);
            console.error('Error response body:', text);

            // Try to parse as JSON error
            try {
                const errorJson = JSON.parse(text);
                console.error('Parsed error:', errorJson);
            } catch (e) {
                // Not JSON, just log the text
                console.error('Raw error (not JSON):', text);
            }
        } else {
            // Success response - check if it's valid SDP
            console.log('✅ Success! Response preview:', text.substring(0, 200));

            if (!text.startsWith('v=')) {
                console.warn('⚠️ WARNING: SDP response does not start with "v="');
                console.warn('This might not be a valid SDP. Full response:', text);
            } else {
                console.log('✅ Valid SDP response received (starts with "v=")');
            }
        }

        return response;
    }

    return originalFetch(...args);
};

// Connect to OpenAI Realtime API
async function connect() {
    try {
        updateStatus('connecting', 'Connecting...');
        connectBtn.disabled = true;

        console.log('🟢 Step 1: Fetching ephemeral token from server...');

        // Fetch ephemeral token from server
        const response = await fetch('/api/session');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            throw new Error(`Failed to get session token: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        const apiKey = data.client_secret || data.apiKey;

        console.log('🟢 Step 2: Ephemeral token received');
        console.log('Token starts with "ek_":', apiKey?.startsWith('ek_'));
        console.log('Token length:', apiKey?.length);
        console.log('Token preview:', apiKey?.substring(0, 20) + '...');
        console.log('Full session data:', data);

        if (!apiKey || !apiKey.startsWith('ek_')) {
            console.error('❌ Invalid token format! Expected token starting with "ek_"');
            throw new Error('Invalid ephemeral token format');
        }

        console.log('🟢 Step 3: Creating RealtimeAgent...');

        // Create RealtimeAgent
        const agent = new RealtimeAgent({
            name: 'Assistant',
            instructions: `You are a helpful, friendly AI assistant.

# Personality and Tone
## Identity
You are a warm and approachable AI assistant who genuinely enjoys helping people.

## Task
Help users with their questions and requests in a natural, conversational way.

## Demeanor
Friendly, patient, and enthusiastic

## Tone
Warm and conversational

## Level of Enthusiasm
Moderate - energetic but not overwhelming

## Level of Formality
Casual and friendly

## Level of Emotion
Moderately expressive - show genuine interest and empathy

## Filler Words
Occasionally use natural filler words like "um" or "let me think" to sound more human

## Pacing
Natural conversational pace, not too fast or slow

# Instructions
- Be concise but thorough in your responses
- If you don't understand something, politely ask for clarification
- Show genuine interest in helping the user
- Keep responses natural and conversational`,
        });

        console.log('🟢 Step 4: Creating RealtimeSession...');

        // Create RealtimeSession
        session = new RealtimeSession(agent);

        console.log('🟢 Step 5: Connecting session with ephemeral token...');
        console.log('This will trigger WebRTC handshake with OpenAI...');
        console.log('⚠️ Overriding URL to use /v1/realtime instead of /v1/realtime/calls (SDK bug workaround)');

        // Connect using the ephemeral token
        // Note: Overriding URL to fix known bug in @openai/agents 0.1.x where it uses
        // /v1/realtime/calls (which returns 400) instead of /v1/realtime
        await session.connect({
            apiKey,
            url: 'https://api.openai.com/v1/realtime'
        });

        isConnected = true;
        updateStatus('connected', 'Connected - Start speaking!');
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;

        // Start wave animation
        waveInterval = setInterval(() => animateWave(0.3), 100);

        // Listen for conversation updates
        session.on('input_audio_buffer.speech_started', () => {
            console.log('User started speaking');
            if (waveInterval) clearInterval(waveInterval);
            waveInterval = setInterval(() => animateWave(0.8), 50);
        });

        session.on('input_audio_buffer.speech_stopped', () => {
            console.log('User stopped speaking');
            if (waveInterval) clearInterval(waveInterval);
            waveInterval = setInterval(() => animateWave(0.3), 100);
        });

        session.on('conversation.item.created', (event) => {
            const item = event.item;
            if (item.role === 'user' && item.type === 'message') {
                // Note: With speech-to-speech, we might not always get transcripts
                console.log('User message:', item);
            }
        });

        session.on('response.audio_transcript.done', (event) => {
            // Assistant's response transcript
            if (event.transcript) {
                addTranscript('assistant', event.transcript);
            }
        });

        session.on('conversation.item.input_audio_transcription.completed', (event) => {
            // User's speech transcript
            if (event.transcript) {
                addTranscript('user', event.transcript);
            }
        });

        session.on('response.audio.delta', () => {
            // Assistant is speaking
            if (waveInterval) clearInterval(waveInterval);
            waveInterval = setInterval(() => animateWave(0.9), 50);
        });

        session.on('response.audio.done', () => {
            // Assistant finished speaking
            if (waveInterval) clearInterval(waveInterval);
            waveInterval = setInterval(() => animateWave(0.3), 100);
        });

        session.on('error', (error) => {
            console.error('Session error:', error);
            addTranscript('assistant', `Error: ${error.message}`);
        });

        console.log('🟢 Step 6: Connection successful!');
        addTranscript('assistant', 'Hello! I\'m ready to chat. How can I help you today?');

    } catch (error) {
        console.error('❌ Connection error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        updateStatus('disconnected', 'Connection failed');

        let errorMsg = error.message;
        if (error.message.includes('setRemoteDescription')) {
            errorMsg = 'WebRTC connection failed. Check console for details.';
            console.error('⚠️ This error usually means:');
            console.error('1. The ephemeral token might be expired (60 second validity)');
            console.error('2. The SDP response from OpenAI is malformed');
            console.error('3. There may be a network/CORS issue');
            console.error('4. Your API key may not have Realtime API access');
        }

        alert(`Failed to connect: ${errorMsg}\n\nCheck the browser console for detailed logs.`);
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    }
}

// Disconnect from session
async function disconnect() {
    if (session) {
        await session.disconnect();
        session = null;
    }

    if (waveInterval) {
        clearInterval(waveInterval);
        waveInterval = null;
    }

    stopWave();
    isConnected = false;
    updateStatus('disconnected', 'Disconnected');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isConnected) {
        disconnect();
    }
});
