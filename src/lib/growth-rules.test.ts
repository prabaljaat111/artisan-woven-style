import { describe,it,expect } from 'vitest';
import { scheduledPrice,saleIsActive,zoneShipping,pointBalance,recoveryStage } from './growth-rules';
describe('Scheduled sales',()=>{
  const p={price:1500,original_price:2000,sale_starts_at:'2026-10-30T00:00:00Z',sale_ends_at:'2026-10-31T00:00:00Z'};
  it('keeps regular price before the sale',()=>expect(scheduledPrice(p,Date.parse('2026-10-29T12:00:00Z'))).toBe(2000));
  it('activates the sale at its start',()=>expect(scheduledPrice(p,Date.parse(p.sale_starts_at))).toBe(1500));
  it('ends the sale at its end',()=>expect(scheduledPrice(p,Date.parse(p.sale_ends_at))).toBe(2000));
  it('keeps variant sales inactive before start even when parent prices match',()=>{const unchangedParent={...p,price:2000};expect(saleIsActive(unchangedParent,Date.parse('2026-10-29T12:00:00Z'))).toBe(false);});
  it('activates variation sale prices at the scheduled start',()=>expect(saleIsActive(p,Date.parse(p.sale_starts_at))).toBe(true));
});
describe('Shipping zones',()=>{
  const z={states:['Uttar Pradesh'],pincode_prefixes:['226'],flat_rate:50,free_above:2000,priority:1,active:true,courier:'Preferred'};
  it('matches both state and postal prefix',()=>expect(zoneShipping([z],'Uttar Pradesh','226003',500)?.rate).toBe(50));
  it('rejects unmatched postal areas',()=>expect(zoneShipping([z],'Uttar Pradesh','110001',500)).toBeNull());
  it('applies the zone free-shipping threshold',()=>expect(zoneShipping([z],'Uttar Pradesh','226003',2000)?.rate).toBe(0));
});
describe('Customer programs',()=>{
  it('counts credits and debits',()=>expect(pointBalance([{points:100},{points:-40}])).toBe(60));
  it('waits one hour before recovery',()=>expect(recoveryStage('2026-10-29T00:00:00Z',Date.parse('2026-10-29T00:59:00Z'))).toBeNull());
  it('selects the 72 hour recovery stage',()=>expect(recoveryStage('2026-10-26T00:00:00Z',Date.parse('2026-10-29T00:00:00Z'))).toBe(72));
});