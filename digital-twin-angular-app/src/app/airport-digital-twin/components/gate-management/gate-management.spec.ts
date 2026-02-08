import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GateManagement } from './gate-management';

describe('GateManagement', () => {
  let component: GateManagement;
  let fixture: ComponentFixture<GateManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GateManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GateManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
