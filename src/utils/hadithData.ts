export interface HadithReference {
  text: string;
  source: string;
  category: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'general';
  importance: 'high' | 'medium';
  international?: string;
}

export const HADITH_DATA: HadithReference[] = [
  {
    category: 'general',
    text: "আমি রাসূলুল্লাহ (সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম)-কে জিজ্ঞাসা করলাম, 'কোন আমলটি আল্লাহর কাছে সবচেয়ে প্রিয়?' তিনি উত্তর দিলেন, 'আওয়াল ওয়াক্তে নামায আদায় করা।'",
    source: "সহীহ বুখারী ৫২৭, সহীহ মুসলিম ৮৫",
    international: "Sahih al-Bukhari: 527, Sahih Muslim: 85",
    importance: 'high'
  },
  {
    category: 'general',
    text: "নিশ্চয়ই নামায মুমিনদের ওপর নির্দিষ্ট সময়ে ফরয করা হয়েছে।",
    source: "সূরা আন-নিসা [কুরআন ৪:১০৩]",
    international: "Quran 4:103",
    importance: 'high'
  },
  {
    category: 'fajr',
    text: "ফজরের ওয়াক্ত হলো সুবহে সাদিক থেকে সূর্যোদয়ের পূর্ব পর্যন্ত। ফজরের আওয়াল ওয়াক্তে নামায আদায় করা অত্যন্ত বরকতময় এবং রাসূলুল্লাহ (সা.) ফজরের আওয়াল ওয়াক্তে নামায পড়তেন যখন চারপাশ অন্ধকার থাকত।",
    source: "সহীহ মুসলিম ৬১২, সহীহ বুখারী ৫৬০",
    international: "Sahih Muslim: 612, Sahih al-Bukhari: 560",
    importance: 'high'
  },
  {
    category: 'fajr',
    text: "ফজরের দুই রাকাত সুন্নাত নামায দুনিয়া ও তার মধ্যকার সমস্ত কিছুর চেয়ে উত্তম।",
    source: "সহীহ মুসলিম ৭২৫",
    international: "Sahih Muslim: 725",
    importance: 'medium'
  },
  {
    category: 'dhuhr',
    text: "যোহরের ওয়াক্ত শুরু হয় সূর্য পশ্চিমাকাশে ঢলে পড়ার পর থেকে এবং তা আসরের ওয়াক্ত শুরু হওয়া পর্যন্ত থাকে। মেঘমুক্ত দিনে আওয়াল ওয়াক্তে যোহরের নামায আদায় করা উত্তম ও আল্লাহর পছন্দনীয়।",
    source: "সহীহ মুসলিম ৬১২",
    international: "Sahih Muslim: 612",
    importance: 'high'
  },
  {
    category: 'dhuhr',
    text: "গরমের তীব্রতা বৃদ্ধি পেলে যোহরের সালাত ঠান্ডা করে (দেরি করে) আদায় করো। কেননা গরমের তীব্রতা জাহান্নামের উত্তাপের অংশ।",
    source: "সহীহ বুখারী ৫৩৬, সহীহ মুসলিম ৬১৫",
    international: "Sahih al-Bukhari: 536, Sahih Muslim: 615",
    importance: 'medium'
  },
  {
    category: 'asr',
    text: "আসরের ওয়াক্ত হলো যখন প্রতিটি বস্তুর ছায়া তার সমপরিমাণ হয় (আসরের আওয়াল ওয়াক্ত)। আসরের নামাযের প্রতি বিশেষ যত্নবান হওয়ার নির্দেশ রয়েছে এবং তা আওয়াল ওয়াক্তে আদায় করা অত্যন্ত গুরুত্বপূর্ণ।",
    source: "সহীহ মুসলিম ৬১২, সূরা আল-বাকারাহ ২:২৩৮",
    international: "Sahih Muslim: 612, Quran 2:238",
    importance: 'high'
  },
  {
    category: 'asr',
    text: "যে ব্যক্তি আসরের নামায (ইচ্ছাকৃতভাবে) ছেড়ে দেয় বা বিলম্ব করে, তার আমল নষ্ট হয়ে যায়।",
    source: "সহীহ বুখারী ৫৫৩",
    international: "Sahih al-Bukhari: 553",
    importance: 'high'
  },
  {
    category: 'maghrib',
    text: "মাগরিবের ওয়াক্ত শুরু হয় সূর্যাস্তের সাথে সাথেই এবং পশ্চিমাকাশের লালিমা অদৃশ্য হওয়া পর্যন্ত স্থায়ী থাকে। মাগরিবের নামায কোনো বিলম্ব না করে আওয়াল ওয়াক্তে আদায় করার ব্যাপারে কঠোর তাগিদ দেওয়া হয়েছে।",
    source: "সহীহ মুসলিম ৬১২, সুনান আবু دাউদ ৪১৮",
    international: "Sahih Muslim: 612, Sunan Abi Dawud: 418",
    importance: 'high'
  },
  {
    category: 'isha',
    text: "এশার নামাযের ওয়াক্ত শুরু হয় পশ্চিমাকাশের লালিমা অদৃশ্য হওয়ার পর থেকে অর্ধরাত্রি পর্যন্ত। এশার নামায আওয়াল ওয়াক্তে বা রাতের এক-তৃতীয়াংশের মধ্যে আদায় করা উত্তম।",
    source: "সহীহ মুসলিম ৬১২, সুনান আত-তিরমিযী ১৬৭",
    international: "Sahih Muslim: 612, Jami` at-Tirmidhi: 167",
    importance: 'high'
  }
];
