import { useMemo } from 'react';
import { COUNTRY_PREFIXES } from '@/lib/clientNumberUtils';
import { DbClient } from '@/hooks/useClients';
import { Tables } from '@/integrations/supabase/types';

export interface RawClientCertification extends Tables<'client_certifications'> {
  clients: Pick<Tables<'clients'>, 'name' | 'client_number'> | null;
  certifications: Pick<Tables<'certifications'>, 'name'> | null;
}

export interface CertificationInfo {
  id: string;
  certificationId: string;
  certificationName: string;
  certificateNumber: string | null;
  validUntil: string | null;
  status: string | null;
}

export interface CertificationRow {
  clientId: string;
  clientName: string;
  clientNumber: string | null;
  certifications: CertificationInfo[];
  earliestValidUntil: string | null;
  primaryCertificationId: string;
}

export interface ClientWithCerts {
  client: DbClient;
  certifications: CertificationRow[];
}

export interface CompanyGroup {
  id: string;
  name: string;
  isGroupOnly: boolean;
  headerClient: DbClient;
  children: ClientWithCerts[];
}

export interface CountryGroup {
  country: string;
  companyGroups: CompanyGroup[];
}

/**
 * Build a map of certification rows grouped by certificate_number per client.
 */
export const useCertificationsByClient = (allCertifications: RawClientCertification[]) => {
  return useMemo(() => {
    const map: Record<string, CertificationRow[]> = {};
    const rawCertsByClient: Record<string, CertificationInfo[]> = {};
    const clientInfoMap: Record<string, { name: string; number: string | null }> = {};

    allCertifications.forEach((cc) => {
      if (!cc.clients || !cc.certifications) return;
      const clientId = cc.client_id;

      if (!rawCertsByClient[clientId]) rawCertsByClient[clientId] = [];
      if (!clientInfoMap[clientId]) {
        clientInfoMap[clientId] = { name: cc.clients.name, number: cc.clients.client_number };
      }

      rawCertsByClient[clientId].push({
        id: cc.id,
        certificationId: cc.certification_id,
        certificationName: cc.certifications.name,
        certificateNumber: cc.certificate_number,
        validUntil: cc.valid_until,
        status: cc.status,
      });
    });

    Object.entries(rawCertsByClient).forEach(([clientId, certs]) => {
      const grouped: Record<string, CertificationInfo[]> = {};
      const noNumber: CertificationInfo[] = [];

      certs.forEach(cert => {
        if (cert.certificateNumber) {
          if (!grouped[cert.certificateNumber]) grouped[cert.certificateNumber] = [];
          grouped[cert.certificateNumber].push(cert);
        } else {
          noNumber.push(cert);
        }
      });

      map[clientId] = [];

      Object.entries(grouped).forEach(([, groupedCerts]) => {
        const earliestDate = groupedCerts
          .map(c => c.validUntil)
          .filter(Boolean)
          .sort()[0] || null;

        map[clientId].push({
          clientId,
          clientName: clientInfoMap[clientId].name,
          clientNumber: clientInfoMap[clientId].number,
          certifications: groupedCerts,
          earliestValidUntil: earliestDate,
          primaryCertificationId: groupedCerts[0].id,
        });
      });

      noNumber.forEach(cert => {
        map[clientId].push({
          clientId,
          clientName: clientInfoMap[clientId].name,
          clientNumber: clientInfoMap[clientId].number,
          certifications: [cert],
          earliestValidUntil: cert.validUntil,
          primaryCertificationId: cert.id,
        });
      });
    });

    return map;
  }, [allCertifications]);
};

/**
 * Group filtered clients by country → company group hierarchy.
 */
export const useCountryGroups = (
  filteredClients: DbClient[],
  certificationsByClient: Record<string, CertificationRow[]>
): CountryGroup[] => {
  return useMemo(() => {
    const groups: CompanyGroup[] = [];
    const parentClients = filteredClients.filter(c => !c.parent_client_id);
    const childClients = filteredClients.filter(c => c.parent_client_id);

    const childrenByParent: Record<string, DbClient[]> = {};
    childClients.forEach(child => {
      const parentId = child.parent_client_id!;
      if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
      childrenByParent[parentId].push(child);
    });

    parentClients.forEach(parent => {
      const children = childrenByParent[parent.id] || [];
      const parentCerts = certificationsByClient[parent.id] || [];
      const isExplicitGroup = parent.client_number === null;
      const isCompanyGroup = children.length > 0 || isExplicitGroup;

      if (children.length > 0) {
        groups.push({
          id: parent.id,
          name: parent.name,
          isGroupOnly: true,
          headerClient: parent,
          children: children.map(child => ({
            client: child,
            certifications: certificationsByClient[child.id] || [],
          })),
        });
      } else if (isCompanyGroup) {
        groups.push({
          id: parent.id,
          name: parent.name,
          isGroupOnly: true,
          headerClient: parent,
          children: [],
        });
      } else {
        groups.push({
          id: parent.id,
          name: parent.name,
          isGroupOnly: false,
          headerClient: parent,
          children: [{ client: parent, certifications: parentCerts }],
        });
      }
    });

    // Orphaned children
    childClients.forEach(child => {
      const parentId = child.parent_client_id!;
      if (!parentClients.some(p => p.id === parentId)) {
        groups.push({
          id: child.id,
          name: child.name,
          isGroupOnly: false,
          headerClient: child,
          children: [{ client: child, certifications: certificationsByClient[child.id] || [] }],
        });
      }
    });

    // Group by country
    const byCountry: Record<string, CompanyGroup[]> = {};
    groups.forEach(group => {
      const country = group.headerClient.country || 'Unbekannt';
      if (!byCountry[country]) byCountry[country] = [];
      byCountry[country].push(group);
    });

    Object.values(byCountry).forEach(cg => cg.sort((a, b) => a.name.localeCompare(b.name)));

    const countryList: CountryGroup[] = Object.entries(byCountry).map(([country, companyGroups]) => ({
      country,
      companyGroups,
    }));

    const prefixOrder = Object.keys(COUNTRY_PREFIXES);
    countryList.sort((a, b) => {
      const idxA = prefixOrder.indexOf(a.country);
      const idxB = prefixOrder.indexOf(b.country);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.country.localeCompare(b.country);
    });

    return countryList;
  }, [filteredClients, certificationsByClient]);
};
