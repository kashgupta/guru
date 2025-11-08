import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// API endpoint to create ephemeral token
app.get('/api/session', async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;

        console.log('📥 Received session token request');

        if (!apiKey) {
            console.error('❌ OPENAI_API_KEY not configured');
            return res.status(500).json({
                error: 'OPENAI_API_KEY not configured. Please set it in your .env file.'
            });
        }

        console.log('🔑 API key found, creating ephemeral session...');

        // Create ephemeral token for WebRTC
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-realtime-preview-2024-12-17',
                voice: 'verse',
                // Enable input audio transcription
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                // Configure turn detection
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ OpenAI API error:', JSON.stringify(error, null, 2));
            console.error('Status:', response.status);
            console.error('Status text:', response.statusText);
            return res.status(response.status).json({
                error: error.error?.message || 'Failed to create session',
                details: error
            });
        }

        const data = await response.json();

        console.log('✅ Ephemeral session created successfully');
        console.log('Session ID:', data.id);
        console.log('Model:', data.model);
        console.log('Expires at:', data.client_secret?.expires_at);
        console.log('Token preview:', data.client_secret?.value?.substring(0, 20) + '...');

        // Validate token format
        if (!data.client_secret?.value?.startsWith('ek_')) {
            console.error('❌ WARNING: Token does not start with "ek_"');
            console.error('Token value:', data.client_secret?.value);
        }

        // Return the client secret for WebRTC connection
        // Using both naming conventions for compatibility
        res.json({
            apiKey: data.client_secret.value,
            client_secret: data.client_secret.value,
            session: {
                id: data.id,
                model: data.model,
                expires_at: data.client_secret.expires_at
            }
        });

    } catch (error) {
        console.error('❌ Session creation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n🚀 API Server running on port ${PORT}`);
    console.log(`💡 Make sure Vite dev server is also running (npm run dev)`);
    console.log(`📍 Access the app at: http://localhost:5173\n`);
});
