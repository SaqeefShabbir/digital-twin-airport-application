import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkGateOperationDialog } from './bulk-gate-operation-dialog';

describe('BulkGateOperationDialog', () => {
  let component: BulkGateOperationDialog;
  let fixture: ComponentFixture<BulkGateOperationDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BulkGateOperationDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkGateOperationDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
