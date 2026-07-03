export const FOUNDING_PAYOUT = {
  end: '2025-10-25',
  label: 'Feb 2023 – Oct 2025',
  payout: 1579.45,
};

export const DEFAULT_PAYOUTS = [
  { end: '2025-11-08', label: 'Oct 25 – Nov 8, 2025', payout: 964.15 },
  { end: '2025-11-22', label: 'Nov 8 – Nov 22, 2025', payout: 310.02 },
  { end: '2025-12-06', label: 'Nov 22 – Dec 6, 2025', payout: 87.21 },
  { end: '2025-12-20', label: 'Dec 6 – Dec 20, 2025', payout: 285.55 },
  { end: '2026-01-03', label: 'Dec 20 – Jan 3, 2026', payout: 487.86 },
  { end: '2026-01-17', label: 'Jan 3 – Jan 17, 2026', payout: 305.21 },
  { end: '2026-01-31', label: 'Jan 17 – Jan 31, 2026', payout: 68.85 },
  { end: '2026-02-14', label: 'Jan 31 – Feb 14, 2026', payout: 147.19 },
  { end: '2026-02-28', label: 'Feb 14 – Feb 28, 2026', payout: 400.2 },
  { end: '2026-03-14', label: 'Feb 28 – Mar 14, 2026', payout: 61.39 },
  { end: '2026-03-28', label: 'Mar 14 – Mar 28, 2026', payout: 129.32 },
  { end: '2026-04-11', label: 'Mar 28 – Apr 11, 2026', payout: 108.84 },
  { end: '2026-04-25', label: 'Apr 11 – Apr 25, 2026', payout: 526.38 },
  { end: '2026-05-09', label: 'Apr 25 – May 9, 2026', payout: 327.99 },
  { end: '2026-05-23', label: 'May 9 – May 23, 2026', payout: 433.71 },
  { end: '2026-06-06', label: 'May 23 – Jun 6, 2026', payout: 459.17 },
  { end: '2026-06-20', label: 'Jun 6 – Jun 20, 2026', payout: 745.97 },
];

export function allPayouts(extra) {
  const list = Array.isArray(extra) && extra.length ? extra : DEFAULT_PAYOUTS;
  return [FOUNDING_PAYOUT, ...list];
}
