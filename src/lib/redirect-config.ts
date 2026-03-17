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
  const legacyMatch = /^sm-([es])([1-4])$/i.exec(slug);
  if (legacyMatch) {
    const channelCode = legacyMatch[1]?.toLowerCase();
    const touchpoint = Number(legacyMatch[2]) as 1 | 2 | 3 | 4;

    return {
      slug,
      channel: channelCode === 'e' ? 'email' : 'sms',
      touchpoint,
      client_code: 'safford_mazda'
    };
  }

  const campaignMatch = /^sfrd-[a-z0-9-]+-([1-4])$/i.exec(slug);
  if (campaignMatch) {
    const touchpoint = Number(campaignMatch[1]) as 1 | 2 | 3 | 4;
    return {
      slug,
      // Campaign slugs do not encode channel; route can override from query string.
      channel: 'email',
      touchpoint,
      client_code: 'safford_mazda'
    };
  }

  return null;
}
