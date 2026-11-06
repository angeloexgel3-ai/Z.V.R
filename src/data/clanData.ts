export interface ClanMember {
  id: string;
  tagname: string;
  category: 'leadership' | 'member';
  roleTitle: string;
  displayName: string;
  joinedDate?: string;
  status: 'active' | 'officer' | 'founder' | 'owner';
}

export const CLAN_PASSCODE = "ZVR09152025";
export const TIKTOK_GROUP_LINK = "https://tiktok.me/group/ZSyTCjAXC/";
export const CLAN_GROUP_LINK = "https://tiktok.me/group/ZSyTCjAXC/";
export const MESSENGER_GC_LINK = "https://tiktok.me/group/ZSyTCjAXC/";
export const CLAN_FB_PROFILE_LINK = "https://www.facebook.com/profile.php?id=61590405043340";
export const CLAN_LOGO_URL = "/assets/aistudio/received_1468183855209692_5a0a5784.jpeg";
export const CLAN_MOTTO = "Zeal • Victory • Respect";
export const CLAN_FOUNDED_DATE = "9-15-25";

export const INITIAL_MEMBERS: ClanMember[] = [
  // Owners & Admins
  {
    id: 'owner-mera',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑶𝒘𝒏𝒆𝒓•ᴍᴏᴍᴍʏ ᴍᴇʀᴀ',
    category: 'leadership',
    roleTitle: 'Owner',
    displayName: 'Mommy Mera',
    status: 'owner',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'co-owner-hanz',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑪𝒐-𝒐𝒘𝒏𝒆𝒓•ʜᴀɴᴢ',
    category: 'leadership',
    roleTitle: 'Co-Owner',
    displayName: 'Hanz',
    status: 'owner',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'founder-jay',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑭𝒐𝒖𝒏𝒅𝒆𝒓•ᴊᴀʏ',
    category: 'leadership',
    roleTitle: 'Founder',
    displayName: 'Jay',
    status: 'founder',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'h-fdr-erich',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑯-𝒇𝒅𝒓•ᴇʀɪᴄʜ',
    category: 'leadership',
    roleTitle: 'Head Founder',
    displayName: 'Erich',
    status: 'founder',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'c-fdr-ejay',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑪-𝒇𝒅𝒓•ᴇᴊᴀʏ',
    category: 'leadership',
    roleTitle: 'Co-Founder',
    displayName: 'Ejay',
    status: 'founder',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'h-admn-kim',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑯-𝒂𝒅𝒎𝒏•ᴋɪᴍ',
    category: 'leadership',
    roleTitle: 'Head Admin',
    displayName: 'Kim',
    status: 'officer',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'admin-kill',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑨𝒅𝒎𝒊𝒏•ᴋɪʟʟ',
    category: 'leadership',
    roleTitle: 'Admin',
    displayName: 'Kill',
    status: 'officer',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'admin-jenard',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑨𝒅𝒎𝒊𝒏•ᴊᴇɴᴀʀᴅ',
    category: 'leadership',
    roleTitle: 'Admin',
    displayName: 'Jenard',
    status: 'officer',
    joinedDate: 'Sept 2025'
  },
  {
    id: 's-admn-joms',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑺-𝑨𝒅𝒎𝒏•ᴊᴏᴍs',
    category: 'leadership',
    roleTitle: 'Sub-Admin',
    displayName: 'Joms',
    status: 'officer',
    joinedDate: 'Sept 2025'
  },

  // Members
  {
    id: 'mbr-wena',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ᴡᴇɴᴀ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'Wena',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-jo',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ᴊᴏ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'Jo',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-rang',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ʀᴀɴɢ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'Rang',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-shang',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•sʜᴀɴɢ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'Shang',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-lj',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ʟᴊ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'LJ',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-jm',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ᴊᴍ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'JM',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-jay',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ᴊᴀʏ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'Jay',
    status: 'active',
    joinedDate: 'Sept 2025'
  },
  {
    id: 'mbr-albert',
    tagname: 'ツ𝐙‧𝐕‧𝐑 ᥫ᭡𝑴𝒃𝒓•ᴀʟʙᴇʀᴛ',
    category: 'member',
    roleTitle: 'Member',
    displayName: 'Albert',
    status: 'active',
    joinedDate: 'Sept 2025'
  }
];

export const CLAN_RULES = [
  {
    title: 'Respeto sa Bawat Miyembro',
    desc: 'Pantay-pantay ang pakikitungo. Bawal ang panlalait, pang-aaway, o bastos na pananalita sa GC at laro.'
  },
  {
    title: 'Gamitin ang Opisyal na Z.V.R Tagname',
    desc: 'Lahat ng opisyal na miyembro ay inaasahang gamitin ang opisyal na format sa gaming profile at Messenger nickname.'
  },
  {
    title: 'Aktibo sa Group Chat at Tambayan',
    desc: 'Makipag-participate sa mga clan games, kwentuhan, at announcements upang mapanatili ang aktibong estado.'
  },
  {
    title: 'Ingatan ang Clan Passcode',
    desc: 'Huwag ipapamigay ang password ng clan sa hindi lehitimong miyembro upang maiwasan ang mga troll o pasaway.'
  }
];
