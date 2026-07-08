/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Sunrise, MapPin, Navigation, Settings, HelpCircle, 
  Calendar, Clock, ShieldCheck, Compass, Info, Check, RefreshCw,
  Copy, Download
} from 'lucide-react';

import { 
  calculatePrayerTimes, 
  CALCULATION_METHODS, 
  getLocalTimezoneOffset, 
  formatPrayerTime,
  PrayerTimes,
  CalculationMethod,
  School
} from './utils/prayerCalc';
import HadithSection from './components/HadithSection';
import AppLogo from './components/AppLogo';

// English to Bangla helper variables
const EN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function translateToBanglaDigits(str: string | number): string {
  const input = String(str);
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const index = EN_DIGITS.indexOf(char);
    if (index !== -1) {
      result += BN_DIGITS[index];
    } else {
      result += char;
    }
  }
  return result;
}

function translateToBanglaText(str: string): string {
  let translated = str;
  
  // General mappings
  const mappings: { [key: string]: string } = {
    "Fajr": "ফজর",
    "Dhuhr": "যোহর",
    "Asr": "আসর",
    "Maghrib": "মাগরিব",
    "Isha": "এশা",
    "Sunrise": "সূর্যোদয়",
    "Sunset": "সূর্যাস্ত",
    "Makkah, SA (Standard Fallback)": "মক্কা, সৌদি আরব (ডিফল্ট)",
    "My GPS Location": "আমার জিপিএস অবস্থান",
    "Pref:": "পছন্দনীয়:",
    "Nec:": "সর্বশেষ:",
    "(Midnight)": "(অর্ধরাত্রি)",
    "Muharram": "মুহররম",
    "Safar": "সফর",
    "Rabi' al-Awwal": "রবিউল আউয়াল",
    "Rabi' al-Thani": "রবিউস সানি",
    "Jumada al-Awwal": "জুমাদাল আউয়াল",
    "Jumada al-Thani": "জুমাদাস সানি",
    "Rajab": "রজব",
    "Sha'ban": "শাবান",
    "Ramadan": "রমজান",
    "Shawwal": "শাওয়াল",
    "Dhu al-Qi'dah": "জিলকদ",
    "Dhu al-Hijjah": "জিলহজ্জ",
    "AH": "হিজরি"
  };

  // Replace substrings
  for (const [en, bn] of Object.entries(mappings)) {
    const escapedEn = en.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedEn, 'g');
    translated = translated.replace(regex, bn);
  }

  return translated;
}

function getEstimatedHijriDate(date: Date): string {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const l = Math.floor(jd - 1948440 + 10632);
  const n = Math.floor((l - 1) / 10631);
  const l_adj = l - 10631 * n + 354;
  const j = Math.floor((10985 - l_adj) / 5316) * Math.floor((50 * l_adj) / 17719) + Math.floor(l_adj / 5670) * Math.floor((43 * l_adj) / 15238);
  const l_final = l_adj - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  
  const m = Math.floor((24 * l_final) / 709);
  const d = l_final - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;

  const months = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];
  
  const rawDateStr = `${translateToBanglaDigits(d)} ${months[m - 1]} ${translateToBanglaDigits(y)} AH`;
  return translateToBanglaText(rawDateStr);
}

function estimateLocationFromCoords(lat: number, lon: number): { city: string, country: string } {
  // Bangladesh coordinate bounds approx: Lat [20.6, 26.6], Lon [88.0, 92.7]
  if (lat >= 20.0 && lat <= 27.0 && lon >= 87.0 && lon <= 93.0) {
    if (lat >= 21.0 && lat <= 23.0 && lon >= 91.0 && lon <= 93.0) {
      return { city: "Chittagong", country: "Bangladesh" };
    }
    return { city: "Dhaka", country: "Bangladesh" };
  }
  // Russia coordinate bounds approx: Lat [41.0, 82.0], Lon [19.0, 180.0]
  if (lat >= 41.0 && lat <= 82.0 && lon >= 19.0 && lon <= 180.0) {
    return { city: "Moscow", country: "Russia" };
  }
  // Saudi Arabia / Makkah / Riyadh
  if (lat >= 15.0 && lat <= 32.0 && lon >= 34.0 && lon <= 56.0) {
    if (lat >= 21.0 && lat <= 22.0 && lon >= 39.0 && lon <= 40.5) {
      return { city: "Makkah", country: "Saudi Arabia" };
    }
    return { city: "Riyadh", country: "Saudi Arabia" };
  }
  return { city: `Region (${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E)`, country: "Local Area" };
}

export default function App() {
  // Theme state permanently locked to dark as requested (no toggler logo)
  const theme = 'dark';

  // Location variables
  const [latitude, setLatitude] = useState<number>(21.3891); // Default Makkah
  const [longitude, setLongitude] = useState<number>(39.8579);
  const [timezoneOffset, setTimezoneOffset] = useState<number>(3.0); // Default Makkah is UTC+3
  const [cityName, setCityName] = useState<string>("Makkah");
  const [countryName, setCountryName] = useState<string>("Saudi Arabia");
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'detecting' | 'granted' | 'denied' | 'error'>('prompt');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(false);

  // Settings variables (Using Standard Calculation method)
  const selectedMethod = CALCULATION_METHODS[0]; // MWL (Muslim World League)
  const selectedSchool: School = 'shafi'; // Standard (1x shadow) Shafi'i/Maliki/Hanbali/Salafi
  const is24h = false;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Real-time clock
  const [clockTime, setClockTime] = useState<Date>(new Date());

  // GPS request function
  const requestGPSLocation = () => {
    setLocationStatus('detecting');
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);
        
        // Dynamic client timezone offset in hours
        const offset = getLocalTimezoneOffset();
        setTimezoneOffset(offset);

        setLocationStatus('granted');
        setIsAppUnlocked(true);

        // Fetch city/country from backend first
        fetch(`/api/geocode?lat=${lat}&lon=${lon}`)
          .then(res => res.json())
          .then(data => {
            if (data.city && data.country) {
              setCityName(data.city);
              setCountryName(data.country);
            } else {
              // Try client-side direct request to BigDataCloud reverse-geocode API
              fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
                .then(r => r.json())
                .then(bdc => {
                  const city = bdc.city || bdc.locality || bdc.principalSubdivision || "";
                  const country = bdc.countryName || "";
                  if (city && country) {
                    setCityName(city);
                    setCountryName(country);
                  } else {
                    throw new Error("No city/country found");
                  }
                })
                .catch(() => {
                  // Coordinate-based estimation fallback
                  const est = estimateLocationFromCoords(lat, lon);
                  setCityName(est.city);
                  setCountryName(est.country);
                });
            }
          })
          .catch(err => {
            console.warn("Geocoding backend error, trying direct BigDataCloud client API:", err);
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
              .then(r => r.json())
              .then(bdc => {
                const city = bdc.city || bdc.locality || bdc.principalSubdivision || "";
                const country = bdc.countryName || "";
                if (city && country) {
                  setCityName(city);
                  setCountryName(country);
                } else {
                  throw new Error("No city/country found");
                }
              })
              .catch(() => {
                // Coordinate-based estimation fallback
                const est = estimateLocationFromCoords(lat, lon);
                setCityName(est.city);
                setCountryName(est.country);
              });
          });
      },
      (error) => {
        console.warn("GPS Error code:", error.code, "message:", error.message);
        setLocationStatus('error');
        
        let errMsg = "দয়া করে আপনার ডিভাইসের জিপিএস (GPS/Location) সচল করুন এবং ব্রাউজারে লোকেশন অনুমতি দিয়ে পুনরায় চেষ্টা করুন। (Please turn on your device's GPS and grant location permission in your browser.)";
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = "ব্রাউজারে লোকেশন পারমিশন ব্লক করা আছে। দয়া করে ব্রাউজার সেটিংস থেকে অনুমতি দিন এবং পুনরায় চেষ্টা করুন। (Location permission is blocked. Please allow location access in your browser settings and try again.)";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = "আপনার ডিভাইসের জিপিএস বা লোকেশন সার্ভিসটি বন্ধ রয়েছে। দয়া করে জিপিএস সক্রিয় করে পুনরায় চেষ্টা করুন। (Your device's GPS/Location is turned off. Please turn on your physical GPS and try again.)";
        } else if (error.code === error.TIMEOUT) {
          errMsg = "জিপিএস সংযোগের সময় শেষ হয়েছে। দয়া করে জিপিএস সক্রিয় রাখুন এবং পুনরায় চেষ্টা করুন। (Location request timed out. Please ensure GPS is active and try again.)";
        }
        setLocationError(errMsg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const executeCopy = async () => {
    const cardEl = document.getElementById("prayer-card-image-template");
    if (!cardEl) {
      alert("কার্ডটি পাওয়া যায়নি। আবার চেষ্টা করুন।");
      setIsExporting(false);
      return;
    }
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(cardEl, { backgroundColor: "#020617", pixelRatio: 2 });
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        alert("সাফল্যের সাথে ক্লিপবোর্ডে কপি করা হয়েছে! (Copied to clipboard successfully!)");
      }
    } catch (err) {
      console.error("Failed to copy image to clipboard:", err);
      alert("ক্লিপবোর্ডে কপি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsExporting(false);
    }
  };

  const copyCardImage = async () => {
    setIsExporting(true);
    // Request GPS permission or ensure we have it
    if (locationStatus !== 'granted') {
      setLocationStatus('detecting');
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser.");
        setIsExporting(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lon);
          const offset = getLocalTimezoneOffset();
          setTimezoneOffset(offset);
          setLocationStatus('granted');
          
          try {
            const geoRes = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
            const geoData = await geoRes.json();
            if (geoData.city && geoData.country) {
              setCityName(geoData.city);
              setCountryName(geoData.country);
            }
          } catch (e) {
            console.error("Geocoding failed during export:", e);
          }
          
          // Slight delay to allow DOM render with new location
          setTimeout(async () => {
            await executeCopy();
          }, 400);
        },
        async (error) => {
          console.warn("GPS Permission failed or denied during copy:", error);
          setLocationStatus('denied');
          // Proceed with current Makkah or fallback location
          await executeCopy();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      await executeCopy();
    }
  };

  const downloadCardImage = async () => {
    setIsExporting(true);
    const cardEl = document.getElementById("prayer-card-image-template");
    if (!cardEl) {
      alert("কার্ডটি পাওয়া যায়নি। আবার চেষ্টা করুন।");
      setIsExporting(false);
      return;
    }
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardEl, { backgroundColor: "#020617", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `prayer-times-${cityName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image:", err);
      alert("ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsExporting(false);
    }
  };

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync tailwind dark class on theme changes
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Calculate times based on selection
  const calculatedTimes = calculatePrayerTimes(
    selectedDate,
    latitude,
    longitude,
    timezoneOffset,
    selectedMethod,
    selectedSchool
  );

  // Parse actual numerical decimal values to compare with current clock decimal hour
  const currentDecimalHour = clockTime.getHours() + clockTime.getMinutes() / 60 + clockTime.getSeconds() / 3600;

  // Find active and next prayers (REMOVED Sunrise as requested, Sunset is also absent)
  const prayersInOrder = [
    { id: 'fajr', name: 'Fajr', timeValue: calculatedTimes.raw.fajr, timeStr: calculatedTimes.fajr },
    { id: 'dhuhr', name: 'Dhuhr', timeValue: calculatedTimes.raw.dhuhr, timeStr: calculatedTimes.dhuhr },
    { id: 'asr', name: 'Asr', timeValue: calculatedTimes.raw.asr, timeStr: calculatedTimes.asr },
    { id: 'maghrib', name: 'Maghrib', timeValue: calculatedTimes.raw.maghrib, timeStr: calculatedTimes.maghrib },
    { id: 'isha', name: 'Isha', timeValue: calculatedTimes.raw.isha, timeStr: calculatedTimes.isha },
  ];

  let currentPrayerIndex = 4; // Default is Isha from previous night
  for (let i = 0; i < prayersInOrder.length; i++) {
    if (currentDecimalHour >= prayersInOrder[i].timeValue) {
      currentPrayerIndex = i;
    }
  }

  const activePrayer = prayersInOrder[currentPrayerIndex];
  const nextPrayerIndex = (currentPrayerIndex + 1) % prayersInOrder.length;
  const nextPrayer = prayersInOrder[nextPrayerIndex];

  const getCurrentRunningPeriod = () => {
    const raw = calculatedTimes.raw;
    const fajr = raw.fajr;
    const sunrise = raw.sunrise;
    const dhuhr = raw.dhuhr;
    const asr = raw.asr;
    const maghrib = raw.maghrib;
    const isha = raw.isha;

    // Fajr: from Fajr till Sunrise
    if (currentDecimalHour >= fajr && currentDecimalHour < sunrise) {
      return {
        id: 'fajr' as const,
        name: 'Fajr',
        banglaName: 'ফজর',
        startTimeStr: calculatedTimes.fajr,
        endTimeStr: calculatedTimes.sunrise,
        isNamazPeriodRunning: true
      };
    }
    // Dhuhr: from Dhuhr till Asr
    if (currentDecimalHour >= dhuhr && currentDecimalHour < asr) {
      return {
        id: 'dhuhr' as const,
        name: 'Dhuhr',
        banglaName: 'যোহর',
        startTimeStr: calculatedTimes.dhuhr,
        endTimeStr: calculatedTimes.asr,
        isNamazPeriodRunning: true
      };
    }
    // Asr: from Asr till Maghrib
    if (currentDecimalHour >= asr && currentDecimalHour < maghrib) {
      return {
        id: 'asr' as const,
        name: 'Asr',
        banglaName: 'আসর',
        startTimeStr: calculatedTimes.asr,
        endTimeStr: calculatedTimes.maghrib,
        isNamazPeriodRunning: true
      };
    }
    // Maghrib: from Maghrib till Isha
    if (currentDecimalHour >= maghrib && currentDecimalHour < isha) {
      return {
        id: 'maghrib' as const,
        name: 'Maghrib',
        banglaName: 'মাগরিব',
        startTimeStr: calculatedTimes.maghrib,
        endTimeStr: calculatedTimes.isha,
        isNamazPeriodRunning: true
      };
    }
    // Isha: from Isha till midnight, or from midnight till Fajr
    // We calculate Islamic Midnight dynamically here (Maghrib to Fajr duration halved)
    let fajrTimeForMidnight = fajr;
    if (fajrTimeForMidnight < maghrib) {
      fajrTimeForMidnight += 24;
    }
    const midnightRaw = (maghrib + (fajrTimeForMidnight - maghrib) / 2) % 24;

    // Establish the chronological timeline relative to Maghrib to avoid hour wrapping issues
    const t_maghrib = 0;
    const t_isha = (isha - maghrib + 24) % 24;
    const t_midnight = (midnightRaw - maghrib + 24) % 24;
    const t_fajr = (fajrTimeForMidnight - maghrib + 24) % 24;
    const t_current = (currentDecimalHour - maghrib + 24) % 24;

    if (t_current >= t_isha && t_current < t_fajr) {
      const isPreferred = t_current < t_midnight;
      const oneMin = 1.0 / 60.0;
      const ishaEndTimeRaw = isPreferred ? (midnightRaw - oneMin + 24) % 24 : fajr;

      return {
        id: 'isha' as const,
        name: 'Isha',
        banglaName: isPreferred ? 'এশা (পছন্দনীয় ওয়াক্ত - Choice)' : 'এশা (জরুরি ওয়াক্ত - Necessity)',
        startTimeStr: calculatedTimes.isha,
        endTimeStr: formatPrayerTime(ishaEndTimeRaw, is24h),
        isNamazPeriodRunning: true,
        ishaSubPeriod: isPreferred ? 'preferred' : 'necessity'
      };
    }

    // Between Sunrise and Dhuhr (No obligatory prayer running)
    return {
      id: 'none' as const,
      name: 'None',
      banglaName: 'কোনো ফরজ নামাজের ওয়াক্ত নেই',
      startTimeStr: '',
      endTimeStr: '',
      isNamazPeriodRunning: false
    };
  };

  const runningPeriod = getCurrentRunningPeriod();

  const getTickingCountdown = () => {
    const target = new Date(clockTime);
    const hrs = Math.floor(nextPrayer.timeValue);
    const mins = Math.floor((nextPrayer.timeValue % 1) * 60);
    const secs = Math.floor((((nextPrayer.timeValue % 1) * 60) % 1) * 60);
    target.setHours(hrs, mins, secs, 0);

    let diffMs = target.getTime() - clockTime.getTime();
    if (diffMs < 0) {
      target.setDate(target.getDate() + 1);
      diffMs = target.getTime() - clockTime.getTime();
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Get Salat end time according to Sahih Hadith and Quran - 1 min precaution buffer for all
  const getSalahEndTimeStr = (id: string): string => {
    const oneMin = 1.0 / 60.0;
    if (id === 'fajr') {
      // Fajr ends at Sunrise - 1 min (Sahih Muslim 612)
      return formatPrayerTime(calculatedTimes.raw.sunrise - oneMin, is24h);
    }
    if (id === 'dhuhr') {
      // Dhuhr ends when Asr begins - 1 min (Sahih Muslim 612)
      return formatPrayerTime(calculatedTimes.raw.asr - oneMin, is24h);
    }
    if (id === 'asr') {
      // Asr preferred ends when sun turns yellow (~45m before Sunset), necessity ends at Maghrib
      const preferredEnd = formatPrayerTime(calculatedTimes.raw.maghrib - 0.75 - oneMin, is24h);
      const necessityEnd = formatPrayerTime(calculatedTimes.raw.maghrib - oneMin, is24h);
      return `Pref: ${preferredEnd} / Nec: ${necessityEnd}`;
    }
    if (id === 'maghrib') {
      // Maghrib ends when red twilight vanishes, which is Isha start - 1 min (Sahih Muslim 612)
      return formatPrayerTime(calculatedTimes.raw.isha - oneMin, is24h);
    }
    if (id === 'isha') {
      // Isha ends at Islamic Midnight - 1 min (Sahih Muslim 612)
      let fajrTime = calculatedTimes.raw.fajr;
      let maghribTime = calculatedTimes.raw.maghrib;
      if (fajrTime < maghribTime) {
        fajrTime += 24;
      }
      const midnightRaw = (maghribTime + (fajrTime - maghribTime) / 2) % 24;
      const midnightStr = formatPrayerTime(midnightRaw - oneMin, is24h);
      return `${midnightStr} (Midnight)`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Background Glows for Immersive theme */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none block"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none block"></div>

      {!isAppUnlocked ? (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-slate-900/40 border border-white/10 backdrop-blur-xl rounded-[32px] p-8 text-center shadow-2xl relative"
          >
            {/* Elegant Brand Logo Container with visual pulse */}
            <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shadow-2xl relative">
              <AppLogo className="w-16 h-16" />
              <span className="absolute top-2 right-2 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-widest text-emerald-400 mb-1">
              ALAM TECH
            </h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
              নামাজ সময়সূচী ও গাইড (Prayer Guide)
            </p>

            <p className="text-sm font-medium text-slate-300 leading-relaxed mb-8">
              সঠিক নামাজের ওয়াক্ত ও সাহরী-ইফতারের সময়সূচী নির্ধারণ করার জন্য দয়া করে আপনার ডিভাইসের জিপিএস (GPS) সংযোগ করুন। 
              <span className="block text-xs text-slate-500 mt-2 font-semibold">
                (Connecting your GPS is required to compute precise, local prayer times.)
              </span>
            </p>

            {/* Error block with physical GPS info */}
            {locationError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-left font-semibold space-y-1"
              >
                <div className="flex items-center gap-2 text-red-400 font-extrabold">
                  <Info size={14} className="shrink-0" />
                  <span>জিপিএস সংযোগ ত্রুটি</span>
                </div>
                <p className="leading-relaxed text-[11px] opacity-90">{locationError}</p>
                <p className="leading-relaxed text-[10px] text-slate-400 pt-1 font-medium border-t border-red-500/5 mt-1">
                  সহায়তা: ফোনের বা পিসির সেটিংস থেকে Location/GPS সচল আছে কিনা তা চেক করুন এবং ব্রাউজারে লোকেশন পারমিশন দিন।
                </p>
              </motion.div>
            )}

            {/* Action button */}
            <button
              onClick={requestGPSLocation}
              disabled={locationStatus === 'detecting'}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none ${
                locationStatus === 'detecting'
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:bg-emerald-600 shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {locationStatus === 'detecting' ? (
                <>
                  <RefreshCw size={20} className="animate-spin text-emerald-400 mb-1" />
                  <span className="text-slate-400 font-extrabold">Connecting GPS...</span>
                  <span className="text-[10px] font-bold text-slate-500 lowercase mt-0.5">জিপিএস সংযোগ করা হচ্ছে</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[15px] font-black">
                    <Navigation size={16} className="animate-pulse" />
                    <span>Connect with your GPS</span>
                  </div>
                  <span className="text-[11px] text-slate-900 font-bold tracking-normal">জিপিএস সংযুক্ত করুন</span>
                </>
              )}
            </button>

            {/* Quote decoration */}
            <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-slate-500 font-medium">
              "নিশ্চয়ই নামায মুমিনদের ওপর নির্দিষ্ট সময়ে ফরয করা হয়েছে।" <br /> — সূরা আন-নিসা ৪:১০৩
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        {/* Top Navbar & Header as specified by instructions */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-white/10 relative z-10">
          <div className="flex flex-col">
            <h1 className="text-2.5xl font-extrabold tracking-widest text-emerald-400 flex items-center gap-2">
              <AppLogo className="w-8 h-8" />
              ALAM TECH
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-slate-400 font-semibold tracking-wider">
                জিপিএস সক্রিয়: {cityName}, {countryName}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-6 sm:py-3 shadow-sm">
            <div className="text-right border-r border-white/10 pr-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">হিজরি তারিখ</p>
              <p className="font-semibold text-xs sm:text-sm text-slate-200">{getEstimatedHijriDate(clockTime)}</p>
            </div>
            
            <div className="text-right pr-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">স্থানীয় সময়</p>
              <p className="font-mono font-semibold text-xs sm:text-sm text-slate-200">
                {translateToBanglaText(clockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}
              </p>
            </div>
          </div>
        </header>

        {/* GPS location and status banner */}
        <div className="mb-8 p-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
              <MapPin size={20} id="location-pin" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">হিসাবকৃত অবস্থান</p>
              <h3 className="text-sm sm:text-base font-bold text-slate-200">
                {cityName}, {countryName}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status indicator badge */}
            {locationStatus === 'detecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-xs font-semibold text-amber-400 animate-pulse border border-amber-500/10">
                <RefreshCw size={12} className="animate-spin" /> জিপিএস খোঁজা হচ্ছে...
              </span>
            )}
            {locationStatus === 'granted' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-xs font-semibold text-emerald-400 border border-emerald-500/10">
                <ShieldCheck size={14} /> জিপিএস সক্রিয়
              </span>
            )}
            {(locationStatus === 'denied' || locationStatus === 'error') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-xs font-semibold text-red-400 border border-red-500/10">
                <Info size={14} /> ডিফল্ট অবস্থান সক্রিয়
              </span>
            )}

            <button
              id="btn-re-detect-location"
              onClick={requestGPSLocation}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/5"
            >
              <Navigation size={12} /> অবস্থান নির্ণয় করুন
            </button>
          </div>
        </div>

        {locationError && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-sans flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">জিপিএস স্থানাঙ্ক অনুরোধ উপলব্ধ নয় অথবা প্রত্যাখ্যান করা হয়েছে।</p>
              <p className="mt-0.5">অনুগ্রহ করে ব্রাউজারে লোকেশনের পারমিশন দিন এবং আপনার সঠিক অবস্থান অনুযায়ী সময় নির্ধারণ করতে 'অবস্থান নির্ণয় করুন' বোতামে চাপুন। সাময়িকভাবে ডিফল্ট সময় প্রদর্শিত হচ্ছে।</p>
            </div>
          </div>
        )}

        {/* TIMES DASHBOARD */}
        <div className="space-y-8">
              
              {/* Hero Section: Next Prayer with Immersive aesthetic */}
              <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-900/40 to-slate-900/40 border border-emerald-500/20 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
                {/* Background watermark text */}
                <div className="text-[64px] sm:text-[80px] font-extrabold text-white/5 absolute right-12 top-4 select-none uppercase tracking-widest leading-none pointer-events-none">
                  {translateToBanglaText(nextPrayer.name)}
                </div>

                <div className="relative z-10">
                  <span className="inline-block px-3.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full mb-4 tracking-[0.2em] uppercase border border-emerald-500/10">
                    পরবর্তী ওয়াক্ত: {translateToBanglaText(nextPrayer.name)}
                  </span>
                  <h2 className="text-5xl sm:text-7xl font-light tracking-tighter flex items-baseline gap-2.5 text-white">
                    {nextPrayer.timeStr.split(' ')[0]} <span className="text-xl sm:text-2xl text-slate-400 uppercase font-medium">{nextPrayer.timeStr.split(' ')[1] || 'PM'}</span>
                  </h2>
                  <p className="text-slate-400 mt-3 text-sm max-w-lg leading-relaxed">
                    সহীহ নিয়মে হিসাবকৃত (সুন্নাহ অনুযায়ী ওয়াক্তের সঠিক গণনা)। <br />
                    <span className="text-emerald-400 font-semibold italic">"রাসূলুল্লাহ্ সা: বলেনঃ ওয়াক্তের প্রথম ভাগে নামায আদায় করা সর্বোত্তম কাজ।"</span>
                  </p>
                </div>

                <div className="text-left md:text-right w-full md:w-auto shrink-0 relative z-10">
                  <div className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20 inline-block w-full md:w-auto min-w-[210px] shadow-sm">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.15em] font-bold mb-1">অবশিষ্ট সময়</p>
                    <p className="text-3xl sm:text-4xl font-mono text-emerald-400 font-extrabold tracking-tight">
                      {getTickingCountdown()}
                    </p>
                    <p className="text-[9px] text-slate-400/80 mt-1 uppercase tracking-wider font-semibold">সরাসরি লাইভ গণনা</p>
                  </div>
                </div>
              </section>

              {/* Current Running Salat Period Info */}
              <div className="p-6 rounded-[32px] bg-gradient-to-r from-emerald-950/20 to-slate-900/40 border border-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm relative overflow-hidden z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl shrink-0">
                    <Clock size={24} className={runningPeriod.isNamazPeriodRunning ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold block">
                      চলমান সময়সূচী • Current Active Period
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {runningPeriod.isNamazPeriodRunning ? (
                        <>
                          <span className="text-emerald-400">
                            {runningPeriod.banglaName} ওয়াক্ত চলছে
                          </span>
                          <span className="text-xs text-slate-400 font-semibold px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                            {runningPeriod.name} Period
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400">
                            বর্তমানে কোনো ফরজ নামাজের ওয়াক্ত নেই
                          </span>
                          <span className="text-xs text-slate-400 font-semibold px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                            No Active Obligatory Waqt
                          </span>
                        </>
                      )}
                    </h3>
                  </div>
                </div>

                {runningPeriod.isNamazPeriodRunning ? (
                  <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 relative z-10 flex flex-col gap-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ওয়াক্তের শেষ সময়</p>
                    <p className="font-mono text-xl font-black text-emerald-400">
                      {getSalahEndTimeStr(runningPeriod.id)}
                    </p>
                    <div className="flex flex-col md:items-end gap-0.5">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        runningPeriod.id === 'fajr' || runningPeriod.id === 'isha'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                      }`}>
                        {runningPeriod.id === 'fajr' || runningPeriod.id === 'isha' 
                          ? 'অ-ধারাবাহিক • Non-Continuous' 
                          : 'ধারাবাহিক • Continuous'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 relative z-10 flex flex-col gap-0.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">পরবর্তী ওয়াক্ত শুরু</p>
                    <p className="font-mono text-base font-black text-amber-400 mt-1">
                      {nextPrayer.timeStr}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Starts At {nextPrayer.timeStr}</p>
                  </div>
                )}
              </div>

              {/* Isha Timing and Scholarly Ruling Details Block */}
              {runningPeriod.id === 'isha' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-[24px] bg-emerald-950/20 border border-emerald-500/15 text-xs text-slate-300 relative overflow-hidden z-10 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Info size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white mb-1.5 text-sm">
                        এশা ওয়াক্তের ধারাবাহিকতা ও শেষ সময় সংক্রান্ত শরীঈ বিধান • Isha Timing & Continuity ruling:
                      </p>
                      <p className="leading-relaxed mb-2.5">
                        <strong className="text-emerald-400">সহীহ হাদীসের বিধান:</strong> রাসূলুল্লাহ (সা.) বলেছেন, <span className="italic text-emerald-300 font-medium">"এশার ওয়াক্ত হচ্ছে অর্ধরাত্রি পর্যন্ত।"</span> (সহীহ মুসলিম６১২)। <br />
                        <strong className="text-emerald-400">সালাফী ওলামাদের ফতোয়া:</strong> শায়খ ইবনে বায ও শায়খ ইবনে উছাইমীনসহ সালাফী স্কলারদের ফতোয়া অনুযায়ী, বিনা ওজরে এশার নামায অর্ধরাত্রির (Islamic Midnight) পরে বিলম্ব করা জায়েয নয়। এশার ওয়াক্ত ফজর পর্যন্ত <span className="text-rose-400 font-extrabold underline">ধারাবাহিক নয়</span>। অর্ধরাত্রির পর শুধুমাত্র অপারগ বা ওযরগ্রস্ত ব্যক্তিদের জন্য জরুরি সময় (ওয়াক্তে জরুরত) ফজর পর্যন্ত বলবৎ থাকে।
                      </p>
                      <div className="border-t border-emerald-500/10 pt-2 text-[11px] text-slate-400 leading-relaxed space-y-1">
                        <p>
                          <strong className="text-emerald-400/80">English Reference:</strong> According to Sahih Hadith (Sahih Muslim 612) and major Salafi scholars (e.g. Sheikh Ibn Baz, Sheikh Ibn Uthaymeen), the preferred time (Waqt al-Ikhtiyar) of Isha ends at Islamic Midnight and is <strong className="text-rose-400 font-bold underline">NOT continuous</strong> with Fajr. Delaying it past midnight without a valid excuse (Waqt al-Darurah) is impermissible.
                        </p>
                        <p className="text-[10px] text-slate-500 italic">
                          * Islamic Midnight calculation: Sunset (Maghrib) to Dawn (Fajr) duration halved, plus Maghrib time, minus 1 minute precaution.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Core Hadith on Awal/First Waqt Prayer */}
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-3xl p-6 relative overflow-hidden shadow-sm relative z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row items-start gap-4 relative z-10">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div className="space-y-4 w-full">
                    <h4 className="text-xs uppercase tracking-[0.2em] font-extrabold text-emerald-400 mb-1">আওয়াল ওয়াক্তে নামায আদায়ের গুরুত্ব</h4>
                    
                    {/* Hadith 1 */}
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed mb-1.5">
                        "আমি রাসূলুল্লাহ (সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম)-কে জিজ্ঞাসা করলাম, 'কোন আমলটি আল্লাহর কাছে সবচেয়ে প্রিয়?' তিনি উত্তর দিলেন, 'ঠিক সময়ে (ওয়াক্তমতো) নামায আদায় করা।'"
                      </p>
                      <p className="text-xs text-emerald-300 italic font-medium leading-relaxed">
                        "Allah's most beloved is one who offers prayer at the proper time."
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-2">
                        — সহীহ বুখারী ৫২৭, সহীহ মুসলিম ৮৫ (Sahih al-Bukhari: 527, Sahih Muslim: 85)
                      </p>
                    </div>

                    <div className="border-t border-emerald-500/10 my-1" />

                    {/* Hadith 2 */}
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed mb-1.5">
                        "রাসূলুল্লাহ্ সাল্লাল্লাহু আলাইহি ওয়া সাল্লামকে উত্তম আমল সম্পর্কে জিজ্ঞাসা করা হলে তিনি বলেনঃ ওয়াক্তের প্রথম ভাগে নামায আদায় করা সর্বোত্তম কাজ।"
                      </p>
                      <p className="text-xs text-emerald-300 italic font-medium leading-relaxed">
                        "The Messenger of Allah (peace be upon him) was asked about the best deed, and he said: 'Offering prayer at the beginning of its time.'"
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-2">
                        — সুনান আবূ দাউদ : ৪২৬ (Sunan Abi Dawud: 426)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sehri, Sunrise & Iftar Card Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                {/* Sehri Ending card */}
                <div className="p-6 rounded-3xl bg-red-950/20 border border-red-500/20 flex items-center justify-between group shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl group-hover:scale-105 transition-transform">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Sehri Last Time</h4>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">সেহরির শেষ সময়</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-red-400">
                      {formatPrayerTime(calculatedTimes.raw.fajr - 1.0 / 60.0)}
                    </span>
                  </div>
                </div>

                {/* Sunrise (-1 min) Card */}
                <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between group shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:scale-105 transition-transform">
                      <Sunrise size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Sunrise</h4>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">সূর্যোদয়ের সময়</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                      {formatPrayerTime(calculatedTimes.raw.sunrise - 1.0 / 60.0)}
                    </span>
                  </div>
                </div>

                {/* Iftar Time card */}
                <div className="p-6 rounded-3xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between group shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl group-hover:scale-105 transition-transform">
                      <Sun size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Iftar Time</h4>
                      <h3 className="text-sm font-extrabold text-white mt-0.5">ইফতারের সময়</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                      {formatPrayerTime(calculatedTimes.raw.maghrib)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bento Grid Prayer Times */}
              <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                {prayersInOrder.map((p) => {
                  const isActive = runningPeriod.id === p.id;

                  return (
                    <div
                      key={p.id}
                      id={`prayer-card-${p.id}`}
                      className={`p-6 rounded-3xl border transition-all flex flex-col justify-between group ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            নামাযের ওয়াক্ত
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[9px] text-emerald-400 font-extrabold tracking-wider uppercase">চলমান</span>
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {translateToBanglaText(p.name)}
                        </h3>

                        <h4 className="text-3.5xl font-black mt-2 text-emerald-400 font-mono tracking-tight">
                          {p.timeStr}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </main>

            </div>

        {/* PRAYER CARD GENERATOR & SHARING SECTION */}
        <section className="mt-16 bg-slate-900/20 border border-white/5 rounded-[32px] p-6 sm:p-8 relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
            {/* Text description and buttons */}
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  আজকের নামাজের সময়সূচী শেয়ার করুন
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  id="btn-copy-card-image"
                  onClick={copyCardImage}
                  disabled={isExporting}
                  className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isExporting ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Copy size={18} />
                  )}
                  Copy
                </button>

                <button
                  id="btn-download-card-image"
                  onClick={downloadCardImage}
                  disabled={isExporting}
                  className="px-6 py-4 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50 text-slate-200 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-white/10"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-medium font-sans">
                * প্রথমবার কপি করার সময় ব্রাউজার থেকে জিপিএস লোকেশনের অনুমতি চাওয়া হবে যেন সঠিক শহর ও দেশ কার্ডে যুক্ত করা যায়।
              </p>
            </div>

            {/* Live Card Preview */}
            <div className="shrink-0 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-[36px] blur opacity-25" />
              <div className="relative bg-slate-950 p-1.5 rounded-[34px] shadow-2xl border border-white/5 max-w-full overflow-x-auto">
                
                {/* Real DOM Element to capture */}
                <div 
                  id="prayer-card-image-template" 
                  className="w-[360px] xs:w-[400px] sm:w-[420px] p-6 sm:p-8 rounded-[32px] bg-slate-950 border-2 border-emerald-500/20 text-white font-sans flex flex-col gap-5 relative overflow-hidden shrink-0 select-none"
                  style={{ minHeight: '500px' }}
                >
                  {/* Background overlay decorations */}
                  <div className="absolute top-[-80px] left-[-80px] w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-[-80px] right-[-80px] w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="text-center relative z-10 flex flex-col items-center">
                    <svg className="w-8 h-8 text-emerald-400 mb-1.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                    </svg>
                    <h2 className="text-xl font-extrabold tracking-widest text-emerald-400">ALAM TECH</h2>
                    <p className="text-[10px] text-slate-400 font-extrabold tracking-[0.25em] uppercase mt-0.5">নামাজের ওয়াক্ত ও সময়সূচী</p>
                  </div>

                  {/* Location & Date Badge */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-center relative z-10">
                    <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center justify-center gap-1.5 tracking-wide">
                      <MapPin className="text-emerald-400 shrink-0" size={15} />
                      {cityName}, {countryName}
                    </h3>
                    <div className="flex justify-center items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>{selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="text-slate-600 font-normal">|</span>
                      <span>{getEstimatedHijriDate(selectedDate)}</span>
                    </div>
                  </div>

                  {/* Sehri, Sunrise & Iftar Timings inside downloadable Card */}
                  <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-3 relative z-10 grid grid-cols-3 gap-1 text-center font-sans">
                    <div className="flex flex-col items-center justify-center border-r border-emerald-500/10 pr-0.5">
                      <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider">Sehri End</span>
                      <span className="text-[6.5px] text-slate-500 font-bold leading-none mt-0.5">সেহরি শেষ</span>
                      <p className="text-[9px] sm:text-[10px] font-black font-mono text-red-400 mt-1">
                        {formatPrayerTime(calculatedTimes.raw.fajr - 1.0 / 60.0, false)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center border-r border-emerald-500/10 px-0.5">
                      <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider">Sunrise</span>
                      <span className="text-[6.5px] text-slate-500 font-bold leading-none mt-0.5">সূর্যোদয়</span>
                      <p className="text-[9px] sm:text-[10px] font-black font-mono text-emerald-400 mt-1">
                        {formatPrayerTime(calculatedTimes.raw.sunrise - 1.0 / 60.0, false)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center pl-0.5">
                      <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider">Iftar Time</span>
                      <span className="text-[6.5px] text-slate-500 font-bold leading-none mt-0.5">ইফতার</span>
                      <p className="text-[9px] sm:text-[10px] font-black font-mono text-amber-400 mt-1">
                        {formatPrayerTime(calculatedTimes.raw.maghrib, false)}
                      </p>
                    </div>
                  </div>

                  {/* Prayer list inside Card */}
                  <div className="flex flex-col gap-2.5 relative z-10 font-sans">
                    {/* Fajr */}
                    <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-white">Fajr</span>
                        <span className="text-[9px] text-slate-500 font-bold">ফজর</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-extrabold font-mono text-emerald-400">{formatPrayerTime(calculatedTimes.raw.fajr, false)}</p>
                      </div>
                    </div>

                    {/* Dhuhr */}
                    <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-white">Dhuhr</span>
                        <span className="text-[9px] text-slate-500 font-bold">যোহর</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-extrabold font-mono text-emerald-400">{formatPrayerTime(calculatedTimes.raw.dhuhr, false)}</p>
                      </div>
                    </div>

                    {/* Asr */}
                    <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-white">Asr</span>
                        <span className="text-[9px] text-slate-500 font-bold">আসর</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-extrabold font-mono text-emerald-400">{formatPrayerTime(calculatedTimes.raw.asr, false)}</p>
                      </div>
                    </div>

                    {/* Maghrib */}
                    <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-white">Maghrib</span>
                        <span className="text-[9px] text-slate-500 font-bold">মাগরিব</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-extrabold font-mono text-emerald-400">{formatPrayerTime(calculatedTimes.raw.maghrib, false)}</p>
                      </div>
                    </div>

                    {/* Isha */}
                    <div className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-black text-white">Isha</span>
                        <span className="text-[9px] text-slate-500 font-bold">এশা</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-extrabold font-mono text-emerald-400">{formatPrayerTime(calculatedTimes.raw.isha, false)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom References */}
                  <div className="mt-1 pt-3 border-t border-white/10 text-center relative z-10 flex justify-between items-center text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                    <span>Quran & Sunnah Timings</span>
                    <span>Alam Tech © 2026</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Bottom Reference Bar exactly as layout spec */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 mt-16 border-t border-white/10 relative z-10 text-slate-400">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">সার্ভিস ডিজাইন ও ডেভেলপমেন্ট</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">Alam Tech © ২০২৬</p>
          </div>
        </footer>

        {/* Sub-footer quote */}
        <div className="mt-8 text-center pb-12">
          <p className="text-xs text-slate-500 font-medium">
            "নিশ্চয়ই নামায মুমিনদের ওপর নির্দিষ্ট সময়ে ফরয করা হয়েছে।" — সূরা আন-নিসা ৪:১০৩
          </p>
        </div>

      </div>
      )}
    </div>
  );
}
