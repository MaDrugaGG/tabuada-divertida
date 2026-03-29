export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Test endpoint para verificar API key
    if (url.pathname === '/test') {
      const apiKey = env.ELEVENLABS_API_KEY || '';
      return new Response(JSON.stringify({ 
        hasKey: !!apiKey, 
        keyLength: apiKey.length,
        keyPreview: apiKey ? apiKey.substring(0, 5) + '...' : 'none'
      }), { headers: { ...cors, 'content-type': 'application/json' } });
    }

    if (url.pathname !== '/tts') {
      return new Response('not_found', { status: 404, headers: cors });
    }

    try {
      const apiKey = env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'no_api_key' }), { 
          status: 500, headers: { ...cors, 'content-type': 'application/json' }
        });
      }

      const body = await request.json().catch(() => ({}));
      const text = String(body.text || '').trim();
      
      if (!text) {
        return new Response(JSON.stringify({ error: 'no_text' }), { 
          status: 400, headers: { ...cors, 'content-type': 'application/json' }
        });
      }

      const voiceId = env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';
      
      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'accept': 'audio/mpeg',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
      });

      if (!elevenRes.ok) {
        const errorText = await elevenRes.text().catch(() => 'unknown');
        return new Response(JSON.stringify({ 
          error: 'elevenlabs_error', 
          status: elevenRes.status,
          details: errorText
        }), { status: 502, headers: { ...cors, 'content-type': 'application/json' } });
      }

      const audio = await elevenRes.arrayBuffer();
      return new Response(audio, {
        headers: { ...cors, 'content-type': 'audio/mpeg' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'exception', message: e.message 
      }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
    }
  },
};

function pickVoiceId(voices) {
  try {
    if (!Array.isArray(voices) || voices.length === 0) return '';

    // Score voices: prefer labels that indicate young/child/bright, prefer female, avoid narration.
    const scored = voices.map(v => {
      const name = String(v && v.name ? v.name : '').toLowerCase();
      const cat = String(v && v.category ? v.category : '').toLowerCase();
      const labels = (v && v.labels && typeof v.labels === 'object') ? v.labels : {};
      const labelStr = JSON.stringify(labels).toLowerCase();
      let score = 0;

      if (labelStr.includes('child') || labelStr.includes('kid') || labelStr.includes('young')) score += 6;
      if (labelStr.includes('bright') || labelStr.includes('cute') || labelStr.includes('cheer')) score += 3;
      if (labelStr.includes('female') || labelStr.includes('girl')) score += 2;
      if (cat.includes('convers')) score += 1;
      if (cat.includes('narr')) score -= 1;
      if (name.includes('child') || name.includes('kid') || name.includes('young')) score += 4;
      if (name.includes('girl')) score += 2;
      if (name.includes('old') || name.includes('deep')) score -= 2;
      return { id: String(v && v.voice_id ? v.voice_id : ''), score };
    }).filter(x => !!x.id);

    scored.sort((a, b) => b.score - a.score);
    return scored[0] ? scored[0].id : '';
  } catch (e) {
    return '';
  }
}
