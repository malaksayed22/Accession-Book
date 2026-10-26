"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { getUnitBarcodeValue } from "@/lib/unit-codes";

type PrintMode = "both" | "qr" | "barcode";

/**
 * The unit's label: a QR code that opens its profile and a Code 128 barcode of its name (what the
 * move form asks to be scanned). The label area is always black on white, whatever the theme, so
 * it scans from the screen and prints correctly. Printing hides the rest of the page (see the
 * `printing-unit-label` rules in the global print styles).
 */
export function UnitCodesPanel({
  unitId,
  unitName,
  unitTypeLabel,
  cultivarName,
  profileUrl,
  mother,
}: {
  unitId: number;
  unitName: string;
  /** Already translated, because the label is printed in the reader's language. */
  unitTypeLabel: string;
  cultivarName?: string | null;
  profileUrl: string;
  mother?: { id: number; name: string } | null;
}) {
  const t = useTranslations("units.panels.label");
  const printRef = useRef<HTMLDivElement>(null);
  const barcodeValue = getUnitBarcodeValue(unitId, unitName);

  function print(mode: PrintMode) {
    const area = printRef.current;
    if (!area) return;
    area.dataset.printMode = mode;
    document.body.classList.add("printing-unit-label");
    window.print();
    document.body.classList.remove("printing-unit-label");
    delete area.dataset.printMode;
  }

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="primary" icon={<Printer />} onClick={() => print("both")}>
              {t("print")}
            </Button>
            <Button variant="secondary" onClick={() => print("qr")}>
              {t("printQr")}
            </Button>
            <Button variant="secondary" onClick={() => print("barcode")}>
              {t("printBarcode")}
            </Button>
          </>
        }
      />
      <PanelBody>
        <div ref={printRef} className="unit-label-print-area grid gap-4 md:grid-cols-2">
          <figure className="unit-label-qr flex flex-col items-center rounded-lg border border-border bg-white p-5 text-black">
            <QRCode
              value={profileUrl}
              size={144}
              level="M"
              title={t("qrTitle", { name: unitName })}
            />
            <figcaption className="mt-3 flex flex-col items-center text-center">
              <span className="font-mono text-sm font-bold">{unitName}</span>
              <span className="text-xs">
                {unitTypeLabel}
                {cultivarName ? ` · ${cultivarName}` : ""}
              </span>
              {mother ? (
                <span className="unit-label-mother mt-1 text-xs">
                  {t("mother")}{" "}
                  <span className="font-mono">{getUnitBarcodeValue(mother.id, mother.name)}</span>
                </span>
              ) : null}
              <span className="mt-2 max-w-full text-[10px] break-all">{profileUrl}</span>
            </figcaption>
          </figure>

          <figure className="unit-label-barcode flex flex-col items-center justify-center rounded-lg border border-border bg-white p-5 text-black">
            <Barcode
              value={barcodeValue}
              format="CODE128"
              width={1.5}
              height={64}
              fontSize={14}
              margin={8}
              displayValue
              background="#ffffff"
              lineColor="#000000"
            />
            <figcaption className="mt-2 flex flex-col items-center text-center text-xs">
              <span className="font-medium">{t("barcodeCaption", { id: unitId })}</span>
            </figcaption>
          </figure>
        </div>
      </PanelBody>
    </Panel>
  );
}
