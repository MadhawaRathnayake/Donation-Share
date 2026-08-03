import { describe, expect, it } from 'vitest';
import { classNames, roleHome } from './format';

describe('navigation utilities', () => {
  it.each([
    [['Admin'], '/admin'],
    [['Donor'], '/donor'],
    [['Recipient'], '/recipient'],
    [['Volunteer'], '/volunteer'],
    [[], '/onboarding'],
  ])('maps roles to the correct workspace', (roles, expected) => {
    expect(roleHome(roles)).toBe(expected);
  });

  it('joins only active class names', () => {
    expect(classNames('base', false, undefined, 'active')).toBe('base active');
  });
});
