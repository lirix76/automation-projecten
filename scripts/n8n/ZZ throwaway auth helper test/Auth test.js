// n8n-workflow: ZZ throwaway auth helper test
// n8n-node: Auth test

// Throwaway: verify httpRequestWithAuthentication resolves the Google Drive OAuth2 credential.
try {
  const res = await this.helpers.httpRequestWithAuthentication.call(this, 'googleDriveOAuth2Api', {
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/about',
    qs: { fields: 'user' },
    json: true,
  });
  return [{ json: { ok: true, authedAs: res.user } }];
} catch (e) {
  return [{ json: { ok: false, error: e.message, status: e.httpCode || e.statusCode || null } }];
}
