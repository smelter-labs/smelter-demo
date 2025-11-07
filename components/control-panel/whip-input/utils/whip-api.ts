import { getWHIP_URL } from '@/app/actions/actions';

export async function sendWhipOfferLocal(
  inputId: string,
  bearerToken: string,
  sdp: string,
): Promise<{ answer: string; location: string | null }> {
  const WHIP_URL = await getWHIP_URL();
  const res = await fetch(`${WHIP_URL}/whip/${inputId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/sdp',
      authorization: `Bearer ${bearerToken}`,
    },
    body: sdp,
    cache: 'no-store',
  });
  const answer = await res.text();
  if (!res.ok) throw new Error(`WHIP ${res.status}: ${answer}`);
  return { answer, location: res.headers.get('Location') };
}
