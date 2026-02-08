import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AirportDashboard } from './airport-dashboard';

describe('AirportDashboard', () => {
  let component: AirportDashboard;
  let fixture: ComponentFixture<AirportDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AirportDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AirportDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
