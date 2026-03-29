export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    try {
      // Debug: log environment variables (without exposing secrets)
      const apiKey = env.ELEVENLABS_API_KEY || '';
      console.log('Environment check:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length,
        voiceId: env.ELEVENLABS_VOICE_ID,
        hasToken: !!env.APP_TTS_TOKEN
      });

      if (!apiKey) {
        console.error('Missing ElevenLabs API key');
        return new Response(JSON.stringify({ error: 'missing_elevenlabs_api_key', debug: { hasApiKey: !!apiKey, apiKeyLength: apiKey.length } }), { 
          status: 500, 
          headers: { ...corsHeaders(request), 'content-type': 'application/json' }
        });
      }

      if (url.pathname === '/voices') {
        if (request.method !== 'GET') {
          return new Response('method_not_allowed', { status: 405, headers: corsHeaders(request) });
        }

        const elevenRes = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
            'accept': 'application/json',
          },
        });

        if (!elevenRes.ok) {
          const msg = await safeText(elevenRes);
          return json(request, {
            error: 'elevenlabs_error',
            status: elevenRes.status,
            details: msg,
          }, 502);
        }

        const data = await elevenRes.json().catch(() => null);
        const voices = (data && data.voices && Array.isArray(data.voices)) ? data.voices : [];
        const simplified = voices.map(v => ({
          name: v && v.name ? v.name : '',
          voice_id: v && v.voice_id ? v.voice_id : '',
          category: v && v.category ? v.category : '',
          labels: v && v.labels ? v.labels : undefined,
          preview_url: v && v.preview_url ? v.preview_url : undefined,
        }));
        return json(request, { voices: simplified }, 200);
      }

      if (url.pathname !== '/tts') {
        return new Response('not_found', { status: 404, headers: corsHeaders(request) });
      }

      if (request.method !== 'POST') {
        return new Response('method_not_allowed', { status: 405, headers: corsHeaders(request) });
      }

      let voiceId = (env.ELEVENLABS_VOICE_ID || '').trim();
      if (!voiceId) {
        // Auto-pick a "childlike" voice if not configured.
        // This avoids forcing the user to find voice_id manually.
        voiceId = await getCachedOrPickVoiceId(env);
        if (!voiceId) {
          return new Response('missing_voice_id', { status: 500, headers: corsHeaders(request) });
        }
      }

      const body = await request.json().catch(() => null);
      const text = String(body && body.text ? body.text : '').trim();
      if (!text) {
        return new Response(JSON.stringify({ error: 'missing_text' }), {
          status: 400,
          headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' },
        });
      }

      if (text.length > 360) {
        return new Response(JSON.stringify({ error: 'text_too_long' }), {
          status: 413,
          headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' },
        });
      }

      const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
      const elevenRes = await fetch(elevenUrl, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'accept': 'audio/mpeg',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.42,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      });

      if (!elevenRes.ok) {
        const msg = await safeText(elevenRes);
        return new Response(JSON.stringify({ error: 'elevenlabs_error', status: elevenRes.status, details: msg }), {
          status: 502,
          headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' },
        });
      }

      const audio = await elevenRes.arrayBuffer();
      return new Response(audio, {
        status: 200,
        headers: {
          ...corsHeaders(request),
          'content-type': 'audio/mpeg',
          'cache-control': 'no-store',
        },
      });
    } catch (e) {
      return json(request, { error: 'server_error' }, 500);
    }
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-tts-token',
    'access-control-max-age': '86400',
  };
}

function json(request, obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' },
  });
}

async function safeText(res) {
  try {
    return await res.text();
  } catch (_) {
    return '';
  }
}

let __cachedVoiceId = '';
let __cachedVoiceAt = 0;
async function getCachedOrPickVoiceId(env) {
  try {
    const now = Date.now();
    if (__cachedVoiceId && (now - __cachedVoiceAt) < 24 * 60 * 60 * 1000) return __cachedVoiceId;

    const vRes = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'accept': 'application/json',
      },
    });

    if (!vRes.ok) return '';
    const data = await vRes.json().catch(() => null);
    const voices = (data && data.voices && Array.isArray(data.voices)) ? data.voices : [];
    const picked = pickVoiceId(voices);
    if (picked) {
      __cachedVoiceId = picked;
      __cachedVoiceAt = now;
    }
    return picked;
  } catch (e) {
    return '';
  }
}

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
