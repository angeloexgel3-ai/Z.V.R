export interface ClanMember {
  id: string;
  tagname: string;
  category: 'leadership' | 'member';
  roleTitle: string;
  displayName: string;
  joinedDate?: string;
  status: 'active' | 'officer' | 'founder' | 'owner';
}

export interface RegisteredAccount {
  id: string;
  name: string;
  tagname: string;
  password?: string;
  roleTitle: string;
  category: 'leadership' | 'member';
  registeredAt: string;
}

export function formatTagnameUppercase(tagname: string): string {
  if (!tagname) return '';
  const bulletIdx = tagname.lastIndexOf('•');
  if (bulletIdx !== -1) {
    const prefix = tagname.slice(0, bulletIdx + 1);
    const namePart = tagname.slice(bulletIdx + 1);
    return prefix + namePart.toUpperCase();
  }
  return tagname.toUpperCase();
}

export function accountToClanMember(acc: RegisteredAccount): ClanMember {
  return {
    id: acc.id,
    tagname: formatTagnameUppercase(acc.tagname),
    displayName: acc.name.toUpperCase(),
    roleTitle: acc.roleTitle,
    category: acc.category,
    status: acc.category === 'leadership' ? 'officer' : 'active',
    joinedDate: acc.registeredAt,
  };
}

export function isOfficialRole(roleTitle?: string): boolean {
  if (!roleTitle) return false;
  const officialRoles = ['𝑶𝒘𝒏𝒆𝒓', '𝑪𝒐-𝒐𝒘𝒏𝒆𝒓', '𝑭𝒅𝒓', '𝑯-𝒇𝒅𝒓', '𝑪𝒐-𝒇𝒅𝒓', '𝑯-𝒂𝒅𝒎𝒊𝒏', '𝑪-𝒂𝒅𝒎𝒊𝒏', '𝑺-𝒂𝒅𝒎𝒊𝒏', '𝑨𝒅𝒎𝒊𝒏', 'Owner', 'Co-Owner', 'Founder', 'Admin'];
  return officialRoles.some((r) => roleTitle.includes(r));
}

/**
 * Computes the attendance cycle date key (YYYY-MM-DD) in Philippines Time (UTC+8)
 * that resets automatically every day at 3:00 AM.
 * Between 12:00 AM and 2:59 AM PH time, it still belongs to the previous day's cycle.
 * At 3:00 AM PH time, it switches to the new day's date key, resetting Present/Absent.
 */
export function getAttendanceDateKey(now: Date = new Date()): string {
  const shiftedMs = now.getTime() + (8 - 3) * 60 * 60 * 1000;
  const shifted = new Date(shiftedMs);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CLAN_PASSCODE = "ZVR09152025";
export const ATTENDANCE_PASSCODE = "2025ZVR";
export const CLAN_FB_PROFILE_LINK = "https://www.facebook.com/profile.php?id=61590405043340";
export const CLAN_LOGO_URL = "/assets/aistudio/received_1468183855209692_5a0a5784.jpeg";
export const CLAN_MOTTO = "Zeal • Victory • Respect";
export const CLAN_FOUNDED_DATE = "9-15-25";

// Lahat ng opisyal at miyembro ay nagmumula sa Create Tagname. Bawal ang hindi rehistrado.
export const INITIAL_MEMBERS: ClanMember[] = [];

export const CLAN_RULES = [
  {
    titleTl: 'Respeto at Dangal sa Bawat Miyembro',
    descTl: 'Pantay-pantay ang pagturing sa bawat isa. Mahigpit na ipinagbabawal ang panlalait, pang-aaway, o bastos na pananalita sa GC at sa anumang platform.',
    titleEn: 'Respect and Honor for Every Member',
    descEn: 'Everyone is treated equally. Insults, harassment, or rude behavior in the GC or any platform are strictly prohibited.'
  },
  {
    titleTl: 'Kawanggawa at Bayanihan (Charities & Outreach)',
    descTl: 'Ang Z.V.R ay isang pamilyang may puso na may mga adbokasiya at charity outreach para sa komunidad at mga nangangailangan. Isinusulong natin ang tunay na pagtulong at malasakit sa kapwa.',
    titleEn: 'Charity & Community Outreach',
    descEn: 'Z.V.R is a compassionate family dedicated to charity outreach and helping those in need within our community.'
  },
  {
    titleTl: 'Pagsunod sa VISION at MISSION ng Z.V.R',
    descTl: 'Isulong ang dangal, pagkakaisa, at tunay na pagtulong sa kapwa. Maging aktibo sa mga charity drives, community projects, at mga pagtitipon ng samahan.',
    titleEn: 'Uphold the Z.V.R VISION & MISSION',
    descEn: 'Promote honor, unity, and genuine service to others. Stay active in charity drives, community projects, and group gatherings.'
  },
  {
    titleTl: 'Gamitin ang Opisyal na Z.V.R Tagname',
    descTl: 'Lahat ng opisyal na miyembro ay inaasahang gamitin ang opisyal na format sa profile at social media bilang tanda ng ating pamilya at dangal.',
    titleEn: 'Wear the Official Z.V.R Tagname',
    descEn: 'All verified members are expected to display the official tagname format on their profile and social media as a sign of unity and honor.'
  },
  {
    titleTl: 'Ingatan ang Passcode at Dangal ng Portal',
    descTl: 'Huwag ipamigay ang pribadong passcode ng Z.V.R sa hindi opisyal na miyembro upang maiwasan ang mga pasaway, bastos, at trolls na maaaring ma-suspend o ma-evict.',
    titleEn: 'Protect the Private Portal Passcode',
    descEn: 'Never share the private Z.V.R verification passcode with outsiders to keep the room safe from trolls and violators.'
  }
];
