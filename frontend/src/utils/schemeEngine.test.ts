import { describe, it, expect } from 'vitest';
import { runMatchEngine, DISTRICT_GEO_LIMITS, getSchemeIncomeLimit } from './schemeEngine';
import { ProfilePayload } from '../types';

describe('runMatchEngine Welfare Policy Solver Unit Tests', () => {

  const baseAPProfile: ProfilePayload = {
    name: 'Ramu K',
    age: 45,
    gender: 'Male',
    income_annual: 90000,
    occupation: 'Farmer',
    land_acres: 2,
    bpl_card: 'White',
    district: 'Anantapur',
    state: 'Andhra Pradesh',
    caste_category: 'OBC',
    existing_schemes: [],
    family_members: 4,
    language: 'en',
    habitation: 'Rural'
  };

  const baseTSProfile: ProfilePayload = {
    name: 'Senthil Kumar',
    age: 48,
    gender: 'Male',
    income_annual: 95000,
    occupation: 'Farmer',
    land_acres: 3,
    bpl_card: 'Pink',
    district: 'Hyderabad',
    state: 'Telangana',
    caste_category: 'General',
    existing_schemes: [],
    family_members: 3,
    language: 'en',
    habitation: 'Urban'
  };

  it('correctly matches AP specific farmer schemes with valid credentials', () => {
    const results = runMatchEngine({
      ...baseAPProfile,
      income_annual: 80000
    });
    const pmKisan = results.find(s => s.scheme_id === 'pm-kisan-pradhan-mantri-kisan-samman-nidhi-001');
    expect(pmKisan).toBeDefined();
    expect(pmKisan?.source).toBe('Central');
  });

  it('correctly matches Telangana specific schemes', () => {
    const results = runMatchEngine(baseTSProfile);
    const rythuBharosa = results.find(s => s.scheme_id === 'telangana-rythu-bharosa-scheme-035');
    expect(rythuBharosa).toBeDefined();
    expect(rythuBharosa?.source).toBe('Telangana State');
  });

  describe('Tenant Farmer Edge Cases', () => {
    it('rejects a tenant farmer from PM-Kisan if they do not own land and do not have CCRC', () => {
      const tenantNoLandNoCCRC: ProfilePayload = {
        ...baseAPProfile,
        land_acres: 0,
        isTenantFarmer: true,
        hasCCRC: false
      };
      const results = runMatchEngine(tenantNoLandNoCCRC);
      const pmKisan = results.find(s => s.scheme_id === 'pm-kisan-pradhan-mantri-kisan-samman-nidhi-001');
      expect(pmKisan).toBeUndefined();
    });

    it('approves a tenant farmer with CCRC agreement card for PM-Kisan and land-required schemes', () => {
      const tenantWithCCRC: ProfilePayload = {
        ...baseAPProfile,
        land_acres: 0,
        isTenantFarmer: true,
        hasCCRC: true
      };
      const results = runMatchEngine(tenantWithCCRC);
      const pmKisan = results.find(s => s.scheme_id === 'pm-kisan-pradhan-mantri-kisan-samman-nidhi-001');
      expect(pmKisan).toBeDefined();
    });
  });

  describe('Geographic Offset Income Boundary Conditions', () => {
    it('calculates the correct income limit per district and habitation', () => {
      // Visakhapatnam (AP): Rural: 140000, Urban: 180000
      const limitRuralAmma = getSchemeIncomeLimit('thalliki-vandanam-scheme-mother-s-salute-052', 144000, 'Visakhapatnam', 'Rural');
      const limitUrbanAmma = getSchemeIncomeLimit('thalliki-vandanam-scheme-mother-s-salute-052', 144000, 'Visakhapatnam', 'Urban');
      
      expect(limitRuralAmma).toBe(140000);
      expect(limitUrbanAmma).toBe(180000);
    });

    it('filters out schemes when family income exceeds the geographic limits', () => {
      // Srikakulam has a low Rural baseline limit: Rural: 110000
      // Amma Vodi is pegged to habitation-category limit (110000)
      const overLimitProfile: ProfilePayload = {
        ...baseAPProfile,
        age: 35, // Mother's/guardian's age (since scheme has min_age 18 in database)
        district: 'Srikakulam',
        habitation: 'Rural',
        income_annual: 115000 // Above rural limit of 110000!
      };
      const results = runMatchEngine(overLimitProfile);
      const ammaVodi = results.find(s => s.scheme_id === 'thalliki-vandanam-scheme-mother-s-salute-052');
      expect(ammaVodi).toBeUndefined();
    });

    it('allows scheme matching when family income matches or is below the geographic limit', () => {
      const underLimitProfile: ProfilePayload = {
        ...baseAPProfile,
        age: 35, // Mother's/guardian's age (since scheme has min_age 18 in database)
        district: 'Srikakulam',
        habitation: 'Rural',
        income_annual: 105000 // Under rural limit of 110000
      };
      const results = runMatchEngine(underLimitProfile);
      const ammaVodi = results.find(s => s.scheme_id === 'thalliki-vandanam-scheme-mother-s-salute-052');
      expect(ammaVodi).toBeDefined();
    });
  });

  describe('Empty and Incomplete Profile Inputs', () => {
    it('returns empty array when profile is null or undefined (handles gracefully)', () => {
      const results = runMatchEngine(null as any);
      expect(results).toEqual([]);
    });

    it('handles default offsets for unknown districts gracefully without throwing', () => {
      const unknownDistProfile: ProfilePayload = {
        ...baseAPProfile,
        district: 'UnknownDistrict'
      };
      
      expect(() => runMatchEngine(unknownDistProfile)).not.toThrow();
      const results = runMatchEngine(unknownDistProfile);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
