import { expect, test, describe, vi } from 'vitest';
import { researchFetch, SourcePolicy } from '../../src/lib/intelligence/research-client';

describe('ResearchHttpClient Routing Logic', () => {
  test('strictly prevents Tor for forbidden domains (Twilio API)', async () => {
    // We expect it to fallback to DIRECT or throw. The implementation currently says it falls back to DIRECT.
    // However, if we mock fetch, we can check the 'dispatcher'.
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = fetchMock;

    const policy: SourcePolicy = {
      source: 'api.twilio.com',
      tor_allowed: true, // Malicious configuration attempting to force Tor
      direct_allowed: true,
      requires_manual_review: false,
      captcha_detected: false,
    };

    await researchFetch('https://api.twilio.com/v1/Messages', undefined, { sourcePolicy: policy });

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[1]?.dispatcher).toBeUndefined(); // Should NOT use Tor agent
  });

  test('uses Tor for public domains if policy allows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = fetchMock;

    const policy: SourcePolicy = {
      source: 'example.com',
      tor_allowed: true,
      direct_allowed: false,
      requires_manual_review: false,
      captcha_detected: false,
    };

    await researchFetch('https://example.com', undefined, { sourcePolicy: policy });

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[1]?.dispatcher).toBeDefined(); // Should use Tor agent
  });

  test('blocks if policy requires manual review', async () => {
    const policy: SourcePolicy = {
      source: 'example.com',
      tor_allowed: true,
      direct_allowed: true,
      requires_manual_review: true,
      captcha_detected: false,
    };

    await expect(researchFetch('https://example.com', undefined, { sourcePolicy: policy }))
      .rejects
      .toThrow('blocked by source policy');
  });

  test('blocks if captcha detected', async () => {
    const policy: SourcePolicy = {
      source: 'example.com',
      tor_allowed: true,
      direct_allowed: true,
      requires_manual_review: false,
      captcha_detected: true,
    };

    await expect(researchFetch('https://example.com', undefined, { sourcePolicy: policy }))
      .rejects
      .toThrow('blocked by source policy');
  });
});
