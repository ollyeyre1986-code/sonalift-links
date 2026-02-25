export const DESTINATION_URL = 'https://www.saffordmazda.com';
export const CAMPAIGN_NAME = 'safford-mazda-reactivation';

export type Channel = 'email' | 'sms';

export type ParsedSlug = {
  slug: string;
  channel: Channel;
  touchpoint: 1 | 2 | 3 | 4;
  client_code: 'safford_mazda';
};

export function parseRedirectSlug(slug: string): ParsedSlug | null {
  const match = /^sm-([es])([1-4])$/.exec(slug);
  if (!match) {
    return null;
  }

  const channelCode = match[1];
  const touchpoint = Number(match[2]) as 1 | 2 | 3 | 4;

  return {
    slug,
    channel: channelCode === 'e' ? 'email' : 'sms',
    touchpoint,
    client_code: 'safford_mazda'
  };
}
