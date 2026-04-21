const BASE_URL = 'http://localhost:3000';

async function trpcMutation(proc, input, cookie) {
  const res = await fetch(`${BASE_URL}/api/trpc/${proc}?batch=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({ 0: { json: input } }),
  });
  const data = await res.json();
  return { status: res.status, data: data?.[0] };
}

async function trpcQuery(proc, input, cookie) {
  const url = `${BASE_URL}/api/trpc/${proc}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input } }))}`;
  const res = await fetch(url, {
    headers: { Cookie: cookie || '' },
  });
  const data = await res.json();
  return { status: res.status, data: data?.[0] };
}

async function main() {
  // Login
  const loginRes = await fetch(`${BASE_URL}/api/trpc/auth.login?batch=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 0: { json: { email: 'marcus.williams@demo.aiq.com', password: 'password', tenantSlug: 'demo' } } }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login:', cookie ? 'OK' : 'FAILED');

  // Start session
  const startRes = await trpcMutation('assessment.startSession', { blueprintId: 'bp-aiq-v9-standard', roleHint: 'talent-acquisition-specialist' }, cookie);
  const sessionId = startRes.data?.result?.data?.json?.sessionId;
  console.log('Session ID:', sessionId);
  console.log('Start response keys:', Object.keys(startRes.data?.result?.data?.json || {}));

  // Get session
  const sessionRes = await trpcQuery('assessment.getSession', { sessionId }, cookie);
  const sessionData = sessionRes.data?.result?.data?.json;
  console.log('Session data keys:', Object.keys(sessionData || {}));
  console.log('Current item type:', typeof sessionData?.currentItem);
  console.log('Current item:', JSON.stringify(sessionData?.currentItem)?.substring(0, 300));

  // Test invalid blueprint - should fail
  const invalidRes = await trpcMutation('assessment.startSession', { blueprintId: 'invalid-blueprint-xyz' }, cookie);
  const errorMsg = invalidRes.data?.error?.json?.message;
  const successData = invalidRes.data?.result?.data?.json;
  console.log('Invalid blueprint error:', errorMsg);
  console.log('Invalid blueprint success:', JSON.stringify(successData)?.substring(0, 200));
}

main().catch(e => console.error('Error:', e.message));
