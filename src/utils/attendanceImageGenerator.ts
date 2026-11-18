import { ClanMember, CLAN_LOGO_URL, formatTagnameUppercase } from '../data/clanData';

export interface AttendanceRowItem {
  member: ClanMember;
  isPresent: boolean;
  timeCheckedIn?: string;
}

export interface AttendancePictureInput {
  dateKey: string;
  formattedDate: string;
  isOpenNow: boolean;
  officials: AttendanceRowItem[];
  members: AttendanceRowItem[];
  lang: 'tl' | 'en';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(clipped + '…').width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

function loadLogoImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 2500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

export async function generateAttendancePicture(
  input: AttendancePictureInput
): Promise<{ dataUrl: string; blob: Blob }> {
  const width = 1080;
  const padX = 48;
  const contentW = width - padX * 2;
  const rowH = 68;
  const rowGap = 10;

  const officialsRows = Math.max(1, input.officials.length);
  const membersRows = Math.max(1, input.members.length);

  const headerHeight = 250;
  const sectionHeaderH = 64;
  const sectionGap = 36;
  const footerH = 86;

  const officialsBlockH = sectionHeaderH + officialsRows * (rowH + rowGap);
  const membersBlockH = sectionHeaderH + membersRows * (rowH + rowGap);
  const totalHeight = headerHeight + officialsBlockH + sectionGap + membersBlockH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#070412');
  bgGrad.addColorStop(0.5, '#0d0720');
  bgGrad.addColorStop(1, '#06030e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  // Top neon accent line
  const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
  accentGrad.addColorStop(0, '#a855f7');
  accentGrad.addColorStop(0.5, '#ec4899');
  accentGrad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, width, 6);

  // Header panel
  drawRoundedRect(ctx, padX, 28, contentW, 194, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Logo avatar
  const logoImg = await loadLogoImage(CLAN_LOGO_URL);
  const logoX = padX + 24;
  const logoY = 50;
  const logoSize = 78;
  ctx.save();
  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 18);
  ctx.clip();
  if (logoImg) {
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
  } else {
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z.V.R', logoX + logoSize / 2, logoY + logoSize / 2);
  }
  ctx.restore();
  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 18);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title & Date
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 30px Outfit, sans-serif';
  ctx.fillText('Z.V.R ATTENDANCE RECORDS', logoX + logoSize + 20, 52);

  ctx.fillStyle = '#d8b4fe';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${input.formattedDate}  ·  ${input.dateKey}`, logoX + logoSize + 20, 92);

  // Status badge on header right
  const statusText = input.isOpenNow
    ? input.lang === 'tl'
      ? 'BUKAS NGAYON'
      : 'OPEN NOW'
    : input.lang === 'tl'
    ? 'SARADO NA · FINAL RECORD'
    : 'CLOSED · FINAL RECORD';
  ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
  const statusW = ctx.measureText(statusText).width + 32;
  const statusX = padX + contentW - statusW - 24;
  drawRoundedRect(ctx, statusX, 52, statusW, 34, 17);
  ctx.fillStyle = input.isOpenNow ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.24)';
  ctx.fill();
  ctx.strokeStyle = input.isOpenNow ? 'rgba(52, 211, 153, 0.65)' : 'rgba(248, 113, 113, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = input.isOpenNow ? '#6ee7b7' : '#fca5a5';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusText, statusX + 16, 69);

  // Summary boxes inside header bottom
  const totalRegistered = input.officials.length + input.members.length;
  const totalPresent =
    input.officials.filter((r) => r.isPresent).length +
    input.members.filter((r) => r.isPresent).length;
  const totalAbsent = totalRegistered - totalPresent;

  const boxGap = 14;
  const boxW = (contentW - 48 - boxGap * 2) / 3;
  const boxY = 146;
  const boxH = 58;

  const summaryItems = [
    {
      label: 'PRESENT',
      value: String(totalPresent),
      bg: 'rgba(16, 185, 129, 0.16)',
      border: 'rgba(52, 211, 153, 0.45)',
      valColor: '#6ee7b7',
    },
    {
      label: 'ABSENT',
      value: String(totalAbsent),
      bg: 'rgba(239, 68, 68, 0.16)',
      border: 'rgba(248, 113, 113, 0.45)',
      valColor: '#fca5a5',
    },
    {
      label: 'REGISTERED',
      value: String(totalRegistered),
      bg: 'rgba(168, 85, 247, 0.16)',
      border: 'rgba(192, 132, 252, 0.45)',
      valColor: '#e9d5ff',
    },
  ];

  summaryItems.forEach((item, idx) => {
    const bx = padX + 24 + idx * (boxW + boxGap);
    drawRoundedRect(ctx, bx, boxY, boxW, boxH, 14);
    ctx.fillStyle = item.bg;
    ctx.fill();
    ctx.strokeStyle = item.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.label, bx + 18, boxY + boxH / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = item.valColor;
    ctx.font = '900 24px Outfit, sans-serif';
    ctx.fillText(item.value, bx + boxW - 18, boxY + boxH / 2);
  });

  // Helper to draw a Form section
  const drawFormSection = (
    startY: number,
    title: string,
    accentColor: string,
    rows: AttendanceRowItem[],
    emptyLabel: string
  ): number => {
    const presentCount = rows.filter((r) => r.isPresent).length;
    const absentCount = rows.length - presentCount;

    // Section title bar
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accentColor;
    ctx.font = '900 20px Outfit, sans-serif';
    ctx.fillText(title, padX + 4, startY + 26);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Present: ${presentCount}   ·   Absent: ${absentCount}   ·   Total: ${rows.length}`,
      padX + contentW - 4,
      startY + 26
    );

    // Subtle divider
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(padX, startY + 50, contentW, 1);

    let y = startY + sectionHeaderH;

    if (rows.length === 0) {
      drawRoundedRect(ctx, padX, y, contentW, rowH, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(emptyLabel, padX + contentW / 2, y + rowH / 2);
      return y + rowH + rowGap;
    }

    rows.forEach((row, idx) => {
      drawRoundedRect(ctx, padX, y, contentW, rowH, 16);
      ctx.fillStyle = row.isPresent
        ? 'rgba(16, 185, 129, 0.11)'
        : 'rgba(239, 68, 68, 0.09)';
      ctx.fill();
      ctx.strokeStyle = row.isPresent
        ? 'rgba(52, 211, 153, 0.35)'
        : 'rgba(248, 113, 113, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Index number + status dot
      const dotX = padX + 26;
      const dotY = y + rowH / 2;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
      ctx.fillStyle = row.isPresent ? '#10b981' : '#ef4444';
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 14px monospace';
      ctx.fillText(`${String(idx + 1).padStart(2, '0')}.`, padX + 48, dotY);

      // Name + Role + Tagname
      const textStartX = padX + 86;
      const rightAreaW = 190;
      const maxNameW = contentW - 86 - rightAreaW - 16;

      const nameAndRole = `${row.member.displayName.toUpperCase()}  (${row.member.roleTitle})`;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(truncateText(ctx, nameAndRole, maxNameW), textStartX, y + 13);

      const tagLine = formatTagnameUppercase(row.member.tagname);
      ctx.fillStyle = '#d8b4fe';
      ctx.font = '600 13px monospace';
      ctx.fillText(truncateText(ctx, tagLine, maxNameW), textStartX, y + 38);

      // Right status badge + time
      const badgeW = 136;
      const badgeH = 30;
      const badgeX = padX + contentW - badgeW - 18;
      const badgeY = row.timeCheckedIn && row.isPresent ? y + 10 : y + (rowH - badgeH) / 2;

      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
      ctx.fillStyle = row.isPresent ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fill();
      ctx.strokeStyle = row.isPresent ? 'rgba(52, 211, 153, 0.5)' : 'rgba(248, 113, 113, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = row.isPresent ? '#6ee7b7' : '#fca5a5';
      ctx.font = '800 13px monospace';
      ctx.fillText(row.isPresent ? 'PRESENT' : 'ABSENT', badgeX + badgeW / 2, badgeY + badgeH / 2);

      if (row.isPresent && row.timeCheckedIn) {
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '600 12px monospace';
        ctx.fillText(row.timeCheckedIn, badgeX + badgeW / 2, y + 52);
      }

      y += rowH + rowGap;
    });

    return y;
  };

  let nextY = headerHeight;
  nextY = drawFormSection(
    nextY,
    'FORM 1 · OFFICIALS ATTENDANCE RECORD',
    '#fcd34d',
    input.officials,
    input.lang === 'tl' ? 'Walang nakarehistrong Official' : 'No registered Officials'
  );

  nextY += sectionGap;
  nextY = drawFormSection(
    nextY,
    'FORM 2 · MEMBERS ATTENDANCE RECORD',
    '#a5b4fc',
    input.members,
    input.lang === 'tl' ? 'Walang nakarehistrong Miyembro' : 'No registered Members'
  );

  // Footer
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Z.V.R · Zeal · Victory · Respect  |  Official Attendance Snapshot',
    padX,
    totalHeight - 36
  );

  ctx.textAlign = 'right';
  const generatedTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(
    input.lang === 'tl' ? `Nabuo: ${generatedTime}` : `Generated: ${generatedTime}`,
    padX + contentW,
    totalHeight - 36
  );

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to export attendance image blob'));
    }, 'image/png');
  });

  return { dataUrl, blob };
}
