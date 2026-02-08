import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GateAssignmentDialog } from './gate-assignment-dialog';

describe('GateAssignmentDialog', () => {
  let component: GateAssignmentDialog;
  let fixture: ComponentFixture<GateAssignmentDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GateAssignmentDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GateAssignmentDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
