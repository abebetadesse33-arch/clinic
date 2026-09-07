import {
  PHARMACY_MASTER_CATALOGUE,
  PharmacyCatalogueItem,
} from "./pharmacy-master-catalogue";
import {
  LABORATORY_PROTOCOLS_CATALOGUE,
  LaboratoryProtocolItem,
} from "./laboratory-protocols-catalogue";

export * from "./pharmacy-master-catalogue";
export * from "./laboratory-protocols-catalogue";

export interface CatalogueSummary {
  totalPharmacyItems: number;
  totalMedications: number;
  totalSupplies: number;
  totalControlledDrugs: number;
  totalRxDrugs: number;
  totalOtcDrugs: number;
  totalLabProtocols: number;
  criticalValueProtocols: number;
  pharmacySectionsCount: number;
}

export function getCatalogueSummary(): CatalogueSummary {
  const supplies = PHARMACY_MASTER_CATALOGUE.filter((i) => i.sectionNumber === 18);
  const medications = PHARMACY_MASTER_CATALOGUE.filter((i) => i.sectionNumber !== 18);
  const controlled = PHARMACY_MASTER_CATALOGUE.filter((i) => i.isControlled);
  const rx = PHARMACY_MASTER_CATALOGUE.filter((i) => i.rxOtc === "Rx");
  const otc = PHARMACY_MASTER_CATALOGUE.filter((i) => i.rxOtc === "OTC");
  const criticalLabs = LABORATORY_PROTOCOLS_CATALOGUE.filter((l) => Boolean(l.criticalValues));

  return {
    totalPharmacyItems: PHARMACY_MASTER_CATALOGUE.length, // 376
    totalMedications: medications.length, // 276
    totalSupplies: supplies.length, // 100
    totalControlledDrugs: controlled.length,
    totalRxDrugs: rx.length,
    totalOtcDrugs: otc.length,
    totalLabProtocols: LABORATORY_PROTOCOLS_CATALOGUE.length, // 79
    criticalValueProtocols: criticalLabs.length,
    pharmacySectionsCount: 18,
  };
}

export function searchPharmacyCatalogue(
  query: string,
  options?: {
    sectionNumber?: number;
    category?: string;
    isControlled?: boolean;
    rxOtc?: "Rx" | "OTC";
  }
): PharmacyCatalogueItem[] {
  const q = query.toLowerCase().trim();

  return PHARMACY_MASTER_CATALOGUE.filter((item) => {
    if (options?.sectionNumber && item.sectionNumber !== options.sectionNumber) {
      return false;
    }
    if (options?.category && item.category !== options.category) {
      return false;
    }
    if (options?.isControlled !== undefined && item.isControlled !== options.isControlled) {
      return false;
    }
    if (options?.rxOtc && item.rxOtc !== options.rxOtc) {
      return false;
    }
    if (!q) return true;

    return (
      item.drugCode.toLowerCase().includes(q) ||
      item.genericName.toLowerCase().includes(q) ||
      item.brandName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.form.toLowerCase().includes(q) ||
      item.strength.toLowerCase().includes(q) ||
      item.route.toLowerCase().includes(q) ||
      (item.atcCode && item.atcCode.toLowerCase().includes(q))
    );
  });
}

export function searchLaboratoryProtocols(
  query: string,
  options?: {
    category?: string;
    specimen?: string;
    hasCriticalValuesOnly?: boolean;
  }
): LaboratoryProtocolItem[] {
  const q = query.toLowerCase().trim();

  return LABORATORY_PROTOCOLS_CATALOGUE.filter((item) => {
    if (options?.category && item.category !== options.category) {
      return false;
    }
    if (
      options?.specimen &&
      !item.specimen.toLowerCase().includes(options.specimen.toLowerCase())
    ) {
      return false;
    }
    if (options?.hasCriticalValuesOnly && !item.criticalValues) {
      return false;
    }
    if (!q) return true;

    return (
      item.testCode.toLowerCase().includes(q) ||
      item.testName.toLowerCase().includes(q) ||
      item.specimen.toLowerCase().includes(q) ||
      item.tubeContainer.toLowerCase().includes(q) ||
      item.methodology.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.referenceRangeAdult.toLowerCase().includes(q) ||
      (item.criticalValues && item.criticalValues.toLowerCase().includes(q))
    );
  });
}
