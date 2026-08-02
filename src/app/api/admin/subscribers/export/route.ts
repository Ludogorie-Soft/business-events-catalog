import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  excelHeaders,
  getAdminSubscriptions,
  parseAdminSubscriberFilters,
  toAdminSubscriberRow,
} from "@/lib/admin-subscribers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseAdminSubscriberFilters(
    Object.fromEntries(url.searchParams.entries())
  );

  const subscriptions = await getAdminSubscriptions(filters);
  const rows = subscriptions.map(toAdminSubscriberRow);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Бизнес Събития България";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Абонати", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = excelHeaders.map(({ key, header }) => ({
    key,
    header,
    width: Math.max(header.length + 2, 16),
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };

  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `abonati-${dateStamp}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
