export type Channel = 'email' | 'sms';

export const DESTINATION_URLS: Record<Channel, string> = {
  email: 'https://www.saffordmazdaalexandria.com/service/schedule-service/?utm_source=SonaLift&utm_medium=Email&utm_campaign=Service',
  sms: 'https://www.saffordmazdaalexandria.com/service/schedule-service/?utm_source=SonaLift&utm_medium=SMS&utm_campaign=Service',
};
export const SUPPORTED_SLUGS = [
  'sm-e1',
  'sm-e2',
  'sm-e3',
  'sm-e4',
  'sm-s1',
  'sm-s2',
  'sm-s3',
  'sm-s4'
] as const;

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
