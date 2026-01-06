/**
 * ProgrammeSelector
 * Shared types and utilities for programme filtering
 */

export type ProgrammeFilter = 'all' | 'language_connect' | 'mentors_ukraine';

export const PROGRAMME_FILTERS: { value: ProgrammeFilter; label: string }[] = [
  { value: 'all', label: 'All Programmes' },
  { value: 'language_connect', label: 'Language Connect for Ukraine' },
  { value: 'mentors_ukraine', label: 'Mentors for Ukraine' },
];

export function getProgrammeLabel(filter: ProgrammeFilter): string {
  return PROGRAMME_FILTERS.find((f) => f.value === filter)?.label || filter;
}
