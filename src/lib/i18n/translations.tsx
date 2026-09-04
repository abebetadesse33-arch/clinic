"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Locale = "en" | "am" | "om" | "ti";

export interface LanguageOption {
  code: Locale;
  label: string;
  nativeLabel: string;
  direction: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", direction: "ltr" },
  { code: "am", label: "Amharic", nativeLabel: "አማርኛ", direction: "ltr" },
  { code: "om", label: "Afaan Oromoo", nativeLabel: "Afaan Oromoo", direction: "ltr" },
  { code: "ti", label: "Tigrinya", nativeLabel: "ትግርኛ", direction: "ltr" },
];

export const DICTIONARY: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation & Common
    "nav.dashboard": "Dashboard",
    "nav.clinical_workstation": "Clinical Workstation",
    "nav.cases": "Cases & Queue",
    "nav.patient_journey": "Patient Journey",
    "nav.hr": "HR Management",
    "nav.finance": "Finance & RCM",
    "nav.feedback": "Feedback & NLP",
    "nav.pos": "POS Terminal",
    "nav.book_visit": "Book Visit",
    "nav.treat_me_now": "Treat Me Now",
    "common.search": "Search…",
    "common.loading": "Loading…",
    "common.save": "Save Changes",
    "common.cancel": "Cancel",
    "common.print": "Print Card",
    "common.refresh": "Refresh",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.urgent": "URGENT",

    // Patient Card & Ticket
    "card.title": "Digital Patient Health Card",
    "card.mrn": "Medical Record Number",
    "card.dob": "Date of Birth",
    "card.blood_type": "Blood Type",
    "card.emergency": "Emergency Contact",
    "card.allergies": "Known Allergies",
    "card.ticket_number": "Queue Ticket",
    "card.destination": "Destination Room",
    "card.wait_estimate": "Estimated Wait",
    "card.scan_instructions": "Scan QR at clinical check-in station",

    // Clinical Journey & Rounds
    "journey.title": "Patient Journey & Clinical Flow",
    "journey.stage.triage": "Triage & Intake",
    "journey.stage.waiting": "Waiting Room",
    "journey.stage.consultation": "Consultation",
    "journey.stage.lab_pending": "Lab Pending",
    "journey.stage.lab_ready": "Results Ready",
    "journey.stage.pharmacy": "Pharmacy Dispense",
    "journey.stage.ward": "Inpatient Ward",
    "journey.stage.discharged": "Discharged",
    "journey.action.mark_seen": "Mark Lab Seen",
    "journey.action.transfer_bed": "Transfer Bed",
    "journey.action.add_round_note": "Add Round Note",
    "journey.action.discharge": "Authorize Discharge",

    // Feedback & Sentiment
    "feedback.title": "Patient & Staff Feedback Intelligence",
    "feedback.subtitle": "AI-Driven NLP Sentiment, Theme Extraction & Action Backlog",
    "feedback.sentiment.positive": "Positive",
    "feedback.sentiment.neutral": "Neutral",
    "feedback.sentiment.negative": "Negative",
    "feedback.submit_prompt": "Share your experience with us",
    "feedback.placeholder": "Please tell us how your visit went, what went well, or what we can improve…",
    "feedback.submit_button": "Submit Feedback for AI Review",
  },

  am: {
    // Navigation & Common
    "nav.dashboard": "ዳሽቦርድ",
    "nav.clinical_workstation": "የሕክምና ጣቢያ",
    "nav.cases": "ጉዳዮች እና ወረፋ",
    "nav.patient_journey": "የታካሚ ጉዞ",
    "nav.hr": "የሰው ኃይል አስተዳደር",
    "nav.finance": "ፋይናንስ እና ገቢ",
    "nav.feedback": "አስተያየት እና ትንተና",
    "nav.pos": "የክፍያ መክፈያ ጣቢያ",
    "nav.book_visit": "ቀጠሮ ይያዙ",
    "nav.treat_me_now": "አሁን ይታከሙ",
    "common.search": "ፈልግ…",
    "common.loading": "በመጫን ላይ…",
    "common.save": "ለውጦችን መዝግብ",
    "common.cancel": "ሰርዝ",
    "common.print": "ካርድ አትም",
    "common.refresh": "አድስ",
    "common.status": "ሁኔታ",
    "common.actions": "እርምጃዎች",
    "common.urgent": "አስቸኳይ",

    // Patient Card & Ticket
    "card.title": "ዲጂታል የታካሚ የጤና ካርድ",
    "card.mrn": "የሕክምና መዝገብ ቁጥር (MRN)",
    "card.dob": "የትውልድ ቀን",
    "card.blood_type": "የደም ዓይነት",
    "card.emergency": "የአደጋ ጊዜ ተጠሪ",
    "card.allergies": "የሚስማሙ/አለርጂዎች",
    "card.ticket_number": "የወረፋ ቲኬት",
    "card.destination": "የመዳረሻ ክፍል",
    "card.wait_estimate": "የሚገመት የጥበቃ ጊዜ",
    "card.scan_instructions": "በምዝገባ ጣቢያው QR ኮዱን ያሳዩ",

    // Clinical Journey & Rounds
    "journey.title": "የታካሚ ጉዞ እና የሕክምና ሂደት",
    "journey.stage.triage": "ምርመራ እና ምዝገባ (ትሪያጅ)",
    "journey.stage.waiting": "የመጠባበቂያ ክፍል",
    "journey.stage.consultation": "የዶክተር ምርመራ",
    "journey.stage.lab_pending": "ላቦራቶሪ በመጠባበቅ ላይ",
    "journey.stage.lab_ready": "ውጤት ደርሷል",
    "journey.stage.pharmacy": "መድኃኒት ማከፋፈያ",
    "journey.stage.ward": "የተኝቶ ታካሚ ክፍል",
    "journey.stage.discharged": "ተሰናብቷል",
    "journey.action.mark_seen": "ውጤቱን አረጋግጥ",
    "journey.action.transfer_bed": "አልጋ ቀይር",
    "journey.action.add_round_note": "የክትትል ማስታወሻ",
    "journey.action.discharge": "ማሰናበቻ ፍቀድ",

    // Feedback & Sentiment
    "feedback.title": "የታካሚዎች እና የሰራተኞች አስተያየት ትንተና",
    "feedback.subtitle": "በአርቴፊሻል ኢንተለጀንስ የተደገፈ የስሜት እና ማሻሻያ ትንተና",
    "feedback.sentiment.positive": "አዎንታዊ",
    "feedback.sentiment.neutral": "መካከለኛ",
    "feedback.sentiment.negative": "አሉታዊ",
    "feedback.submit_prompt": "የሕክምና ልምድዎን ያጋሩን",
    "feedback.placeholder": "እባክዎን የሕክምና ቆይታዎ ምን ይመስል እንደነበር እና ምን ማሻሻል እንዳለብን ይንገሩን…",
    "feedback.submit_button": "አስተያየት አስገባ",
  },

  om: {
    // Navigation & Common
    "nav.dashboard": "Daashboordii",
    "nav.clinical_workstation": "Iddoo Yaalaa",
    "nav.cases": "Dhimmoota & Tarree",
    "nav.patient_journey": "Adeemsa Dhukkubsataa",
    "nav.hr": "Bulchiinsa Qabeenya Namaa",
    "nav.finance": "Faayinaansii & Galii",
    "nav.feedback": "Yaada & Xiinxala",
    "nav.pos": "Bakka Kaffaltii",
    "nav.book_visit": "Beellama Qabadhaa",
    "nav.treat_me_now": "Amma Yaalamaa",
    "common.search": "Barbaadi…",
    "common.loading": "Fe'amaa jira…",
    "common.save": "Olkaa'i",
    "common.cancel": "Dhiisi",
    "common.print": "Kaardii Maxxansi",
    "common.refresh": "Haaromsi",
    "common.status": "Haala",
    "common.actions": "Tarkaanfiiwwan",
    "common.urgent": "ARIITII",

    // Patient Card & Ticket
    "card.title": "Kaardii Fayyaa Dhukkubsataa Dijitaalaa",
    "card.mrn": "Lakk. Galmee Yaalaa (MRN)",
    "card.dob": "Guyyaa Dhalootaa",
    "card.blood_type": "Gosa Dhiigaa",
    "card.emergency": "Nama Yeroo Balaa",
    "card.allergies": "Xiyyeefannoo Alarjikii",
    "card.ticket_number": "Tikeettii Tarree",
    "card.destination": "Kutaa Itti Deeman",
    "card.wait_estimate": "Yeroo Eeggannoo",
    "card.scan_instructions": "Koodii QR bakka simannaatti agarsiisaa",

    // Clinical Journey & Rounds
    "journey.title": "Adeemsa Yaalaa & Hordoffii Dhukkubsataa",
    "journey.stage.triage": "Qorannoo Jalqabaa (Triage)",
    "journey.stage.waiting": "Kutaa Eeggannoo",
    "journey.stage.consultation": "Qorannoo Doktooraa",
    "journey.stage.lab_pending": "Laabooratorii Eegaa jira",
    "journey.stage.lab_ready": "Bu'aan Qophaa'eera",
    "journey.stage.pharmacy": "Qoricha Fudhatu",
    "journey.stage.ward": "Kutaa Ciisichaa",
    "journey.stage.discharged": "Gaggeeffameera",
    "journey.action.mark_seen": "Bu'aa Mirkaneessi",
    "journey.action.transfer_bed": "Siree Jijjiiri",
    "journey.action.add_round_note": "Yaada Hordoffii",
    "journey.action.discharge": "Gaggeessuuf Hayyami",

    // Feedback & Sentiment
    "feedback.title": "Xiinxala Yaada Dhukkubsattootaa & Hojjattootaa",
    "feedback.subtitle": "AI fayyadamuun miira fi foyya'iinsa qorachuu",
    "feedback.sentiment.positive": "Gaarii",
    "feedback.sentiment.neutral": "Giddugaleessa",
    "feedback.sentiment.negative": "Qeeqa",
    "feedback.submit_prompt": "Muuxannoo keessan nuuf qoodaa",
    "feedback.placeholder": "Tajaajilli keenya akkam akka ture fi maaltu fooyya'uu akka qabu nuuf ibsaa…",
    "feedback.submit_button": "Yaada Ergi",
  },

  ti: {
    // Navigation & Common
    "nav.dashboard": "ዳሽቦርድ",
    "nav.clinical_workstation": "ናይ ሕክምና ጣብያ",
    "nav.cases": "ሕሙማት & መስርዕ",
    "nav.patient_journey": "ጉዕዞ ሕሙም",
    "nav.hr": "ምምሕዳር ሰብኣዊ ሓይሊ",
    "nav.finance": "ፋይናንስን ኣታዊታትን",
    "nav.feedback": "ርእይቶን ትንተናን",
    "nav.pos": "መኽፈሊ ክፍሊ",
    "nav.book_visit": "ቆፀሮ ሓዝ",
    "nav.treat_me_now": "ሕጂ ተሓከም",
    "common.search": "ድለይ…",
    "common.loading": "ይፅዕን ኣሎ…",
    "common.save": "ዓቅብ",
    "common.cancel": "ሰርዝ",
    "common.print": "ካርድ ሕተም",
    "common.refresh": "ሓድሽ",
    "common.status": "ኩነታት",
    "common.actions": "ስጉምትታት",
    "common.urgent": "ህፁፅ",

    // Patient Card & Ticket
    "card.title": "ዲጂታል ናይ ሕሙም ጥዕና ካርድ",
    "card.mrn": "ቁፅሪ መዝገብ ሕክምና (MRN)",
    "card.dob": "ዕለተ ልደት",
    "card.blood_type": "ዓይነት ደም",
    "card.emergency": "ተፀዋዒ ሓደጋ እዋን",
    "card.allergies": "ዘይሰማምዑ (ኣለርጂ)",
    "card.ticket_number": "ቲኬት መስርዕ",
    "card.destination": "ክፍሊ መዕረፊ",
    "card.wait_estimate": "ዝግመት ግዜ ምፅባይ",
    "card.scan_instructions": "ኣብ መቐበሊ ቦታ ነቲ QR ኮድ ኣርእዩ",

    // Clinical Journey & Rounds
    "journey.title": "ጉዕዞን ክትትልን ሕክምና ሕሙም",
    "journey.stage.triage": "ምርመራን ምዝገባን (ትሪያጅ)",
    "journey.stage.waiting": "መፀበዪ ክፍሊ",
    "journey.stage.consultation": "ምርመራ ሓኪም",
    "journey.stage.lab_pending": "ላቦራቶሪ ይፅበ ኣሎ",
    "journey.stage.lab_ready": "ውፅኢት ተረኺቡ",
    "journey.stage.pharmacy": "መከፋፈሊ መድሃኒት",
    "journey.stage.ward": "ክፍሊ ደቂሶም ዝሕከሙ",
    "journey.stage.discharged": "ተፋንዩ",
    "journey.action.mark_seen": "ውፅኢት ኣረጋግፅ",
    "journey.action.transfer_bed": "ዓራት ቀይር",
    "journey.action.add_round_note": "ናይ ክትትል መዘክር",
    "journey.action.discharge": "ምፍናው ፍቐድ",

    // Feedback & Sentiment
    "feedback.title": "ትንተና ርእይቶ ሕሙማትን ሰራሕተኛታትን",
    "feedback.subtitle": "ብኣርቲፊሻል ኢንተለጀንስ ዝተደገፈ ትንተና ስምዒትን ምምሕያሽን",
    "feedback.sentiment.positive": "ኣወንታዊ",
    "feedback.sentiment.neutral": "ማእኸላይ",
    "feedback.sentiment.negative": "ኣሉታዊ",
    "feedback.submit_prompt": "ተመክሮኹም ኣካፍሉና",
    "feedback.placeholder": "እቲ ዝተገበረልኩም ኣገልግሎት ከመይ ከምዝነበረን እንታይ ክመሓየሽ ከምዘለዎን ግለፁልና…",
    "feedback.submit_button": "ርእይቶ ስደድ",
  },
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, defaultText?: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("Nini_locale") as Locale | null;
    if (saved && (saved === "en" || saved === "am" || saved === "om" || saved === "ti")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("Nini_locale", l);
    document.documentElement.lang = l;
  };

  const t = (key: string, defaultText?: string): string => {
    return DICTIONARY[locale]?.[key] || DICTIONARY.en?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRTL: false }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
