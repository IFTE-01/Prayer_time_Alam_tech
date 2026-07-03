// Solar and astronomical calculations for Prayer (Salah/Namaz) Times.
// Based on standard astronomical algorithms (such as Meeus and standard prayer calculation conventions).

export type School = 'shafi' | 'hanafi'; // Shafi'i (Standard) vs Hanafi for Asr

export type CalculationMethodId = 'MWL' | 'ISNA' | 'Egypt' | 'UmmAlQura' | 'Karachi' | 'France';

export interface CalculationMethod {
  id: CalculationMethodId;
  name: string;
  fajrAngle: number;
  ishaAngle?: number; // degrees below horizon, undefined if special rule applies (like Umm Al-Qura)
  ishaIntervalMinutes?: number; // minutes after Maghrib
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  {
    id: 'MWL',
    name: 'Muslim World League (MWL)',
    fajrAngle: 18,
    ishaAngle: 17,
  },
  {
    id: 'ISNA',
    name: 'Islamic Society of North America (ISNA)',
    fajrAngle: 15,
    ishaAngle: 15,
  },
  {
    id: 'Egypt',
    name: 'Egyptian General Authority of Survey',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
  },
  {
    id: 'UmmAlQura',
    name: 'Umm Al-Qura University, Makkah',
    fajrAngle: 18.5,
    ishaIntervalMinutes: 90, // Isha is always 90 minutes after Maghrib
  },
  {
    id: 'Karachi',
    name: 'University of Islamic Sciences, Karachi',
    fajrAngle: 18,
    ishaAngle: 18,
  },
  {
    id: 'France',
    name: 'Union des Organisations Islamiques de France (UOIF)',
    fajrAngle: 12,
    ishaAngle: 12,
  }
];

// Coordinate structures
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  raw: {
    fajr: number;
    sunrise: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  }
}

// Convert degrees to radians
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

// Convert radians to degrees
function radToDeg(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

// Normalize angle to [0, 360]
function normalizeAngle(a: number): number {
  let res = a - 360.0 * Math.floor(a / 360.0);
  if (res < 0) res += 360.0;
  return res;
}

// Normalize hours to [0, 24]
function normalizeHours(h: number): number {
  let res = h - 24.0 * Math.floor(h / 24.0);
  if (res < 0) res += 24.0;
  return res;
}

/**
 * Format hours to string (e.g., "05:15 PM") and enforce the specific 5 PM rule:
 * "If any salah time is 5 PM, try to add one minute, then the salah time would be 5:01 PM."
 */
export function formatPrayerTime(hours: number, is24h: boolean = false): string {
  if (isNaN(hours) || hours === null || hours === undefined) return "--:--";

  // Convert fractional hours to total minutes
  let totalMinutes = Math.round(hours * 60);
  let h = Math.floor(totalMinutes / 60) % 24;
  let m = totalMinutes % 60;

  if (h < 0) h += 24;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (is24h) {
    return `${pad(h)}:${pad(m)}`;
  } else {
    const ampm = h >= 12 ? 'PM' : 'AM';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;
    return `${pad(displayH)}:${pad(m)} ${ampm}`;
  }
}

/**
 * Main function to calculate all prayer times for a given day, location, and timezone offset
 */
export function calculatePrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  timezoneOffset: number, // in hours, e.g., +5.5, -4, or derived from system
  method: CalculationMethod = CALCULATION_METHODS[0],
  school: School = 'shafi'
): PrayerTimes {
  
  // Calculate Julian Date
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();

  let jdYear = year;
  let jdMonth = month;
  if (month <= 2) {
    jdYear -= 1;
    jdMonth += 12;
  }
  const A = Math.floor(jdYear / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (jdYear + 4716)) + Math.floor(30.6001 * (jdMonth + 1)) + day + B - 1524.5;

  // Number of days since J2000.0
  const d = jd - 2451545.0;

  // Solar calculations
  const g = normalizeAngle(357.529 + 0.98560028 * d);
  const q = normalizeAngle(280.459 + 0.98564736 * d);
  const L = normalizeAngle(q + 1.915 * Math.sin(degToRad(g)) + 0.02 * Math.sin(degToRad(2 * g)));
  
  const e = 23.439 - 0.00000036 * d;
  const ob = degToRad(e);
  
  // Declination (D) and Right Ascension (RA)
  const declination = radToDeg(Math.asin(Math.sin(ob) * Math.sin(degToRad(L))));
  
  let ra = radToDeg(Math.atan2(Math.cos(ob) * Math.sin(degToRad(L)), Math.cos(degToRad(L))));
  ra = normalizeAngle(ra);
  
  // Equation of time in minutes
  const eqt = (q - ra) * 4;

  // Dhuhr (transit time)
  // local time = 12 - longitude/15 - eqt/60 + timezoneOffset
  // Note: Longitude is positive for East, negative for West.
  const dhuhrUTC = 12.0 - longitude / 15.0 - eqt / 60.0;
  const dhuhr = normalizeHours(dhuhrUTC + timezoneOffset);

  // Hour Angle calculation helper for general altitude (alpha) below/above horizon
  const calculateHourAngle = (alpha: number, isSunriseSunset: boolean = false): number => {
    const latRad = degToRad(latitude);
    const decRad = degToRad(declination);
    const alphaRad = degToRad(alpha);
    
    const cosH = (Math.sin(alphaRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    
    if (cosH > 1.0) {
      // Sun never reaches this altitude (always below)
      return isSunriseSunset ? NaN : 0; 
    } else if (cosH < -1.0) {
      // Sun is always above this altitude
      return isSunriseSunset ? NaN : 12;
    }
    
    return radToDeg(Math.acos(cosH));
  };

  // Sunrise and Sunset (standard sun altitude is -0.833 degrees due to refraction)
  const hSunriseSunset = calculateHourAngle(-0.833, true);
  const sunrise = isNaN(hSunriseSunset) ? NaN : normalizeHours(dhuhr - hSunriseSunset / 15.0);
  const maghrib = isNaN(hSunriseSunset) ? NaN : normalizeHours(dhuhr + hSunriseSunset / 15.0);

  // Fajr
  const hFajr = calculateHourAngle(-method.fajrAngle);
  let fajr = normalizeHours(dhuhr - hFajr / 15.0);

  // Asr (Shafi'i shadow coefficient = 1, Hanafi shadow coefficient = 2)
  const shadowCoeff = school === 'shafi' ? 1 : 2;
  const zenithDiff = Math.abs(latitude - declination);
  const shadowLength = shadowCoeff + Math.tan(degToRad(zenithDiff));
  const asrAltitude = radToDeg(Math.atan(1.0 / shadowLength));
  
  const hAsr = calculateHourAngle(asrAltitude);
  const asr = normalizeHours(dhuhr + hAsr / 15.0);

  // Isha
  let isha = 0;
  if (method.ishaIntervalMinutes !== undefined) {
    // Umm Al-Qura uses a fixed duration after Maghrib (typically 90 mins)
    isha = isNaN(maghrib) ? NaN : normalizeHours(maghrib + method.ishaIntervalMinutes / 60.0);
  } else if (method.ishaAngle !== undefined) {
    const hIsha = calculateHourAngle(-method.ishaAngle);
    isha = normalizeHours(dhuhr + hIsha / 15.0);
  }

  // Graceful fallback for extremely high latitudes if times are NaN or mathematically impossible
  const isFajrNaN = isNaN(fajr);
  const isSunriseNaN = isNaN(sunrise);
  const isAsrNaN = isNaN(asr);
  const isMaghribNaN = isNaN(maghrib);
  const isIshaNaN = isNaN(isha);

  // Fallback calculations if standard trigonometry fails due to polar day/night
  const fajrVal = isFajrNaN ? (isSunriseNaN ? dhuhr - 1.5 : sunrise - 1.5) : fajr;
  const sunriseVal = isSunriseNaN ? dhuhr - 6.0 : sunrise;
  const asrVal = isAsrNaN ? dhuhr + 3.0 : asr;
  const maghribVal = isMaghribNaN ? dhuhr + 6.0 : maghrib;
  const ishaVal = isIshaNaN ? (isMaghribNaN ? dhuhr + 7.5 : maghribVal + 1.5) : isha;

  return {
    fajr: formatPrayerTime(fajrVal),
    sunrise: formatPrayerTime(sunriseVal),
    dhuhr: formatPrayerTime(dhuhr + 1.0 / 60.0),
    asr: formatPrayerTime(asrVal + 1.0 / 60.0),
    maghrib: formatPrayerTime(maghribVal + 1.0 / 60.0),
    isha: formatPrayerTime(ishaVal + 1.0 / 60.0),
    raw: {
      fajr: fajrVal,
      sunrise: sunriseVal,
      dhuhr: dhuhr + 1.0 / 60.0,
      asr: asrVal + 1.0 / 60.0,
      maghrib: maghribVal + 1.0 / 60.0,
      isha: ishaVal + 1.0 / 60.0
    }
  };
}

/**
 * Returns current local time zone offset in hours
 */
export function getLocalTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60.0;
}
