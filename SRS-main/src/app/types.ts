export type SportType = "individual" | "doubles" | "team";

export interface SportConfig {
  id: string;
  name: string;
  type: SportType;
  mainPlayers: number;
  substitutes: number;
  minSubstitutes: number;
  category: "Indoor" | "Outdoor" | "Racket" | "Track" | "Court";
  iconName: string;
  emoji: string;
}

export interface PlayerSlot {
  index: number;          // 0-based absolute index across all slots
  role: string;           // "Player 1", "Sub 1", etc.
  isCaptain: boolean;
  isSubstitute: boolean;
  isOptional: boolean;
  // Fields filled manually by the user
  fullName: string;
  scholarNo: string;
  course: string;
  semester: string;
  phone: string;
  email: string;
  mandal: string;
  gender: string;
  // Validation
  errors: Record<string, string>;
  isComplete: boolean;
  isCollapsed: boolean;
}

export interface TeamRegistration {
  id: string;
  sportId: string;
  sportName: string;
  sportType: SportType;
  teamName: string;
  captainScholarNo: string;
  mandal: string;
  members: PlayerSlot[];
  timestamp: string;
}

export type FormStep = 1 | 2 | 3 | 4 | 5;

export const COURSES = [
  "BA English",
  "BA Hindi",
  "BA History",
  "BA Music",
  "BA Psychology",
  "BA Sanskrit",
  "BAJMC",
  "BBA",
  "BCA",
  "B.Ed",
  "BRS",
  "B.Sc IT",
  "B.Sc Maths",
  "B.Sc Yogic Science",
  "B.Voc",
  "MA English",
  "MA Hindi",
  "MA History",
  "MA Music",
  "MA Psychology",
  "MA Yoga Therapy (MA YT)",
  "MAJMC",
  "MBA",
  "MCA",
  "M.Sc HCYS",
  "PhD",
];

export const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export const MANDALS = [
  "Vashishta Mandal",
  "Vishwamitra Mandal",
  "Atrey Mandal",
  "Gautam Mandal",
  "Bharadwaj Mandal",
  "Jamdagni Mandal",
  "Kashyap Mandal",
];

export const COURSE_TO_MANDAL_MAP: Record<string, string> = {
  // Vashishta Mandal (Department of Computer Science)
  "MCA": "Vashishta Mandal",
  "BCA": "Vashishta Mandal",
  "B.Sc IT": "Vashishta Mandal",

  // Vishwamitra Mandal (B.Voc Animation, BBA - TTM, BA English)
  "BA English": "Vishwamitra Mandal",
  "MA English": "Vishwamitra Mandal",
  "BBA": "Vishwamitra Mandal",
  "MBA": "Vishwamitra Mandal",
  "B.Voc": "Vishwamitra Mandal",

  // Atrey Mandal (Mathematics, Journalism, Education, Philosophy/Religious Studies/Divinity)
  "B.Sc Maths": "Atrey Mandal",
  "BAJMC": "Atrey Mandal",
  "MAJMC": "Atrey Mandal",
  "B.Ed": "Atrey Mandal",

  // Gautam Mandal (Hindi, History & Indian Culture, Vedic Studies & Sanskrit, Indian Classical Music)
  "BA Hindi": "Gautam Mandal",
  "MA Hindi": "Gautam Mandal",
  "BA History": "Gautam Mandal",
  "MA History": "Gautam Mandal",
  "BA Sanskrit": "Gautam Mandal",
  "BA Music": "Gautam Mandal",
  "MA Music": "Gautam Mandal",

  // Bharadwaj Mandal (Psychology, Medicinal Plant Sciences, Rural Studies & Sustainability)
  "BA Psychology": "Bharadwaj Mandal",
  "MA Psychology": "Bharadwaj Mandal",
  "BRS": "Bharadwaj Mandal",

  // Jamdagni Mandal (All Undergraduate (UG) students of the Faculty of Yoga and Health)
  "B.Sc Yogic Science": "Jamdagni Mandal",

  // Kashyap Mandal (All Post-Graduate (PG) students of the Faculty of Yoga and Health)
  "MA Yoga Therapy (MA YT)": "Kashyap Mandal",
  "M.Sc HCYS": "Kashyap Mandal",
  "PhD": "Kashyap Mandal",
};

export function getMandalForCourse(course: string): string {
  if (!course) return "";
  if (COURSE_TO_MANDAL_MAP[course]) {
    return COURSE_TO_MANDAL_MAP[course];
  }
  const c = course.toLowerCase();
  if (c.includes("computer") || c.includes("mca") || c.includes("bca") || c.includes("it") || c.includes("data science")) {
    return "Vashishta Mandal";
  }
  if (c.includes("animation") || c.includes("voc") || c.includes("ttm") || c.includes("bba") || c.includes("mba") || c.includes("english")) {
    return "Vishwamitra Mandal";
  }
  if (c.includes("math") || c.includes("journalism") || c.includes("jmc") || c.includes("education") || c.includes("b.ed") || c.includes("philosophy") || c.includes("divinity") || c.includes("religious")) {
    return "Atrey Mandal";
  }
  if (c.includes("hindi") || c.includes("history") || c.includes("culture") || c.includes("sanskrit") || c.includes("vedic") || c.includes("music")) {
    return "Gautam Mandal";
  }
  if (c.includes("psychology") || c.includes("plant") || c.includes("medicinal") || c.includes("rural") || c.includes("sustainability") || c.includes("brs")) {
    return "Bharadwaj Mandal";
  }
  if (c.includes("b.sc yogic") || c.includes("b.a. yogic") || (c.includes("ug") && c.includes("yoga"))) {
    return "Jamdagni Mandal";
  }
  if (c.includes("hcys") || c.includes("yoga therapy") || c.includes("yt") || c.includes("m.sc yog") || c.includes("m.a. yog") || c.includes("phd") || (c.includes("pg") && c.includes("yoga"))) {
    return "Kashyap Mandal";
  }
  return "";
}
