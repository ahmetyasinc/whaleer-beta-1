import jwtDecode from 'jwt-decode';
import dayjs from 'dayjs';

export function getJwtExpiry(token) {
  try {
    const { exp } = jwtDecode(token); // seconds
    return exp ? dayjs.unix(exp) : null;
  } catch (e) {
    return null;
  }
}

export function isExpired(token, skewSec = 15) {
  const expAt = getJwtExpiry(token);
  if (!expAt) return true;
  return dayjs().add(skewSec, 'second').isAfter(expAt);
}
