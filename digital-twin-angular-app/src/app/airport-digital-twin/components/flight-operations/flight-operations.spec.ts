import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightOperations } from './flight-operations';

describe('FlightOperations', () => {
  let component: FlightOperations;
  let fixture: ComponentFixture<FlightOperations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FlightOperations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlightOperations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
