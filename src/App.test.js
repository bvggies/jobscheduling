import { PRIORITIES } from './utils/constants';

test('constants load', () => {
  expect(PRIORITIES).toContain('Medium');
});
