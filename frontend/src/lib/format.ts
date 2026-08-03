export const formatDateTime = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

export const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

export const roleHome = (roles: string[]) => {
  if (roles.includes('Admin')) return '/admin';
  if (roles.includes('Donor')) return '/donor';
  if (roles.includes('Recipient')) return '/recipient';
  if (roles.includes('Volunteer')) return '/volunteer';
  return '/onboarding';
};

export const classNames = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');
